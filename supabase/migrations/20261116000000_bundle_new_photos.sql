-- New photos reach phones in bundles: one message per event every 3 seconds, listing every photo added
-- since the last one, instead of one message per photo to every phone. 100 photos in 5 seconds to
-- 100 phones goes from about 10,000 messages to about 300.
-- Pinning, moving to the private vault and deleting are still sent straight away.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Photos waiting to be announced
CREATE TABLE IF NOT EXISTS public.feed_outbox (
  id bigserial PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feed_outbox_event_idx ON public.feed_outbox (event_id);
ALTER TABLE public.feed_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feed_outbox FROM anon, authenticated;

-- Same as before, except a new or un-hidden photo is queued instead of sent on its own
CREATE OR REPLACE FUNCTION public.notify_post_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic text := 'event-feed-' || COALESCE(NEW.event_id, OLD.event_id);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT NEW.is_private THEN
      INSERT INTO feed_outbox (event_id, post_id) VALUES (NEW.event_id, NEW.id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT OLD.is_private THEN
      PERFORM realtime.send(jsonb_build_object('id', OLD.id), 'post-removed', v_topic, false);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.is_private AND NOT OLD.is_private THEN
    PERFORM realtime.send(jsonb_build_object('id', NEW.id), 'post-removed', v_topic, false);
  ELSIF OLD.is_private AND NOT NEW.is_private THEN
    INSERT INTO feed_outbox (event_id, post_id) VALUES (NEW.event_id, NEW.id);
  ELSIF NOT NEW.is_private THEN
    PERFORM realtime.send(post_public_json(NEW), 'post-changed', v_topic, false);
  END IF;
  RETURN NEW;
END;
$$;

-- Sends each event's waiting photos as one message. Photos deleted or made private in the meantime are skipped.
CREATE OR REPLACE FUNCTION public.flush_feed_outbox()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    WITH taken AS (
      DELETE FROM feed_outbox RETURNING event_id, post_id
    )
    SELECT t.event_id, jsonb_agg(post_public_json(p) ORDER BY p.created_at) AS posts
    FROM (SELECT DISTINCT event_id, post_id FROM taken) t
    JOIN posts p ON p.id = t.post_id AND NOT p.is_private
    GROUP BY t.event_id
  LOOP
    PERFORM realtime.send(jsonb_build_object('posts', r.posts), 'posts-added', 'event-feed-' || r.event_id, false);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.flush_feed_outbox() FROM PUBLIC, anon, authenticated;

-- Every 3 seconds; does nothing when no photos are waiting
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('flush-feed-outbox', 'trim-cron-history');
SELECT cron.schedule('flush-feed-outbox', '3 seconds', 'SELECT public.flush_feed_outbox()');
-- The scheduler logs every run; keep only the last day
SELECT cron.schedule('trim-cron-history', '17 3 * * *', $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 day'$$);

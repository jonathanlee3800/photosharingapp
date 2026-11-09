-- Guests get one event at a time, by PIN or event id, instead of reading whole tables.
-- Per-photo votes stay hidden while that photo's round is live.
-- Live updates come from database triggers, sent only on that event's own channels.
-- Additive: the tables are locked separately in 20261110000001_lock_guest_reads.sql.

-- ---------- Limit on wrong PINs, so PINs can't be found by trying them all ----------
CREATE TABLE IF NOT EXISTS public.event_lookup_failures (
  id bigserial PRIMARY KEY,
  ip text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_lookup_failures_ip_time_idx ON public.event_lookup_failures (ip, attempted_at);
ALTER TABLE public.event_lookup_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_lookup_failures FROM anon, authenticated;

-- ---------- What guests may see ----------
-- No owner_id. Includes only the round's total votes, never per-photo votes.
CREATE OR REPLACE FUNCTION public.event_public_json(p_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'date', e.date,
    'venue', e.venue,
    'join_code', e.join_code,
    'slug', e.slug,
    'cover_url', e.cover_url,
    'created_at', e.created_at,
    'voting_prompt_id', e.voting_prompt_id,
    'voting_open', e.voting_open,
    'voting_ends_at', e.voting_ends_at,
    'voting_closed_at', e.voting_closed_at,
    'round_vote_total', COALESCE((
      SELECT sum(p.votes_count) FROM posts p
      WHERE p.event_id = e.id AND p.category_tag = e.voting_prompt_id AND NOT p.is_private
    ), 0),
    'prompts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', pr.id, 'label', pr.label, 'icon', pr.icon) ORDER BY pr.created_at)
      FROM prompts pr WHERE pr.event_id = e.id
    ), '[]'::jsonb)
  )
  FROM events e
  WHERE e.id = p_event_id
$$;

-- No votes and no guest_id: this goes out on a public live channel
CREATE OR REPLACE FUNCTION public.post_public_json(p public.posts)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'event_id', p.event_id,
    'guest_name', p.guest_name,
    'media_type', p.media_type,
    'video_duration', p.video_duration,
    'storage_key', p.storage_key,
    'caption', p.caption,
    'category_tag', p.category_tag,
    'is_private', p.is_private,
    'is_spotlight', p.is_spotlight,
    'created_at', p.created_at
  )
$$;

-- ---------- What guests call ----------
-- Looks up one event by its 6-digit PIN or its internal id
CREATE OR REPLACE FUNCTION public.get_event_for_guest(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := trim(COALESCE(p_code, ''));
  v_id uuid;
  v_headers jsonb := COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip text := COALESCE(
    NULLIF(v_headers->>'cf-connecting-ip', ''),
    NULLIF(trim(split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1)), ''),
    'unknown'
  );
BEGIN
  IF v_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- Far too long to guess, so no attempt limit
    SELECT e.id INTO v_id FROM events e WHERE e.id = v_code::uuid;
  ELSIF v_code ~ '^[0-9]{6}$' THEN
    -- 50 wrong PINs from one address in 10 minutes pauses PIN lookups from that address
    IF (SELECT count(*) FROM event_lookup_failures f
        WHERE f.ip = v_ip AND f.attempted_at > now() - interval '10 minutes') >= 50 THEN
      RETURN NULL;
    END IF;
    SELECT e.id INTO v_id FROM events e WHERE e.join_code = v_code;
    IF v_id IS NULL THEN
      INSERT INTO event_lookup_failures (ip) VALUES (v_ip);
      DELETE FROM event_lookup_failures WHERE attempted_at < now() - interval '1 day';
    END IF;
  END IF;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN event_public_json(v_id);
END;
$$;

-- One event's public posts. Votes in a live round's category come back as 0 until the round ends.
CREATE OR REPLACE FUNCTION public.get_event_posts(p_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT e.voting_prompt_id,
           (e.voting_open AND (e.voting_ends_at IS NULL OR now() < e.voting_ends_at)) AS round_live
    FROM events e WHERE e.id = p_event_id
  )
  SELECT jsonb_build_object(
    'votes_hidden', COALESCE((SELECT round_live FROM ev), false),
    'posts', COALESCE((
      SELECT jsonb_agg(
        post_public_json(p) || jsonb_build_object(
          'file_url', p.file_url,
          'votes_count', CASE WHEN ev.round_live AND p.category_tag = ev.voting_prompt_id THEN 0 ELSE p.votes_count END
        )
        ORDER BY p.created_at DESC
      )
      FROM posts p CROSS JOIN ev
      WHERE p.event_id = p_event_id AND NOT p.is_private
    ), '[]'::jsonb)
  )
$$;

-- ---------- Votes: stop returning a photo's count to the voter ----------
CREATE OR REPLACE FUNCTION public.toggle_vote(p_post_id uuid, p_voter_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_voter text := COALESCE(auth.uid()::text, NULLIF(trim(p_voter_id), ''));
  v_event uuid;
  v_private boolean;
  v_category text;
  v_open boolean;
  v_ends_at timestamptz;
  v_round_category text;
  v_removed int;
  v_moved_from uuid[];
BEGIN
  IF v_voter IS NULL OR length(v_voter) > 64 THEN
    RAISE EXCEPTION 'A voter id is required';
  END IF;

  SELECT p.event_id, p.is_private, p.category_tag, e.voting_open, e.voting_ends_at, e.voting_prompt_id
  INTO v_event, v_private, v_category, v_open, v_ends_at, v_round_category
  FROM posts p
  JOIN events e ON e.id = p.event_id
  WHERE p.id = p_post_id;

  IF NOT FOUND OR v_private THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF NOT v_open OR (v_ends_at IS NOT NULL AND now() >= v_ends_at) THEN
    RAISE EXCEPTION 'Voting is closed. Wait for the hosts to open a live round.';
  END IF;

  IF v_round_category IS NOT NULL AND v_category IS DISTINCT FROM v_round_category THEN
    RAISE EXCEPTION 'This photo is not in the current voting round.';
  END IF;

  -- Serialize this voter's votes in this event so rapid taps can't create two votes
  PERFORM pg_advisory_xact_lock(hashtext(v_voter || ':' || v_event::text));

  -- Tapping the photo you already voted for removes your vote
  DELETE FROM reactions
  WHERE post_id = p_post_id AND voter_id = v_voter AND reaction_type = 'vote';
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  IF v_removed = 0 THEN
    -- One vote per round: move any vote this voter has on another photo in this round
    SELECT array_agg(r.post_id) INTO v_moved_from
    FROM reactions r
    JOIN posts p ON p.id = r.post_id
    WHERE r.voter_id = v_voter
      AND r.reaction_type = 'vote'
      AND p.event_id = v_event
      AND p.category_tag IS NOT DISTINCT FROM v_category;

    IF v_moved_from IS NOT NULL THEN
      DELETE FROM reactions
      WHERE voter_id = v_voter AND reaction_type = 'vote' AND post_id = ANY (v_moved_from);
    END IF;

    INSERT INTO reactions (post_id, event_id, voter_id, guest_id, reaction_type)
    VALUES (p_post_id, v_event, v_voter, auth.uid(), 'vote')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object(
    'voted', v_removed = 0,
    'moved_from', COALESCE(to_json(v_moved_from), '[]'::json)
  );
END;
$function$;

-- ---------- Live updates, per event ----------
-- event-updates-<id>: round start/close and event details. Every guest page.
CREATE OR REPLACE FUNCTION public.notify_event_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'events' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM realtime.send(jsonb_build_object('id', OLD.id), 'event-deleted', 'event-updates-' || OLD.id, false);
      RETURN OLD;
    END IF;
    v_event_id := NEW.id;
  ELSE
    v_event_id := COALESCE(NEW.event_id, OLD.event_id);
    -- The event itself is being deleted: its own message covers this
    IF NOT EXISTS (SELECT 1 FROM events e WHERE e.id = v_event_id) THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;
  PERFORM realtime.send(event_public_json(v_event_id), 'event-updated', 'event-updates-' || v_event_id, false);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS events_notify_changed ON public.events;
CREATE TRIGGER events_notify_changed
  AFTER UPDATE ON public.events
  FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.notify_event_changed();

DROP TRIGGER IF EXISTS events_notify_deleted ON public.events;
CREATE TRIGGER events_notify_deleted
  AFTER DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_changed();

DROP TRIGGER IF EXISTS prompts_notify_changed ON public.prompts;
CREATE TRIGGER prompts_notify_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_changed();

-- event-feed-<id>: photos added, removed, pinned. Only pages that show the photo feed.
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
      PERFORM realtime.send(post_public_json(NEW), 'post-added', v_topic, false);
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
    PERFORM realtime.send(post_public_json(NEW), 'post-added', v_topic, false);
  ELSIF NOT NEW.is_private THEN
    PERFORM realtime.send(post_public_json(NEW), 'post-changed', v_topic, false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_notify_added_removed ON public.posts;
CREATE TRIGGER posts_notify_added_removed
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_changed();

-- Deliberately ignores votes_count: a vote must not reach the photo feed
DROP TRIGGER IF EXISTS posts_notify_changed ON public.posts;
CREATE TRIGGER posts_notify_changed
  AFTER UPDATE ON public.posts
  FOR EACH ROW WHEN (
    OLD.is_private IS DISTINCT FROM NEW.is_private
    OR OLD.is_spotlight IS DISTINCT FROM NEW.is_spotlight
    OR OLD.caption IS DISTINCT FROM NEW.caption
    OR OLD.storage_key IS DISTINCT FROM NEW.storage_key
  )
  EXECUTE FUNCTION public.notify_post_changed();

-- event-votes-<id>: the running total for the projector. Only ever the total.
CREATE OR REPLACE FUNCTION public.notify_round_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prompt text;
  v_total bigint;
BEGIN
  SELECT e.voting_prompt_id INTO v_prompt FROM events e WHERE e.id = NEW.event_id;
  IF v_prompt IS DISTINCT FROM NEW.category_tag THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(sum(p.votes_count), 0) INTO v_total FROM posts p
  WHERE p.event_id = NEW.event_id AND p.category_tag = v_prompt AND NOT p.is_private;
  PERFORM realtime.send(jsonb_build_object('total', v_total), 'round-total', 'event-votes-' || NEW.event_id, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_notify_round_total ON public.posts;
CREATE TRIGGER posts_notify_round_total
  AFTER UPDATE OF votes_count ON public.posts
  FOR EACH ROW WHEN (OLD.votes_count IS DISTINCT FROM NEW.votes_count)
  EXECUTE FUNCTION public.notify_round_total();

-- ---------- Who can call what ----------
REVOKE ALL ON FUNCTION public.event_public_json(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_public_json(public.posts) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_event_changed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_post_changed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_round_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_event_for_guest(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_event_posts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_for_guest(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_posts(uuid) TO anon, authenticated;

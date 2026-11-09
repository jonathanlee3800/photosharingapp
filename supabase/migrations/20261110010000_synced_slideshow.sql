-- Every screen works out the current slide from these values and the server's clock, so a playing
-- slideshow stays in step with no messages. Only the host's skip / pause changes them.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slideshow_anchor_at timestamptz;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slideshow_anchor_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slideshow_paused boolean NOT NULL DEFAULT false;

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
    'slideshow_anchor_at', e.slideshow_anchor_at,
    'slideshow_anchor_index', e.slideshow_anchor_index,
    'slideshow_paused', e.slideshow_paused,
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
REVOKE ALL ON FUNCTION public.event_public_json(uuid) FROM PUBLIC, anon, authenticated;

-- The same lookup, now also returning the server's time so each phone can correct for its own clock
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
  RETURN event_public_json(v_id) || jsonb_build_object('server_now', clock_timestamp());
END;
$$;

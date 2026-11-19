-- The reactions table only holds contest votes now, so it's called votes.
-- Its security settings, trigger, indexes and grants move with it; the three functions that name it
-- are updated in the same step, so voting never points at a missing table.

ALTER TABLE public.reactions RENAME TO votes;

-- Names that make sense for the new table
ALTER TABLE public.votes RENAME CONSTRAINT reactions_pkey TO votes_pkey;
ALTER TABLE public.votes RENAME CONSTRAINT reactions_event_id_fkey TO votes_event_id_fkey;
ALTER TABLE public.votes RENAME CONSTRAINT reactions_post_id_fkey TO votes_post_id_fkey;
ALTER TABLE public.votes RENAME CONSTRAINT reactions_votes_only TO votes_type_is_vote;
ALTER INDEX public.idx_reactions_event_voter RENAME TO idx_votes_event_voter;
ALTER INDEX public.reactions_one_vote_per_voter RENAME TO votes_one_per_voter;
ALTER TRIGGER reactions_sync_votes_count ON public.votes RENAME TO votes_sync_votes_count;

-- Keeps posts.votes_count in step with the votes table
CREATE OR REPLACE FUNCTION public.sync_post_votes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_post uuid;
  target_type text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_post := OLD.post_id;
    target_type := OLD.reaction_type;
  ELSE
    target_post := NEW.post_id;
    target_type := NEW.reaction_type;
  END IF;

  IF target_type = 'vote' AND target_post IS NOT NULL THEN
    UPDATE posts
    SET votes_count = (
      SELECT count(*) FROM votes WHERE post_id = target_post AND reaction_type = 'vote'
    )
    WHERE id = target_post;
  END IF;
  RETURN NULL;
END;
$function$;

-- Which photos this guest voted for (the vote screen shows them as "Voted")
CREATE OR REPLACE FUNCTION public.my_voted_posts(p_event_id uuid, p_voter_id text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT post_id
  FROM votes
  WHERE event_id = p_event_id
    AND reaction_type = 'vote'
    AND voter_id = COALESCE(auth.uid()::text, NULLIF(trim(p_voter_id), ''));
$function$;

-- Vote, change vote, or take a vote back
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
  DELETE FROM votes
  WHERE post_id = p_post_id AND voter_id = v_voter AND reaction_type = 'vote';
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  IF v_removed = 0 THEN
    -- One vote per round: move any vote this voter has on another photo in this round
    SELECT array_agg(r.post_id) INTO v_moved_from
    FROM votes r
    JOIN posts p ON p.id = r.post_id
    WHERE r.voter_id = v_voter
      AND r.reaction_type = 'vote'
      AND p.event_id = v_event
      AND p.category_tag IS NOT DISTINCT FROM v_category;

    IF v_moved_from IS NOT NULL THEN
      DELETE FROM votes
      WHERE voter_id = v_voter AND reaction_type = 'vote' AND post_id = ANY (v_moved_from);
    END IF;

    INSERT INTO votes (post_id, event_id, voter_id, reaction_type)
    VALUES (p_post_id, v_event, v_voter, 'vote')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object(
    'voted', v_removed = 0,
    'moved_from', COALESCE(to_json(v_moved_from), '[]'::json)
  );
END;
$function$;

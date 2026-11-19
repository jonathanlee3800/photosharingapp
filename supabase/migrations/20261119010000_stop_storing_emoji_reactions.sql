-- Emoji taps reach the projector over the live channel only; they were also being saved here but
-- nothing ever read them. The reactions table now holds votes only.

-- 1. Nobody can add emoji rows any more
DROP POLICY IF EXISTS "Anyone can insert emoji reactions" ON public.reactions;

-- 2. Remove the stored emoji taps (the vote-count trigger ignores non-vote rows, so counts are unaffected)
DELETE FROM public.reactions WHERE reaction_type <> 'vote';

-- 3. Voting without the old guest_id column (votes are identified by voter_id)
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

    INSERT INTO reactions (post_id, event_id, voter_id, reaction_type)
    VALUES (p_post_id, v_event, v_voter, 'vote')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object(
    'voted', v_removed = 0,
    'moved_from', COALESCE(to_json(v_moved_from), '[]'::json)
  );
END;
$function$;

-- 4. Drop guest_id (only emoji rows and very old votes used it) and its two duplicate unique rules
ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_post_guest_unique,
  DROP CONSTRAINT IF EXISTS reactions_post_id_guest_id_key,
  DROP CONSTRAINT IF EXISTS reactions_guest_id_fkey,
  DROP COLUMN IF EXISTS guest_id;

-- 5. Keep it votes-only from now on
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_votes_only;
ALTER TABLE public.reactions ADD CONSTRAINT reactions_votes_only CHECK (reaction_type = 'vote');

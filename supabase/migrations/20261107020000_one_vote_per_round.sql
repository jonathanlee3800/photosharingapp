-- ==============================================================================
-- One vote per person per round: a voter has a single vote among the photos in the
-- live round's category. Voting for another photo moves the vote; tapping the same
-- photo again removes it.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.toggle_vote(p_post_id uuid, p_voter_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_count int;
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

  SELECT votes_count INTO v_count FROM posts WHERE id = p_post_id;
  RETURN json_build_object(
    'voted', v_removed = 0,
    'votes', COALESCE(v_count, 0),
    'moved_from', COALESCE(to_json(v_moved_from), '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_vote(uuid, text) TO anon, authenticated;

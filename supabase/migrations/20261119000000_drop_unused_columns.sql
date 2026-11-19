-- Removes columns the app no longer uses.
--   events.venue            no screen sets it any more
--   events.slug             old name-style links; events are found by id (links) or PIN (join page)
--   events.slideshow_paused the slideshow has no pause (holding a photo is done by pinning it)
--   posts.width / height    never written or read
-- Apply only after the frontend that stops using them is live.

-- What guests and screens receive about an event, without the removed fields
CREATE OR REPLACE FUNCTION public.event_public_json(p_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'date', e.date,
    'join_code', e.join_code,
    'cover_url', e.cover_url,
    'created_at', e.created_at,
    'voting_prompt_id', e.voting_prompt_id,
    'voting_open', e.voting_open,
    'voting_ends_at', e.voting_ends_at,
    'voting_closed_at', e.voting_closed_at,
    'slideshow_anchor_at', e.slideshow_anchor_at,
    'slideshow_anchor_index', e.slideshow_anchor_index,
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
$function$;

ALTER TABLE public.events
  DROP COLUMN IF EXISTS venue,
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS slideshow_paused;

ALTER TABLE public.posts
  DROP COLUMN IF EXISTS width,
  DROP COLUMN IF EXISTS height;

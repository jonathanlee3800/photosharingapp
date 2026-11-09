-- Phones poll a round's vote totals during live rounds, and every page load reads an event's posts.
-- Without this, each of those reads scans the whole posts table.
CREATE INDEX IF NOT EXISTS posts_event_id_category_idx ON public.posts (event_id, category_tag);

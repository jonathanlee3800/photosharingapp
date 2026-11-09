-- Apply only after the app using get_event_for_guest / get_event_posts is deployed:
-- older versions read these tables directly and would stop working.
-- Hosts keep full access to their own rows through their existing owner policies.
DROP POLICY IF EXISTS "Public event access" ON public.events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Prompts are viewable by everyone" ON public.prompts;
DROP POLICY IF EXISTS "Guests view public posts" ON public.posts;
DROP POLICY IF EXISTS "View public posts or host view private" ON public.posts;

-- Cover images live in R2; the database only stores their address
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_cover_url_not_embedded;
ALTER TABLE public.events ADD CONSTRAINT events_cover_url_not_embedded CHECK (cover_url IS NULL OR cover_url NOT LIKE 'data:%');

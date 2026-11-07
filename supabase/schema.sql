-- ==============================================================================
-- MEMORY AISLE - FULL DECLARATIVE DATABASE SCHEMA
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date text DEFAULT '24 May 2026',
  venue text DEFAULT 'The Glasshouse',
  join_code text NOT NULL UNIQUE,
  slug text,
  cover_url text DEFAULT 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
  voting_prompt_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. PROMPTS TABLE (PHOTO MINI-CATEGORIES)
CREATE TABLE IF NOT EXISTS public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL,
  icon text DEFAULT '🌿',
  created_at timestamp with time zone DEFAULT now()
);

-- 4. POSTS TABLE (PHOTOS & VIDEO MEMORIES)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid DEFAULT gen_random_uuid(),
  guest_name text NOT NULL,
  file_url text NOT NULL,
  caption text,
  category_tag text,
  media_type text DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  video_duration text,
  is_private boolean DEFAULT false,
  is_spotlight boolean DEFAULT false,
  votes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. REACTIONS TABLE (VOTES & EMOJI REACTIONS)
CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid DEFAULT gen_random_uuid(),
  reaction_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_events_join_code ON public.events (join_code);
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.events (owner_id);
CREATE INDEX IF NOT EXISTS idx_posts_event ON public.posts (event_id);
CREATE INDEX IF NOT EXISTS idx_posts_spotlight ON public.posts (event_id) WHERE is_spotlight = true;
CREATE INDEX IF NOT EXISTS idx_prompts_event ON public.prompts (event_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON public.reactions (post_id);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- 7.1 Events RLS
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON public.events;
CREATE POLICY "Public events are viewable by everyone" 
  ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can create events" ON public.events;
CREATE POLICY "Hosts can create events" 
  ON public.events FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Hosts can update own events" ON public.events;
CREATE POLICY "Hosts can update own events" 
  ON public.events FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Hosts can delete own events" ON public.events;
CREATE POLICY "Hosts can delete own events" 
  ON public.events FOR DELETE USING (auth.uid() = owner_id);

-- 7.2 Prompts RLS
DROP POLICY IF EXISTS "Prompts are viewable by everyone" ON public.prompts;
CREATE POLICY "Prompts are viewable by everyone" 
  ON public.prompts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage prompts" ON public.prompts;
CREATE POLICY "Hosts can manage prompts" 
  ON public.prompts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = prompts.event_id AND events.owner_id = auth.uid())
  );

-- 7.3 Posts RLS
DROP POLICY IF EXISTS "View public posts or host view private" ON public.posts;
CREATE POLICY "View public posts or host view private" 
  ON public.posts FOR SELECT USING (
    is_private = false OR 
    EXISTS (SELECT 1 FROM public.events WHERE events.id = posts.event_id AND events.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can insert posts" ON public.posts;
CREATE POLICY "Anyone can insert posts" 
  ON public.posts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Hosts can update posts" ON public.posts;
CREATE POLICY "Hosts can update posts" 
  ON public.posts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = posts.event_id AND events.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Hosts can delete posts" ON public.posts;
CREATE POLICY "Hosts can delete posts" 
  ON public.posts FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = posts.event_id AND events.owner_id = auth.uid())
  );

-- 7.4 Reactions RLS
DROP POLICY IF EXISTS "Reactions viewable by everyone" ON public.reactions;
CREATE POLICY "Reactions viewable by everyone" 
  ON public.reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert reactions" ON public.reactions;
CREATE POLICY "Anyone can insert reactions" 
  ON public.reactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can remove their reaction" ON public.reactions;
CREATE POLICY "Anyone can remove their reaction" 
  ON public.reactions FOR DELETE USING (true);

-- 8. STORAGE BUCKET CONFIGURATION
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-media', 'event-media', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
  ON storage.objects FOR SELECT USING (bucket_id = 'event-media');

DROP POLICY IF EXISTS "Anyone can upload media" ON storage.objects;
CREATE POLICY "Anyone can upload media" 
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-media');


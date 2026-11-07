-- ==============================================================================
-- LIVE SCHEMA SNAPSHOT - project nkxgvgijswqbpcektphk ("Memory Aisle")
-- Pulled 2026-10-28 via catalog queries (`supabase db query --linked`).
-- Reference only: reflects the remote database, not a migration to run.
-- ==============================================================================

-- EVENTS
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  join_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  date text DEFAULT '24 May 2026'::text,
  venue text DEFAULT 'The Glasshouse'::text,
  slug text,
  cover_url text DEFAULT 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85'::text,
  voting_prompt_id text,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_join_code_key UNIQUE (join_code),
  CONSTRAINT events_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- POSTS
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  guest_id uuid DEFAULT gen_random_uuid(),
  guest_name text NOT NULL,
  file_url text NOT NULL,
  caption text,
  category_tag text,
  is_private boolean DEFAULT false,
  is_spotlight boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  media_type text DEFAULT 'photo'::text,
  video_duration text,
  votes_count integer DEFAULT 0,
  storage_key text,
  width integer,
  height integer,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT posts_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES auth.users(id),
  CONSTRAINT posts_media_type_check CHECK (media_type = ANY (ARRAY['photo'::text, 'video'::text]))
);

-- PROMPTS
CREATE TABLE public.prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  label text NOT NULL,
  icon text DEFAULT '🌿'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prompts_pkey PRIMARY KEY (id),
  CONSTRAINT prompts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- REACTIONS
CREATE TABLE public.reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  guest_id uuid DEFAULT gen_random_uuid(),
  reaction_type text NOT NULL,
  event_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reactions_pkey PRIMARY KEY (id),
  CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT reactions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT reactions_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES auth.users(id),
  CONSTRAINT reactions_post_guest_unique UNIQUE (post_id, guest_id),
  CONSTRAINT reactions_post_id_guest_id_key UNIQUE (post_id, guest_id)
);

-- ROW LEVEL SECURITY (enabled on all four tables)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- events
CREATE POLICY "Hosts can create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Hosts can delete own events" ON public.events FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Hosts can update own events" ON public.events FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner event management" ON public.events FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Public event access" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public events are viewable by everyone" ON public.events FOR SELECT USING (true);

-- posts
CREATE POLICY "Anyone can insert posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Guests insert posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = guest_id);
CREATE POLICY "Guests view public posts" ON public.posts FOR SELECT USING (is_private = false);
CREATE POLICY "Hosts can delete posts" ON public.posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = posts.event_id AND events.owner_id = auth.uid())
);
CREATE POLICY "Hosts can update posts" ON public.posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = posts.event_id AND events.owner_id = auth.uid())
);
CREATE POLICY "Owner manage posts" ON public.posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = posts.event_id AND events.owner_id = auth.uid())
);
CREATE POLICY "View public posts or host view private" ON public.posts FOR SELECT USING (
  is_private = false OR
  EXISTS (SELECT 1 FROM public.events WHERE events.id = posts.event_id AND events.owner_id = auth.uid())
);

-- prompts
CREATE POLICY "Hosts can manage prompts" ON public.prompts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = prompts.event_id AND events.owner_id = auth.uid())
);
CREATE POLICY "Prompts are viewable by everyone" ON public.prompts FOR SELECT USING (true);

-- reactions
CREATE POLICY "Anyone can insert reactions" ON public.reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can remove their reaction" ON public.reactions FOR DELETE USING (true);
CREATE POLICY "Reactions viewable by everyone" ON public.reactions FOR SELECT USING (true);

-- STORAGE (bucket "event-media", public)
CREATE POLICY "Anyone can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-media'::text);
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'event-media'::text);

-- FUNCTIONS
-- public.rls_auto_enable(): Supabase-provided event trigger that enables RLS on new public tables.

-- REALTIME: no tables are in the supabase_realtime publication.
-- TRIGGERS / VIEWS: none in public.

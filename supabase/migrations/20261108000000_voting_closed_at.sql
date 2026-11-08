-- When the host last closed a voting round. Guests who weren't watching at that moment
-- (phone locked, app in the background, joined later) use it to see the winner reveal once.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS voting_closed_at timestamptz;

'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import {
  INITIAL_MEMORIES,
  INITIAL_PROMPTS,
  INITIAL_EVENTS,
  MemoryItem,
  PromptItem,
  EventItem,
  HostUser,
} from '@/lib/initialData';
import { downloadMemoriesZip, downloadSinglePhoto } from '@/lib/downloadHelper';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  deleteMediaFromR2,
  isR2PublicUrlConfigured,
  mediaUrlFromKey,
  uploadMediaToR2,
} from '@/lib/mediaUpload';

export interface FloatingEmoji {
  id: number;
  emoji: string;
  left: number;
}

export interface ToastMessage {
  id: number;
  title: string;
  subtitle: string;
}

export interface VotingRound {
  // True only while the host has a round open and its timer (if any) has not run out
  isActive: boolean;
  // Host opened a round that has not been closed yet (may have timed out)
  isOpen: boolean;
  promptId: string;
  endsAt: string | null;
  // Seconds left on the round timer, or null for an open-ended round
  secondsLeft: number | null;
}

interface EventContextType {
  // Host Auth (source of truth: the Supabase Auth session only)
  isHostLoggedIn: boolean;
  isAuthLoading: boolean;
  hostUser: HostUser | null;
  loginWithGoogle: (next?: string) => Promise<{ error?: string }>;
  loginHostWithPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpHostWithPassword: (
    email: string,
    pass: string,
    fullName?: string
  ) => Promise<{ success: boolean; error?: string; requireVerification?: boolean }>;
  logoutHost: () => Promise<void> | void;

  // Events Management
  // All events (guests look these up by QR code / join code without logging in)
  events: EventItem[];
  // True once the first events query from the database has finished (success or failure)
  eventsLoaded: boolean;
  // Only the events owned by the logged-in host
  hostEvents: EventItem[];
  currentEvent: EventItem;
  getEventById: (idOrCode: string) => EventItem | undefined;
  setCurrentEventId: (id: string, silent?: boolean) => void;
  createEvent: (data: {
    id?: string;
    title: string;
    date: string;
    venue: string;
    code?: string;
    coverUrl?: string;
    initialPrompts?: PromptItem[];
  }) => Promise<EventItem>;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;

  // Guest State (per-browser identity, independent of the host session)
  guestId: string;
  guestName: string;
  hasJoined: boolean;
  setGuestName: (name: string) => void;
  leaveAsGuest: () => void;
  guestCount: number;
  reactionCount: number;

  // Memories & Prompts for Current Event
  memories: MemoryItem[];
  prompts: PromptItem[];
  publicMemories: MemoryItem[];
  privateMemories: MemoryItem[];
  getPrompt: (id: string) => PromptItem;
  addPrompt: (label: string, icon?: string) => Promise<void>;
  deletePrompt: (promptId: string) => Promise<void>;

  // Actions
  joinCelebration: (name: string) => Promise<void>;
  switchEventByCode: (code: string) => boolean;
  addMemory: (entry: {
    type: 'photo' | 'video';
    url: string;
    caption: string;
    promptId: string;
    isPrivate?: boolean;
    duration?: string;
    guestName?: string;
  }) => Promise<void>;
  addMultipleMemories: (entries: Array<{
    type: 'photo' | 'video';
    url: string;
    caption: string;
    promptId: string;
    isPrivate?: boolean;
    duration?: string;
    guestName?: string;
  }>) => Promise<void>;
  toggleVote: (memoryId: string) => Promise<void>;
  togglePrivacy: (memoryId: string) => Promise<void>;
  toggleSpotlight: (memoryId: string) => Promise<void>;
  resumeSlideshow: () => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<void>;
  deleteMultipleMemories: (ids: string[]) => Promise<void>;

  // Slideshow & Spotlight
  spotlightId: string | null;
  setSpotlightId: (id: string | null) => void;
  currentSlideIdx: number;
  setCurrentSlideIdx: React.Dispatch<React.SetStateAction<number>>;
  isSlideshowPlaying: boolean;
  setIsSlideshowPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  activeSlideMemory: MemoryItem;
  cycleNextSlide: () => void;
  cyclePrevSlide: () => void;

  // Live Voting
  votingRound: VotingRound;
  canVoteOn: (memory: MemoryItem) => boolean;
  startVotingRound: (promptId: string, durationMinutes: number | null) => Promise<void>;
  closeVotingRound: () => Promise<MemoryItem | null>;

  // Reactions
  floatingEmojis: FloatingEmoji[];
  sendReaction: (emoji?: string) => void;

  // Toasts
  toast: ToastMessage | null;
  triggerToast: (title: string, subtitle?: string) => void;

  // Downloads & Export
  isZipModalOpen: boolean;
  setIsZipModalOpen: (open: boolean) => void;
  downloadSingle: (memory: MemoryItem) => Promise<boolean>;
  exportAllZip: () => Promise<boolean>;
  exportSelectedZip: (selectedIds: string[]) => Promise<boolean>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

const STORAGE_KEY_EVENTS = 'withlove_events_v2';
const STORAGE_KEY_CURRENT_EVENT_ID = 'withlove_current_event_id';
const STORAGE_KEY_MEMORIES = 'withlove_memories_v2';
const STORAGE_KEY_GUEST = 'withlove_guest_name';
const STORAGE_KEY_GUEST_ID = 'withlove_guest_id';
// Legacy cached host session; no longer trusted, only cleared on load
const STORAGE_KEY_HOST_AUTH = 'withlove_host_user_auth';
const STORAGE_KEY_REACTIONS = 'withlove_reactions_count';

// Minimum gap between emoji broadcasts from one screen (taps in between still show locally)
const REACTION_BROADCAST_GAP_MS = 150;

const isUuid = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const toHostUser = (user: any): HostUser => ({
  id: user.id,
  name:
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Host User',
  email: user.email || '',
  avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
});

// Converts a `posts` row (from a query or a realtime payload) into a MemoryItem
const mapDbPost = (p: any): MemoryItem => ({
  id: p.id,
  eventId: p.event_id || undefined,
  guestName: p.guest_name || 'Wedding Guest',
  type: (p.media_type as 'photo' | 'video') || 'photo',
  duration: p.video_duration || undefined,
  // R2 objects are addressed by key so the public domain can change without breaking old posts
  url: p.storage_key && isR2PublicUrlConfigured() ? mediaUrlFromKey(p.storage_key) : p.file_url,
  caption: p.caption || '',
  promptId: p.category_tag || 'fav-chapter',
  isPrivate: Boolean(p.is_private),
  votes: p.votes_count || 0,
  votedByMe: false,
  timestamp: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

export function EventProvider({ children }: { children: ReactNode }) {
  // Host Auth State
  const [hostUser, setHostUser] = useState<HostUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(isSupabaseConfigured());

  // Events State
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [eventsLoaded, setEventsLoaded] = useState<boolean>(!isSupabaseConfigured());
  const [currentEventId, setCurrentEventIdState] = useState<string>(INITIAL_EVENTS[0].id);

  // Guest State
  const [guestId, setGuestId] = useState<string>('');
  const [guestName, setGuestNameState] = useState<string>('');
  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [guestCount, setGuestCount] = useState<number>(148);
  const [reactionCount, setReactionCount] = useState<number>(1240);

  // Memories State
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);

  // Spotlight & Slideshow
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState<boolean>(true);

  // Reactions, Toasts, ZIP Modal
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const lastReactionSentRef = useRef(0);

  // Floats an emoji up the screen for ~2.6s (used for local taps and ones broadcast by others)
  const showFloatingEmoji = useCallback((emoji: string) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 70) + 15;
    setFloatingEmojis((prev) => [...prev.slice(-12), { id, emoji, left }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2600);
  }, []);
  const [isZipModalOpen, setIsZipModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const triggerToast = useCallback((title: string, subtitle = 'Synced across all active screens') => {
    setToast({ title, subtitle, id: Date.now() });
  }, []);

  // Fetch Events from Supabase
  const fetchEventsFromDb = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data: dbEvents, error } = await supabase
        .from('events')
        .select('*, prompts(*)');

      if (error) {
        console.warn('Error fetching events from Supabase:', error);
        return;
      }

      if (dbEvents && dbEvents.length > 0) {
        const mapped: EventItem[] = dbEvents.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date || '24 May 2026',
          venue: e.venue || 'The Glasshouse',
          code: e.join_code,
          slug: e.slug || e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          coverUrl:
            e.cover_url ||
            'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
          prompts:
            e.prompts && e.prompts.length > 0
              ? e.prompts.map((p: any) => ({ id: p.id, label: p.label, icon: p.icon || '🌿' }))
              : INITIAL_PROMPTS,
          votingPromptId: e.voting_prompt_id || '',
          createdAt: e.created_at,
          ownerId: e.owner_id,
          votingOpen: Boolean(e.voting_open),
          votingEndsAt: e.voting_ends_at || null,
        }));
        setEvents(mapped);
      }
    } catch (err) {
      console.warn('Error fetching events from Supabase:', err);
    } finally {
      setEventsLoaded(true);
    }
  }, []);

  // Identity used for "one vote per person per post": the host's auth id, else this browser's guest id
  const voterIdRef = useRef('');
  voterIdRef.current = hostUser?.id || guestId;

  // Fetch one event's posts and replace that event's slice of the cache (other events stay cached).
  // Cached posts render immediately; this refresh swaps in the latest rows (stale-while-revalidate).
  const fetchPostsForEvent = useCallback(async (eventId: string) => {
    if (!isSupabaseConfigured() || !isUuid(eventId)) return;
    try {
      const { data: dbPosts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching posts from Supabase:', error);
        return;
      }

      // Which of these posts this voter has already voted for (one vote per person per post)
      const votedIds = new Set<string>();
      const voterId = voterIdRef.current;
      if (voterId) {
        const { data: myVotes, error: votesError } = await supabase.rpc('my_voted_posts', {
          p_event_id: eventId,
          p_voter_id: voterId,
        });
        if (votesError) console.warn('Error loading my votes:', votesError);
        (myVotes || []).forEach((id: string) => votedIds.add(id));
      }

      const mapped: MemoryItem[] = (dbPosts || []).map((p: any) => ({
        ...mapDbPost(p),
        votedByMe: votedIds.has(p.id),
      }));
      setMemories((prev) => [...mapped, ...prev.filter((m) => m.eventId !== eventId)]);
      setSpotlightId((dbPosts || []).find((p: any) => p.is_spotlight)?.id ?? null);
    } catch (err) {
      console.warn('Error fetching posts from Supabase:', err);
    }
  }, []);

  // 1. Initial Load from LocalStorage (fast fallback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Host identity now comes only from Supabase Auth; drop any stale cached copy
      localStorage.removeItem(STORAGE_KEY_HOST_AUTH);

      const savedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEvents(parsed);
        }
      }

      const savedCurrentEventId = localStorage.getItem(STORAGE_KEY_CURRENT_EVENT_ID);
      if (savedCurrentEventId) {
        setCurrentEventIdState(savedCurrentEventId);
      }

      const savedMemories = localStorage.getItem(STORAGE_KEY_MEMORIES);
      if (savedMemories) {
        setMemories(JSON.parse(savedMemories));
      }

      const savedGuest = localStorage.getItem(STORAGE_KEY_GUEST);
      if (savedGuest) {
        setGuestNameState(savedGuest);
        setHasJoined(true);
      }

      const savedGuestId = localStorage.getItem(STORAGE_KEY_GUEST_ID);
      if (savedGuestId) {
        setGuestId(savedGuestId);
      }

      const savedReactions = localStorage.getItem(STORAGE_KEY_REACTIONS);
      if (savedReactions) {
        setReactionCount(Number(savedReactions));
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
  }, []);

  // 2. Supabase Auth State Synchronization & Initial DB Pull
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // One role per browser: an active host session always replaces the guest identity
    // (covers email login, sign up and the Google OAuth redirect).
    const applySession = (session: { user: any } | null) => {
      if (session?.user) {
        setHostUser(toHostUser(session.user));
        setGuestNameState('');
        setGuestId('');
        setHasJoined(false);
        try {
          localStorage.removeItem(STORAGE_KEY_GUEST);
          localStorage.removeItem(STORAGE_KEY_GUEST_ID);
        } catch (e) {}
      } else {
        setHostUser(null);
      }
      setIsAuthLoading(false);
    };

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));

    // Listen to Auth State Changes (sign in/out in this or another tab, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));

    // Pull events from DB (posts are loaded per event when it is opened)
    fetchEventsFromDb();

    // Set up Real-time Live Synchronization Channel (posts are handled per event below)
    const channel = supabase
      .channel('realtime-photosharing-v1')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          fetchEventsFromDb();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prompts' },
        () => {
          fetchEventsFromDb();
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [fetchEventsFromDb]);

  // Save to LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    } catch (e) {}
  }, [events]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Only cache posts that point at a URL; embedded base64/blob media would blow the ~5 MB quota
      const cacheable = memories.filter((m) => m.url && !m.url.startsWith('data:') && !m.url.startsWith('blob:'));
      localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(cacheable));
    } catch (e) {}
  }, [memories]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_EVENT_ID, currentEventId);
    } catch (e) {}
  }, [currentEventId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const getEventById = (idOrCode: string): EventItem | undefined => {
    const clean = idOrCode.trim().toLowerCase();
    if (!clean) return undefined;
    return events.find(
      (e) =>
        e.id.toLowerCase() === clean ||
        e.code.toLowerCase() === clean ||
        e.slug.toLowerCase() === clean
    );
  };

  const hostEvents = hostUser ? events.filter((e) => e.ownerId === hostUser.id) : [];

  // Find active event
  const currentEvent =
    events.find((e) => e.id === currentEventId) || events[0] || INITIAL_EVENTS[0];

  const prompts = currentEvent.prompts || INITIAL_PROMPTS;

  const setCurrentEventId = (id: string, silent = false) => {
    const target = getEventById(id);
    if (target && target.id !== currentEventId) {
      setCurrentEventIdState(target.id);
      if (!silent) {
        triggerToast(`Switched event to "${target.title}"`);
      }
    }
  };

  // Live uploads for the current event: apply each change in place instead of refetching everything
  const eventChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !isUuid(currentEvent.id)) return;
    const eventId = currentEvent.id;
    const isHost = Boolean(hostUser);

    const upsertPost = (row: any) => {
      // Postgres leaves large unchanged (TOASTed) columns out of UPDATE payloads, e.g. legacy
      // base64 `file_url`s, so a missing column means "unchanged", not "empty".
      const urlMissing = row.file_url === undefined && !row.storage_key;
      const incoming = mapDbPost(row);
      let needsFullRow = false;
      setMemories((prev) => {
        const existing = prev.find((m) => m.id === incoming.id);
        if (!existing) {
          if (urlMissing) {
            needsFullRow = true;
            return prev;
          }
          return [incoming, ...prev];
        }
        return prev.map((m) =>
          m.id === incoming.id
            ? {
                ...incoming,
                url: urlMissing ? m.url : incoming.url,
                caption: row.caption === undefined ? m.caption : incoming.caption,
                // Keep this viewer's own vote state
                votedByMe: m.votedByMe,
              }
            : m
        );
      });
      if (needsFullRow) {
        // A post we don't have yet arrived without its file; load the complete row
        supabase
          .from('posts')
          .select('*')
          .eq('id', row.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setMemories((prev) => (prev.some((m) => m.id === data.id) ? prev : [mapDbPost(data), ...prev]));
          });
      }
      if (row.is_spotlight) {
        setSpotlightId(row.id);
      } else {
        setSpotlightId((current) => (current === row.id ? null : current));
      }
    };

    const removePost = (id: string) => {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setSpotlightId((current) => (current === id ? null : current));
    };

    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `event_id=eq.${eventId}` },
        (payload) => upsertPost(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts', filter: `event_id=eq.${eventId}` },
        (payload) => upsertPost(payload.new)
      )
      .on(
        // DELETE payloads only carry the id (and cannot be filtered), so remove by id
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          if ((payload.old as any)?.id) removePost((payload.old as any).id);
        }
      )
      .on(
        // Guests stop receiving a post once it turns private, so the host announces it directly
        'broadcast',
        { event: 'post-hidden' },
        ({ payload }) => {
          if (!isHost && payload?.id) removePost(payload.id);
        }
      )
      .on(
        // Emoji taps from other screens on this event (the sender already showed its own)
        'broadcast',
        { event: 'reaction' },
        ({ payload }) => {
          const emoji = payload?.emoji;
          if (typeof emoji === 'string' && emoji.length > 0 && emoji.length <= 8) showFloatingEmoji(emoji);
        }
      )
      .subscribe((status) => {
        // Load (or refresh) this event's posts once live updates are flowing, so nothing is missed
        // between the fetch and the subscription. Also re-syncs after a dropped connection reconnects.
        if (status === 'SUBSCRIBED') fetchPostsForEvent(eventId);
      });

    eventChannelRef.current = channel;
    return () => {
      eventChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [currentEvent.id, hostUser?.id, fetchPostsForEvent, showFloatingEmoji]);

  // Filter memories for the current event
  const eventMemories = memories.filter(
    (m) => !m.eventId || m.eventId === currentEvent.id
  );

  const publicMemories = eventMemories.filter((m) => !m.isPrivate);
  const privateMemories = eventMemories.filter((m) => m.isPrivate);

  // Live Voting round, derived from the event row (kept in sync for everyone via Realtime)
  const votingEndsAt = currentEvent.votingEndsAt || null;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    // Tick once a second only while a timed round is open, so countdowns and expiry update
    if (!currentEvent.votingOpen || !votingEndsAt) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [currentEvent.votingOpen, votingEndsAt]);

  const secondsLeft = votingEndsAt
    ? Math.max(0, Math.ceil((new Date(votingEndsAt).getTime() - nowMs) / 1000))
    : null;
  const votingRound: VotingRound = {
    isOpen: Boolean(currentEvent.votingOpen),
    isActive: Boolean(currentEvent.votingOpen) && (secondsLeft === null || secondsLeft > 0),
    promptId: currentEvent.votingPromptId || prompts[0]?.id || '',
    endsAt: votingEndsAt,
    secondsLeft,
  };

  // Votes are only allowed on photos in the live round's category
  const canVoteOn = (memory: MemoryItem) =>
    votingRound.isActive && !memory.isPrivate && memory.promptId === votingRound.promptId;

  // Slideshow auto-advance
  useEffect(() => {
    if (!isSlideshowPlaying || publicMemories.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % publicMemories.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isSlideshowPlaying, publicMemories.length]);

  const activeSlideMemory =
    eventMemories.find((m) => m.id === spotlightId && !m.isPrivate) ||
    publicMemories[currentSlideIdx % Math.max(1, publicMemories.length)] ||
    eventMemories[0] || {
      id: 'empty',
      guestName: 'Memory Aisle',
      type: 'photo',
      url:
        currentEvent.coverUrl ||
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
      caption: `Welcome to ${currentEvent.title}!`,
      promptId: prompts[0]?.id || 'fav-chapter',
      isPrivate: false,
      votes: 0,
      timestamp: 'Just now',
    };

  const getPrompt = (id: string): PromptItem => {
    return prompts.find((p) => p.id === id) || prompts[0] || { id: 'default', label: 'Wedding Moment', icon: '🌿' };
  };

  // Host Auth Functions
  const loginWithGoogle = async (next?: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured()) {
      const err =
        'Supabase keys are not set yet. Please paste your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local';
      triggerToast('Configuration Required', 'Please set up your .env.local keys');
      return { error: err };
    }

    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || 'An unexpected error occurred during Google sign in' };
    }
  };

  const loginHostWithPassword = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!email.trim()) return { success: false, error: 'Please enter your email address' };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const user = toHostUser(data.user);
          setHostUser(user);
          triggerToast(`Welcome back, ${user.name}!`, 'Host admin session active');
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to sign in' };
      }
    }

    return { success: false, error: 'Host sign in is unavailable right now. Please try again later.' };
  };

  const signUpHostWithPassword = async (
    email: string,
    pass: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string; requireVerification?: boolean }> => {
    if (!email.trim()) return { success: false, error: 'Please enter your email address' };
    if (!pass || pass.length < 6)
      return { success: false, error: 'Password must be at least 6 characters long' };

    if (isSupabaseConfigured()) {
      try {
        const redirectUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
          options: {
            data: {
              full_name: fullName?.trim() || email.split('@')[0],
            },
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.session && data.user) {
          const user: HostUser = {
            id: data.user.id,
            name: fullName?.trim() || data.user.user_metadata?.full_name || email.split('@')[0],
            email: data.user.email || email.trim(),
          };
          setHostUser(user);
          triggerToast(`Welcome, ${user.name}!`, 'Host account ready');
          return { success: true };
        } else if (data.user && !data.session) {
          return { success: true, requireVerification: true };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Sign up failed' };
      }
    }

    return { success: false, error: 'Host sign up is unavailable right now. Please try again later.' };
  };

  const logoutHost = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
    }
    // Only the host session ends; this browser's guest identity is kept
    setHostUser(null);
    triggerToast('Logged out of Host Admin');
  };

  // Event Creation
  const createEvent = async (data: {
    id?: string;
    title: string;
    date: string;
    venue: string;
    code?: string;
    coverUrl?: string;
    initialPrompts?: PromptItem[];
  }): Promise<EventItem> => {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toLowerCase();
    const rawCode = (data.code?.trim() || `EVT-${randomSuffix}`).toUpperCase();
    const slug =
      data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
      'wedding-event';

    const defaultPromptsList =
      data.initialPrompts && data.initialPrompts.length > 0
        ? data.initialPrompts
        : INITIAL_PROMPTS;

    let eventUuid = data.id && isUuid(data.id) ? data.id : crypto.randomUUID();

    // Database Insert into Supabase 'events'
    if (isSupabaseConfigured() && hostUser) {
      try {
        const { data: dbEvent, error: insertError } = await supabase
          .from('events')
          .insert([
            {
              id: eventUuid,
              title: data.title.trim(),
              date: data.date.trim() || '24 May 2026',
              venue: data.venue.trim() || 'The Glasshouse',
              join_code: rawCode,
              slug,
              cover_url:
                data.coverUrl ||
                'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
              owner_id: hostUser.id,
            },
          ])
          .select()
          .single();

        if (dbEvent) {
          eventUuid = dbEvent.id;
          // Insert custom prompts into 'prompts' table
          if (defaultPromptsList.length > 0) {
            await supabase.from('prompts').insert(
              defaultPromptsList.map((p) => ({
                event_id: eventUuid,
                label: p.label,
                icon: p.icon || '🌿',
              }))
            );
          }
        } else if (insertError) {
          console.warn('Supabase event insert failed:', insertError);
          triggerToast('Cloud sync notice', insertError.message);
        }
      } catch (err) {
        console.warn('createEvent Supabase exception:', err);
      }
    }

    const newEvent: EventItem = {
      id: eventUuid,
      title: data.title.trim(),
      date: data.date.trim() || '24 May 2026',
      venue: data.venue.trim() || 'The Glasshouse',
      code: rawCode,
      slug,
      coverUrl:
        data.coverUrl ||
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
      prompts: defaultPromptsList,
      votingPromptId: defaultPromptsList[0]?.id || '',
      createdAt: new Date().toISOString(),
      ownerId: hostUser?.id,
    };

    setEvents((prev) => [newEvent, ...prev]);
    setCurrentEventIdState(newEvent.id);
    triggerToast(`Created celebration "${newEvent.title}"!`, `Passcode: ${newEvent.code}`);
    return newEvent;
  };

  const updateEvent = async (id: string, updates: Partial<EventItem>) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    triggerToast('Event details updated');

    if (isSupabaseConfigured() && isUuid(id)) {
      try {
        const payload: any = {};
        if (updates.title) payload.title = updates.title;
        if (updates.date) payload.date = updates.date;
        if (updates.venue) payload.venue = updates.venue;
        if (updates.coverUrl) payload.cover_url = updates.coverUrl;
        if (updates.votingPromptId) payload.voting_prompt_id = updates.votingPromptId;
        await supabase.from('events').update(payload).eq('id', id);
      } catch (e) {
        console.warn('updateEvent error:', e);
      }
    }
  };

  const deleteEvent = async (id: string) => {
    if (events.length <= 1) {
      triggerToast('Cannot delete the only event');
      return;
    }
    const remaining = events.filter((e) => e.id !== id);
    setEvents(remaining);
    if (currentEventId === id) {
      setCurrentEventIdState(remaining[0].id);
    }
    triggerToast('Event deleted');

    if (isSupabaseConfigured() && isUuid(id)) {
      try {
        await deleteMediaFromR2({ eventId: id });
        await supabase.from('events').delete().eq('id', id);
      } catch (e) {
        console.warn('deleteEvent error:', e);
      }
    }
  };

  // Mini-Categories / Prompts Management for current event
  const addPrompt = async (label: string, icon = '🌿') => {
    if (!label.trim()) return;
    const promptId = crypto.randomUUID();
    const newPrompt: PromptItem = {
      id: promptId,
      label: label.trim(),
      icon,
    };

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== currentEvent.id) return ev;
        return {
          ...ev,
          prompts: [...(ev.prompts || []), newPrompt],
        };
      })
    );
    triggerToast(`Added category: "${label}"`, 'Immediately selectable by guests');

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      try {
        await supabase.from('prompts').insert([
          {
            id: promptId,
            event_id: currentEvent.id,
            label: label.trim(),
            icon,
          },
        ]);
      } catch (e) {
        console.warn('addPrompt db error:', e);
      }
    }
  };

  // Deletes a category AND permanently deletes every photo/video in it (DB rows, votes, R2 files)
  const deletePrompt = async (promptId: string) => {
    if (votingRound.isOpen && votingRound.promptId === promptId) {
      triggerToast('Close the live round first', 'This category is being voted on right now');
      return;
    }

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      // Find every post in this category from the database (not just what this screen has loaded)
      const { data: rows, error: findError } = await supabase
        .from('posts')
        .select('id')
        .eq('event_id', currentEvent.id)
        .eq('category_tag', promptId);
      if (findError) {
        triggerToast('Could not delete category', findError.message);
        return;
      }
      const postIds = (rows || []).map((r: { id: string }) => r.id);

      if (postIds.length > 0) {
        // Files first: the R2 route checks ownership against the rows, so they must still exist
        await deleteMediaFromR2({ postIds });
        const { error: deleteError } = await supabase.from('posts').delete().in('id', postIds);
        if (deleteError) {
          triggerToast('Could not delete the category’s photos', deleteError.message);
          return;
        }
      }
    }

    // Remove the deleted photos from every local view (gallery, slideshow, spotlight)
    const removedIds = new Set(
      memories.filter((m) => m.eventId === currentEvent.id && m.promptId === promptId).map((m) => m.id)
    );
    setMemories((prev) => prev.filter((m) => !(m.eventId === currentEvent.id && m.promptId === promptId)));
    if (spotlightId && removedIds.has(spotlightId)) setSpotlightId(null);

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== currentEvent.id) return ev;
        const updated = (ev.prompts || []).filter((p) => p.id !== promptId);
        return {
          ...ev,
          prompts: updated,
          votingPromptId:
            ev.votingPromptId === promptId
              ? updated[0]?.id || ''
              : ev.votingPromptId,
        };
      })
    );
    triggerToast(
      'Category deleted',
      removedIds.size > 0 ? `${removedIds.size} photos and videos permanently deleted` : undefined
    );

    if (isSupabaseConfigured() && isUuid(promptId)) {
      const { error } = await supabase.from('prompts').delete().eq('id', promptId);
      if (error) console.warn('deletePrompt db error:', error);
    }
  };

  // Host: open a voting round on the chosen category (optional time limit)
  const startVotingRound = async (promptId: string, durationMinutes: number | null) => {
    if (!promptId) {
      triggerToast('Pick a category for the round first');
      return;
    }
    const endsAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60_000).toISOString() : null;
    const patch = { votingOpen: true, votingEndsAt: endsAt, votingPromptId: promptId };
    setEvents((prev) => prev.map((ev) => (ev.id === currentEvent.id ? { ...ev, ...patch } : ev)));
    setNowMs(Date.now());
    triggerToast(
      'Live voting round started',
      durationMinutes ? `Guests can vote for ${durationMinutes} minutes` : 'Guests can vote until you close the round'
    );

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      const { error } = await supabase
        .from('events')
        .update({ voting_open: true, voting_ends_at: endsAt, voting_prompt_id: promptId })
        .eq('id', currentEvent.id);
      if (error) {
        console.warn('startVotingRound error:', error);
        triggerToast('Could not start the round', error.message);
        fetchEventsFromDb();
      }
    }
  };

  // Host: close the round and return the winning photo (most votes in the round's category)
  const closeVotingRound = async (): Promise<MemoryItem | null> => {
    const winner =
      publicMemories
        .filter((m) => m.promptId === votingRound.promptId)
        .sort((a, b) => b.votes - a.votes)[0] || null;

    setEvents((prev) =>
      prev.map((ev) => (ev.id === currentEvent.id ? { ...ev, votingOpen: false, votingEndsAt: null } : ev))
    );
    triggerToast(
      'Voting round closed',
      winner && winner.votes > 0 ? `Winner: "${winner.caption.slice(0, 40)}" by ${winner.guestName}` : 'No votes were cast'
    );

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      const { error } = await supabase
        .from('events')
        .update({ voting_open: false, voting_ends_at: null })
        .eq('id', currentEvent.id);
      if (error) {
        console.warn('closeVotingRound error:', error);
        triggerToast('Could not close the round', error.message);
        fetchEventsFromDb();
      }
    }
    return winner && winner.votes > 0 ? winner : null;
  };

  // Guest & Reaction Handlers
  const setGuestName = (name: string) => {
    setGuestNameState(name);
    setHasJoined(true);
    // Give this browser a stable guest id the first time the guest joins
    const id = guestId || crypto.randomUUID();
    if (!guestId) setGuestId(id);
    try {
      localStorage.setItem(STORAGE_KEY_GUEST, name);
      localStorage.setItem(STORAGE_KEY_GUEST_ID, id);
    } catch (e) {}
  };

  // Clears only the guest identity; a signed-in host session is left untouched
  const leaveAsGuest = () => {
    setGuestNameState('');
    setGuestId('');
    setHasJoined(false);
    try {
      localStorage.removeItem(STORAGE_KEY_GUEST);
      localStorage.removeItem(STORAGE_KEY_GUEST_ID);
    } catch (e) {}
  };

  const joinCelebration = async (nameInput: string) => {
    const clean = nameInput.trim() || 'Wedding Guest';
    // One role per browser: joining as a guest ends any host session first
    if (hostUser && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
      setHostUser(null);
    }
    setGuestName(clean);
    setGuestCount((c) => c + 1);
    triggerToast(`Welcome, ${clean}!`, 'Guest session active');
  };

  const switchEventByCode = (code: string): boolean => {
    const clean = code.trim().toUpperCase();
    if (!clean) return false;
    const found = events.find(
      (e) =>
        e.code.toUpperCase() === clean ||
        e.slug.toUpperCase() === clean ||
        e.id.toUpperCase() === clean
    );
    if (found) {
      setCurrentEventIdState(found.id);
      triggerToast(`Celebration switched to "${found.title}"`, `Passcode: ${found.code}`);
      return true;
    }
    triggerToast('Passcode not recognized', 'Please double check the code with the couple');
    return false;
  };

  const sendReaction = (emoji = '❤️') => {
    setReactionCount((c) => {
      const next = c + 1;
      try {
        localStorage.setItem(STORAGE_KEY_REACTIONS, String(next));
      } catch (e) {}
      return next;
    });

    showFloatingEmoji(emoji);

    // Share the tap live with every screen on this event (projector, slideshow, other guests).
    // Broadcast skips the database; throttled so rapid tapping can't flood the channel.
    const now = Date.now();
    if (eventChannelRef.current && now - lastReactionSentRef.current >= REACTION_BROADCAST_GAP_MS) {
      lastReactionSentRef.current = now;
      eventChannelRef.current.send({ type: 'broadcast', event: 'reaction', payload: { emoji } });
    }

    // Record reaction in Supabase
    if (isSupabaseConfigured()) {
      supabase
        .from('reactions')
        .insert([
          {
            reaction_type: emoji,
            event_id: isUuid(currentEvent.id) ? currentEvent.id : null,
            guest_id: hostUser?.id && isUuid(hostUser.id) ? hostUser.id : null,
          },
        ])
        .then();
    }
  };

  // Uploads local media to R2 when configured; remote URLs (presets) pass through unchanged
  const storeMedia = async (url: string, postId: string) => {
    if (!isR2PublicUrlConfigured() || !isUuid(currentEvent.id)) {
      return { url, key: null as string | null };
    }
    return uploadMediaToR2(url, currentEvent.id, postId);
  };

  // Memory Handlers
  const addMemory = async (newEntry: {
    type: 'photo' | 'video';
    url: string;
    caption: string;
    promptId: string;
    isPrivate?: boolean;
    duration?: string;
    guestName?: string;
  }) => {
    const finalAuthor = newEntry.guestName?.trim() || guestName || 'Wedding Guest';
    // Hosts posting from a guest page keep their host role; only guests update their saved name
    if (!hostUser && newEntry.guestName?.trim() && newEntry.guestName.trim() !== guestName) {
      setGuestName(newEntry.guestName.trim());
    }

    const memoryUuid = crypto.randomUUID();
    const eventIdVal = isUuid(currentEvent.id) ? currentEvent.id : null;

    const created: MemoryItem = {
      id: memoryUuid,
      eventId: currentEvent.id,
      guestName: finalAuthor,
      type: newEntry.type || 'photo',
      duration: newEntry.type === 'video' ? (newEntry.duration || '0:19') : undefined,
      url: newEntry.url,
      caption:
        newEntry.caption.trim() ||
        `Wishing ${currentEvent.title} a lifetime of quiet mornings and loud celebrations!`,
      subCaption:
        newEntry.type === 'video'
          ? 'Video well-wish uploaded by guest.'
          : 'Shared live from the wedding reception.',
      promptId: newEntry.promptId || prompts[0]?.id || 'fav-chapter',
      isPrivate: Boolean(newEntry.isPrivate),
      votes: 0,
      votedByMe: false,
      timestamp: 'Just now',
    };

    setMemories((prev) => [created, ...prev]);

    if (created.isPrivate) {
      triggerToast(
        'Saved to Couple’s Private Vault',
        'Visible only to hosts in Host Admin — hidden from public screens'
      );
    } else {
      sendReaction('✨');
      triggerToast(
        `New ${created.type} shared to Live Gallery & Projector`,
        `Categorised under "${getPrompt(created.promptId).label}"`
      );
    }

    // Upload the file to R2 first, then store only its URL/key in the database
    let stored: { url: string; key: string | null };
    try {
      stored = await storeMedia(newEntry.url, memoryUuid);
    } catch (err: any) {
      console.error('Media upload error:', err);
      setMemories((prev) => prev.filter((m) => m.id !== memoryUuid));
      triggerToast('Upload failed', err?.message || 'Please check your connection and try again');
      return;
    }
    if (stored.url !== newEntry.url) {
      setMemories((prev) => prev.map((m) => (m.id === memoryUuid ? { ...m, url: stored.url } : m)));
    }

    // Insert into Supabase 'posts' table
    if (isSupabaseConfigured()) {
      try {
        const { error: dbError } = await supabase.from('posts').insert([
          {
            id: memoryUuid,
            event_id: eventIdVal,
            guest_name: finalAuthor,
            guest_id: hostUser?.id && isUuid(hostUser.id) ? hostUser.id : null, // null safely bypasses foreign key check for guests
            file_url: stored.url,
            storage_key: stored.key,
            caption: created.caption,
            category_tag: created.promptId,
            media_type: created.type,
            video_duration: created.duration || null,
            is_private: created.isPrivate,
            is_spotlight: false,
          },
        ]);

        if (dbError) {
          console.error('Supabase posts insert error:', dbError);
          triggerToast('Database sync notice', dbError.message);
        }
      } catch (err) {
        console.error('addMemory Supabase error:', err);
      }
    }
  };

  const addMultipleMemories = async (entries: Array<{
    type: 'photo' | 'video';
    url: string;
    caption: string;
    promptId: string;
    isPrivate?: boolean;
    duration?: string;
    guestName?: string;
  }>) => {
    if (entries.length === 0) return;
    const firstCustomName = entries[0]?.guestName?.trim();
    const finalAuthor = firstCustomName || guestName || 'Wedding Guest';
    if (!hostUser && firstCustomName && firstCustomName !== guestName) {
      setGuestName(firstCustomName);
    }

    const eventIdVal = isUuid(currentEvent.id) ? currentEvent.id : null;

    const createdList: MemoryItem[] = entries.map((newEntry, idx) => ({
      id: crypto.randomUUID(),
      eventId: currentEvent.id,
      guestName: newEntry.guestName?.trim() || finalAuthor,
      type: newEntry.type || 'photo',
      duration: newEntry.type === 'video' ? (newEntry.duration || '0:19') : undefined,
      url: newEntry.url,
      caption:
        newEntry.caption.trim() ||
        `Wishing ${currentEvent.title} a lifetime of quiet mornings and loud celebrations!`,
      subCaption:
        newEntry.type === 'video'
          ? 'Video well-wish uploaded by guest.'
          : 'Shared live from the wedding reception.',
      promptId: newEntry.promptId || prompts[0]?.id || 'fav-chapter',
      isPrivate: Boolean(newEntry.isPrivate),
      votes: 0,
      votedByMe: false,
      timestamp: 'Just now',
    }));

    setMemories((prev) => [...createdList, ...prev]);

    const hasPrivate = createdList.some((c) => c.isPrivate);
    const hasPublic = createdList.some((c) => !c.isPrivate);

    if (hasPublic) {
      sendReaction('✨');
    }

    if (hasPrivate && !hasPublic) {
      triggerToast(
        `Saved ${createdList.length} items to Couple’s Private Vault`,
        'Visible only to hosts in Host Admin'
      );
    } else {
      triggerToast(
        `Added ${createdList.length} ${createdList.length === 1 ? 'memory' : 'memories'} to Live Gallery & Projector`,
        `Shared live to ${currentEvent.title}`
      );
    }

    // Upload all files to R2 in parallel; drop any that fail
    const results = await Promise.allSettled(createdList.map((c) => storeMedia(c.url, c.id)));
    const storedById = new Map<string, { url: string; key: string | null }>();
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') storedById.set(createdList[i].id, r.value);
      else console.error('Media upload error:', r.reason);
    });
    const failedCount = createdList.length - storedById.size;
    setMemories((prev) =>
      prev
        .filter((m) => !createdList.some((c) => c.id === m.id) || storedById.has(m.id))
        .map((m) => (storedById.has(m.id) ? { ...m, url: storedById.get(m.id)!.url } : m))
    );
    if (failedCount > 0) {
      triggerToast(
        `${failedCount} of ${createdList.length} uploads failed`,
        'Please check your connection and try those again'
      );
    }
    const uploadedList = createdList.filter((c) => storedById.has(c.id));

    // Insert batch into Supabase
    if (isSupabaseConfigured() && uploadedList.length > 0) {
      try {
        await supabase.from('posts').insert(
          uploadedList.map((c) => ({
            id: c.id,
            event_id: eventIdVal,
            guest_name: c.guestName,
            guest_id: hostUser?.id && isUuid(hostUser.id) ? hostUser.id : null,
            file_url: storedById.get(c.id)!.url,
            storage_key: storedById.get(c.id)!.key,
            caption: c.caption,
            category_tag: c.promptId,
            media_type: c.type,
            video_duration: c.duration || null,
            is_private: c.isPrivate,
            is_spotlight: false,
          }))
        );
      } catch (err) {
        console.error('addMultipleMemories Supabase error:', err);
      }
    }
  };

  // Returns this browser's voter id, creating a guest id if a guest votes before joining
  const ensureVoterId = (): string => {
    if (hostUser?.id) return hostUser.id;
    if (guestId) return guestId;
    const id = crypto.randomUUID();
    setGuestId(id);
    voterIdRef.current = id;
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_ID, id);
    } catch (e) {}
    return id;
  };

  // One vote per person per post: the database toggles only this voter's own vote
  const toggleVote = async (memoryId: string) => {
    const target = memories.find((m) => m.id === memoryId);
    if (!target) return;
    if (!canVoteOn(target)) {
      triggerToast(
        votingRound.isActive ? 'This photo isn’t in the live round' : 'Voting isn’t open right now',
        votingRound.isActive
          ? `Vote for photos in "${getPrompt(votingRound.promptId).label}"`
          : 'The hosts will open a live voting round soon'
      );
      return;
    }
    const nextVoted = !target.votedByMe;

    // Optimistic update; corrected below with the server's answer
    const applyVote = (voted: boolean, votes: number) =>
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? { ...m, votedByMe: voted, votes } : m)));
    applyVote(nextVoted, nextVoted ? target.votes + 1 : Math.max(0, target.votes - 1));
    if (nextVoted) sendReaction('🥂');

    if (!isSupabaseConfigured() || !isUuid(memoryId)) return;

    const { data, error } = await supabase.rpc('toggle_vote', {
      p_post_id: memoryId,
      p_voter_id: ensureVoterId(),
    });
    if (error || !data) {
      console.warn('toggleVote error:', error);
      applyVote(target.votedByMe ?? false, target.votes);
      triggerToast('Vote not saved', error?.message || 'Please check your connection and try again');
      return;
    }
    applyVote(Boolean(data.voted), Number(data.votes) || 0);
  };

  const toggleSpotlight = async (memoryId: string) => {
    const target = eventMemories.find((m) => m.id === memoryId);
    if (!target) return;
    if (target.isPrivate) {
      triggerToast('Cannot spotlight a Private Vault photo', 'Make it public first');
      return;
    }

    const nextSpotlight = spotlightId === memoryId ? null : memoryId;
    setSpotlightId(nextSpotlight);

    if (nextSpotlight) {
      triggerToast(
        `Spotlighted "${target.caption.slice(0, 32)}..."`,
        'Locked onto Live Slideshow & Projector Screen'
      );
    } else {
      triggerToast('Spotlight released', 'Resumed auto-rolling slideshow');
    }

    if (isSupabaseConfigured() && isUuid(memoryId)) {
      try {
        if (isUuid(currentEvent.id)) {
          // Only clear the currently spotlighted post so we don't rewrite (and broadcast) every row
          await supabase
            .from('posts')
            .update({ is_spotlight: false })
            .eq('event_id', currentEvent.id)
            .eq('is_spotlight', true);
        }
        if (nextSpotlight) {
          await supabase.from('posts').update({ is_spotlight: true }).eq('id', memoryId);
        }
      } catch (e) {
        console.warn('toggleSpotlight db error:', e);
      }
    }
  };

  // Unpins the spotlight on every screen (synced via the database) and resumes auto-play
  const resumeSlideshow = async () => {
    setSpotlightId(null);
    setIsSlideshowPlaying(true);
    triggerToast('Slideshow resumed', 'Live screens are rolling through memories again');

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      try {
        await supabase
          .from('posts')
          .update({ is_spotlight: false })
          .eq('event_id', currentEvent.id)
          .eq('is_spotlight', true);
      } catch (e) {
        console.warn('resumeSlideshow db error:', e);
      }
    }
  };

  const cycleNextSlide = () => {
    if (spotlightId) {
      // Advancing from a pinned photo also releases it on every screen
      resumeSlideshow();
    }
    setCurrentSlideIdx((prev) => (prev + 1) % Math.max(1, publicMemories.length));
    triggerToast('Advanced to next memory on live screen');
  };

  const cyclePrevSlide = () => {
    setSpotlightId(null);
    setCurrentSlideIdx((prev) => (prev - 1 + Math.max(1, publicMemories.length)) % Math.max(1, publicMemories.length));
  };

  const togglePrivacy = async (memoryId: string) => {
    const target = memories.find((m) => m.id === memoryId);
    if (!target) return;
    const nextPriv = !target.isPrivate;

    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== memoryId) return m;
        if (nextPriv && spotlightId === memoryId) {
          setSpotlightId(null);
        }
        return { ...m, isPrivate: nextPriv };
      })
    );

    triggerToast(
      nextPriv ? 'Moved to Couple’s Private Vault' : 'Restored to Public Slideshow',
      nextPriv ? 'Hidden from guest gallery & projector' : 'Now visible on live screens'
    );

    if (isSupabaseConfigured() && isUuid(memoryId)) {
      try {
        await supabase.from('posts').update({ is_private: nextPriv }).eq('id', memoryId);
        if (nextPriv) {
          eventChannelRef.current?.send({ type: 'broadcast', event: 'post-hidden', payload: { id: memoryId } });
        }
      } catch (e) {
        console.warn('togglePrivacy db error:', e);
      }
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (spotlightId === memoryId) setSpotlightId(null);
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    triggerToast('Memory deleted by host moderation');

    if (isSupabaseConfigured() && isUuid(memoryId)) {
      try {
        await deleteMediaFromR2({ postIds: [memoryId] });
        await supabase.from('posts').delete().eq('id', memoryId);
      } catch (e) {
        console.warn('deleteMemory db error:', e);
      }
    }
  };

  const deleteMultipleMemories = async (ids: string[]) => {
    const idSet = new Set(ids);
    if (spotlightId && idSet.has(spotlightId)) setSpotlightId(null);
    setMemories((prev) => prev.filter((m) => !idSet.has(m.id)));
    triggerToast(`Deleted ${ids.length} memories`, 'Removed from gallery and projector');

    if (isSupabaseConfigured()) {
      const validUuids = ids.filter(isUuid);
      if (validUuids.length > 0) {
        try {
          await deleteMediaFromR2({ postIds: validUuids });
          await supabase.from('posts').delete().in('id', validUuids);
        } catch (e) {
          console.warn('deleteMultipleMemories db error:', e);
        }
      }
    }
  };

  // Downloads
  const downloadSingle = async (memory: MemoryItem) => {
    triggerToast(`Downloading photo by ${memory.guestName}...`);
    return await downloadSinglePhoto(memory);
  };

  const exportAllZip = async () => {
    if (eventMemories.length === 0) {
      triggerToast('No memories to export yet', 'Upload photos first before downloading ZIP');
      return false;
    }
    triggerToast('Packaging ZIP download for this event...');
    const safeTitle = currentEvent.title.replace(/[^A-Za-z0-9]/g, '_');
    return await downloadMemoriesZip(
      eventMemories,
      `${safeTitle}_Wedding_Memories.zip`,
      undefined,
      { title: currentEvent.title, date: currentEvent.date }
    );
  };

  const exportSelectedZip = async (selectedIds: string[]) => {
    const subset = eventMemories.filter((m) => selectedIds.includes(m.id));
    if (subset.length === 0) return false;
    triggerToast(`Packaging ${subset.length} photos into ZIP archive...`);
    const safeTitle = currentEvent.title.replace(/[^A-Za-z0-9]/g, '_');
    return await downloadMemoriesZip(
      subset,
      `${safeTitle}_Selected_${subset.length}_Photos.zip`,
      undefined,
      { title: currentEvent.title, date: currentEvent.date }
    );
  };

  return (
    <EventContext.Provider
      value={{
        isHostLoggedIn: Boolean(hostUser),
        isAuthLoading,
        hostUser,
        loginWithGoogle,
        loginHostWithPassword,
        signUpHostWithPassword,
        logoutHost,
        events,
        eventsLoaded,
        hostEvents,
        currentEvent,
        getEventById,
        setCurrentEventId,
        createEvent,
        updateEvent,
        deleteEvent,
        guestId,
        guestName,
        hasJoined,
        setGuestName,
        leaveAsGuest,
        guestCount,
        reactionCount,
        memories: eventMemories,
        prompts,
        publicMemories,
        privateMemories,
        getPrompt,
        addPrompt,
        deletePrompt,
        joinCelebration,
        switchEventByCode,
        addMemory,
        addMultipleMemories,
        toggleVote,
        togglePrivacy,
        toggleSpotlight,
        resumeSlideshow,
        deleteMemory,
        deleteMultipleMemories,
        spotlightId,
        setSpotlightId,
        currentSlideIdx,
        setCurrentSlideIdx,
        isSlideshowPlaying,
        setIsSlideshowPlaying,
        activeSlideMemory,
        cycleNextSlide,
        cyclePrevSlide,
        votingRound,
        canVoteOn,
        startVotingRound,
        closeVotingRound,
        floatingEmojis,
        sendReaction,
        toast,
        triggerToast,
        isZipModalOpen,
        setIsZipModalOpen,
        downloadSingle,
        exportAllZip,
        exportSelectedZip,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}

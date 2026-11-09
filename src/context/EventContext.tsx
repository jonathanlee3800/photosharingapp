'use client';

import { usePathname } from 'next/navigation';

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
import { generateUUID } from '@/lib/uuid';
import { formatPin } from '@/lib/pin';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  deleteMediaFromR2,
  isR2PublicUrlConfigured,
  mediaUrlFromKey,
  uploadMediaToR2,
} from '@/lib/mediaUpload';
import { reactionsChannelName, sendReactionToProjector } from '@/lib/reactions';

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
  // When the host last closed a round (null while a round is open or none has run)
  closedAt: string | null;
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
  // Fetches one event by PIN or id and makes it the current event; null if there's no such event
  lookupEvent: (code: string) => Promise<EventItem | null>;
  setCurrentEventId: (id: string, silent?: boolean) => void;
  createEvent: (data: {
    id?: string;
    title: string;
    date: string;
    venue?: string;
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
  refreshPosts: () => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<void>;
  deleteMultipleMemories: (ids: string[]) => Promise<void>;

  // Slideshow & Spotlight
  spotlightId: string | null;
  setSpotlightId: (id: string | null) => void;
  currentSlideIdx: number;
  isSlideshowPlaying: boolean;
  toggleSlideshowPlaying: () => void;
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

const STORAGE_KEY_EVENTS = 'withlove_events_v3';
const STORAGE_KEY_CURRENT_EVENT_ID = 'withlove_current_event_id';
const STORAGE_KEY_MEMORIES = 'withlove_memories_v3';
const STORAGE_KEY_GUEST = 'withlove_guest_name';
const STORAGE_KEY_GUEST_ID = 'withlove_guest_id';
// Legacy cached host session; no longer trusted, only cleared on load
const STORAGE_KEY_HOST_AUTH = 'withlove_host_user_auth';
const STORAGE_KEY_REACTIONS = 'withlove_reactions_count';
// The host account this browser's stored data belongs to, so a new login starts clean
const STORAGE_KEY_SIGNED_IN_AS = 'withlove_signed_in_as';

// Minimum gap between emoji sends from one screen (taps in between still show locally)
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

// How long each photo shows in the slideshow
const SLIDE_MS = 5500;

const DEFAULT_COVER_URL =
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85';

// Converts an event (a host's row, or what guests get from get_event_for_guest) into an EventItem
const mapDbEvent = (e: any): EventItem => ({
  id: e.id,
  title: e.title,
  date: e.date || '24 May 2026',
  venue: e.venue || '',
  code: e.join_code,
  slug: e.slug || e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  coverUrl: e.cover_url || DEFAULT_COVER_URL,
  prompts:
    e.prompts && e.prompts.length > 0
      ? e.prompts.map((p: any) => ({ id: p.id, label: p.label, icon: p.icon || '🌿' }))
      : INITIAL_PROMPTS,
  votingPromptId: e.voting_prompt_id || '',
  createdAt: e.created_at,
  ownerId: e.owner_id,
  votingOpen: Boolean(e.voting_open),
  votingEndsAt: e.voting_ends_at || null,
  votingClosedAt: e.voting_closed_at || null,
  roundVoteTotal: Number(e.round_vote_total) || 0,
  slideshowAnchorAt: e.slideshow_anchor_at || null,
  slideshowAnchorIndex: Number(e.slideshow_anchor_index) || 0,
  slideshowPaused: Boolean(e.slideshow_paused),
});

// Adds or refreshes one event, keeping the owner id (only a host's own query includes it) and dropping the sample event
const mergeEvent = (events: EventItem[], incoming: EventItem): EventItem[] => {
  const existing = events.find((e) => e.id === incoming.id);
  const merged = { ...incoming, ownerId: incoming.ownerId ?? existing?.ownerId };
  const others = events.filter((e) => e.id !== incoming.id && e.id !== INITIAL_EVENTS[0].id);
  return [merged, ...others];
};

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
  createdAt: p.created_at,
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
  const [guestCount, setGuestCount] = useState<number>(0);
  const [reactionCount, setReactionCount] = useState<number>(0);

  // Memories State
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);

  // Spotlight & Slideshow
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  // Reactions, Toasts, ZIP Modal
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const pathname = usePathname() || '';
  const isProjectorScreen = pathname.endsWith('/projector');
  const isGuestArea = pathname.startsWith('/user');
  // Supabase bills one message per subscribed client, shown or not, so each screen subscribes only to what it displays.
  // Only pages showing the photo feed subscribe to it; the guest home and upload pages don't.
  // Round start and close reach every guest page on a separate channel.
  const showsPostFeed = /\/(gallery|vote|slideshow|projector)$/.test(pathname);
  // Only the host dashboard gets per-photo votes live. The projector gets just the round's total, and
  // guests get per-photo votes when the round ends.
  const isHostDashboard = Boolean(hostUser) && !isProjectorScreen;
  const lastReactionSentRef = useRef(0);

  // Floats an emoji up the screen for ~2.6s (the sender's own taps, and everyone's on the projector)
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

  // A host loads only their own events
  const fetchHostEvents = useCallback(async (ownerId: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, prompts(*)')
        .eq('owner_id', ownerId);
      if (error) {
        console.warn('Error fetching events from Supabase:', error);
        return;
      }
      const mapped: EventItem[] = (data || []).map(mapDbEvent);
      const ownIds = new Set(mapped.map((e) => e.id));
      // Drop anything stored from another host account. Events without an owner are ones this
      // browser opened by PIN, kept so a host can still view a guest link.
      setEvents((prev) => [
        ...mapped,
        ...prev.filter((e) => !ownIds.has(e.id) && !e.ownerId && e.id !== INITIAL_EVENTS[0].id),
      ]);
    } catch (err) {
      console.warn('Error fetching events from Supabase:', err);
    } finally {
      setEventsLoaded(true);
    }
  }, []);

  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const bestClockSampleMsRef = useRef(Infinity);

  // Everyone else gets one event at a time, by its PIN or id
  const loadEvent = useCallback(async (code: string): Promise<EventItem | null> => {
    if (!isSupabaseConfigured()) return null;
    const startedAt = Date.now();
    const { data, error } = await supabase.rpc('get_event_for_guest', { p_code: code });
    const finishedAt = Date.now();
    // Keep the measurement from the fastest response, as it's the most accurate
    if (data?.server_now && finishedAt - startedAt < bestClockSampleMsRef.current) {
      bestClockSampleMsRef.current = finishedAt - startedAt;
      setClockOffsetMs(new Date(data.server_now).getTime() + (finishedAt - startedAt) / 2 - finishedAt);
    }
    if (error) {
      console.warn('Error loading event:', error);
      return null;
    }
    if (!data) {
      // No such event any more: don't keep showing a cached copy
      setEvents((prev) => prev.filter((e) => e.code !== code && e.id !== code));
      return null;
    }
    const event = mapDbEvent(data);
    setEvents((prev) => mergeEvent(prev, event));
    return event;
  }, []);

  const lookupEvent = useCallback(
    async (code: string) => {
      const event = await loadEvent(code);
      if (event) setCurrentEventIdState(event.id);
      setEventsLoaded(true);
      return event;
    },
    [loadEvent]
  );

  // Identity used for "one vote per person per post": the host's auth id, else this browser's guest id
  const voterIdRef = useRef('');
  voterIdRef.current = hostUser?.id || guestId;

  // Fetch one event's posts and replace that event's slice of the cache (other events stay cached).
  // Cached posts render immediately; this refresh swaps in the latest rows (stale-while-revalidate).
  // Returns true if per-photo votes were withheld because the round is still live.
  const isHostDashboardRef = useRef(false);
  isHostDashboardRef.current = isHostDashboard;
  const fetchPostsForEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || !isUuid(eventId)) return false;
    try {
      let dbPosts: any[] = [];
      let votesHidden = false;
      if (isHostDashboardRef.current) {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (error) {
          console.warn('Error fetching posts from Supabase:', error);
          return false;
        }
        dbPosts = data || [];
      } else {
        const { data, error } = await supabase.rpc('get_event_posts', { p_event_id: eventId });
        if (error) {
          console.warn('Error fetching posts from Supabase:', error);
          return false;
        }
        dbPosts = data?.posts || [];
        votesHidden = Boolean(data?.votes_hidden);
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
      return votesHidden;
    } catch (err) {
      console.warn('Error fetching posts from Supabase:', err);
      return false;
    }
  }, []);

  // 1. Initial Load from LocalStorage (fast fallback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Host identity now comes only from Supabase Auth; drop any stale cached copy
      localStorage.removeItem(STORAGE_KEY_HOST_AUTH);
      // Older versions cached every host's events and posts on each phone
      localStorage.removeItem('withlove_events_v2');
      localStorage.removeItem('withlove_memories_v2');

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

  // Switching role, or logging out, leaves nothing from the previous role in the browser: the app's
  // stored data is emptied and what's on screen is reset. Someone on a guest page keeps that one
  // event's public view. Only a full logout empties all storage: at a login, the sign-in in progress
  // must be left alone.
  const joiningAsGuestRef = useRef(false);
  const currentEventIdRef = useRef(currentEventId);
  currentEventIdRef.current = currentEventId;
  const signedInAsRef = useRef<string | null>(null);
  const clearBrowserData = useCallback((scope: 'everything' | 'app-data' = 'everything') => {
    signedInAsRef.current = null;
    try {
      if (scope === 'everything') {
        localStorage.clear();
        sessionStorage.clear();
      } else {
        for (const storage of [localStorage, sessionStorage]) {
          Object.keys(storage)
            .filter((key) => key.startsWith('withlove_'))
            .forEach((key) => storage.removeItem(key));
        }
      }
    } catch (e) {}
    const onGuestPage = window.location.pathname.startsWith('/user');
    const keepId = currentEventIdRef.current;
    setEvents((prev) => {
      const kept = onGuestPage ? prev.filter((e) => e.id === keepId).map((e) => ({ ...e, ownerId: undefined })) : [];
      return kept.length > 0 ? kept : INITIAL_EVENTS;
    });
    setMemories((prev) => (onGuestPage ? prev.filter((m) => m.eventId === keepId && !m.isPrivate) : []));
    if (!onGuestPage) setCurrentEventIdState(INITIAL_EVENTS[0].id);
    setGuestNameState('');
    setGuestId('');
    setHasJoined(false);
    setReactionCount(0);
    setSpotlightId(null);
  }, []);

  // 2. Supabase Auth State Synchronization & Initial DB Pull
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // One role per browser: an active host session always replaces the guest identity
    // (covers email login, sign up and the Google OAuth redirect).
    const applySession = (session: { user: any } | null) => {
      if (session?.user) {
        // A different person's data may be stored here: start clean, once per login (this runs on
        // every page load and token refresh, which must not wipe the host's own data)
        if (signedInAsRef.current !== session.user.id) {
          let storedAs: string | null = session.user.id;
          try {
            storedAs = localStorage.getItem(STORAGE_KEY_SIGNED_IN_AS);
          } catch (e) {}
          if (storedAs !== session.user.id) clearBrowserData('app-data');
          signedInAsRef.current = session.user.id;
          try {
            localStorage.setItem(STORAGE_KEY_SIGNED_IN_AS, session.user.id);
          } catch (e) {}
        }
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session);
      if (event === 'SIGNED_OUT' && !joiningAsGuestRef.current) clearBrowserData();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // A logged-in host loads their own events; guest pages load theirs by PIN (see lookupEvent)
  const hostUserId = hostUser?.id;
  useEffect(() => {
    if (!isSupabaseConfigured() || isAuthLoading) return;
    if (hostUserId) {
      fetchHostEvents(hostUserId);
      return;
    }
    // Signed out: don't keep a host's events on this device, except the one open on a guest page,
    // which stays as a plain guest view instead of suddenly showing "Event Not Found"
    setEvents((prev) =>
      prev
        .filter((e) => !e.ownerId || (isGuestArea && e.id === currentEventIdRef.current))
        .map((e) => (e.ownerId ? { ...e, ownerId: undefined } : e))
    );
    if (!isGuestArea) setEventsLoaded(true);
  }, [hostUserId, isAuthLoading, isGuestArea, fetchHostEvents]);

  // Phones pause the live connection while the screen is locked or the browser is in the background.
  // When the guest comes back, re-fetch so anything missed (new photos, a round opening or closing) shows up.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !isUuid(currentEventId)) return;
      if (currentEventId === INITIAL_EVENTS[0].id) return;
      if (!isGuestArea && !hostUserId) return;
      loadEvent(currentEventId);
      fetchPostsForEvent(currentEventId);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadEvent, fetchPostsForEvent, currentEventId, isGuestArea, hostUserId]);

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
    // Join code first (what guests use), so a title slug like "12345" can never shadow another event's code
    return (
      events.find((e) => e.code.toLowerCase() === clean) ||
      events.find((e) => e.id.toLowerCase() === clean) ||
      events.find((e) => e.slug.toLowerCase() === clean)
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
  const isRealEvent = currentEvent.id !== INITIAL_EVENTS[0].id && isUuid(currentEvent.id);
  const watchesCurrentEvent = isRealEvent && (isGuestArea || Boolean(hostUserId));

  // Round start/close and event details, for this event only. Applied from the message itself,
  // so nobody re-downloads anything. On (re)connect, catch up on what was missed.
  useEffect(() => {
    if (!isSupabaseConfigured() || !watchesCurrentEvent) return;
    const eventId = currentEvent.id;
    const channel = supabase
      .channel(`event-updates-${eventId}`)
      .on('broadcast', { event: 'event-updated' }, ({ payload }) => {
        if (payload?.id === eventId) setEvents((prev) => mergeEvent(prev, mapDbEvent(payload)));
      })
      .on('broadcast', { event: 'event-deleted' }, ({ payload }) => {
        if (payload?.id === eventId) loadEvent(eventId);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') loadEvent(eventId);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [watchesCurrentEvent, currentEvent.id, loadEvent]);

  // The projector's running total. The message only ever holds the total, never per-photo votes.
  useEffect(() => {
    if (!isSupabaseConfigured() || !isProjectorScreen || !isRealEvent) return;
    const eventId = currentEvent.id;
    const channel = supabase
      .channel(`event-votes-${eventId}`)
      .on('broadcast', { event: 'round-total' }, ({ payload }) => {
        const total = Number(payload?.total);
        if (Number.isFinite(total)) {
          setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, roundVoteTotal: total } : e)));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isProjectorScreen, isRealEvent, currentEvent.id]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !isRealEvent) return;
    const eventId = currentEvent.id;

    // No live photo feed on this page: load the posts once (the round pop-ups still need them)
    if (!isHostDashboard && !showsPostFeed) {
      if (isGuestArea) fetchPostsForEvent(eventId);
      return;
    }

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
                // Feed messages carry no votes, so a missing count means "unchanged"
                votes: row.votes_count === undefined ? m.votes : incoming.votes,
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

    // The host dashboard reads its own rows live, including private photos and every vote
    if (isHostDashboard) {
      const hostChannel = supabase
        .channel(`event-host-${eventId}`)
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') fetchPostsForEvent(eventId);
        });
      return () => {
        supabase.removeChannel(hostChannel);
      };
    }

    // Everyone else gets this event's photo feed from the database, with no votes in it.
    // Photos always load from our own storage (from storage_key), never from an address in the message.
    const applyFeedPost = (row: any) => {
      if (row?.event_id === eventId && row?.storage_key) upsertPost(row);
    };
    const feedChannel = supabase
      .channel(`event-feed-${eventId}`)
      .on('broadcast', { event: 'post-added' }, ({ payload }) => applyFeedPost(payload))
      .on('broadcast', { event: 'post-changed' }, ({ payload }) => applyFeedPost(payload))
      .on('broadcast', { event: 'post-removed' }, ({ payload }) => {
        if (payload?.id) removePost(payload.id);
      })
      .subscribe((status) => {
        // Load (or refresh) this event's posts once live updates are flowing, so nothing is missed
        // between the fetch and the subscription. Also re-syncs after a dropped connection reconnects.
        if (status === 'SUBSCRIBED') fetchPostsForEvent(eventId);
      });
    return () => {
      supabase.removeChannel(feedChannel);
    };
  }, [isRealEvent, currentEvent.id, isHostDashboard, showsPostFeed, isGuestArea, fetchPostsForEvent]);

  // Only the projector listens for emoji reactions; guest phones never join this channel (see lib/reactions)
  useEffect(() => {
    if (!isProjectorScreen || !isSupabaseConfigured() || !isUuid(currentEvent.id)) return;
    const channel = supabase
      .channel(reactionsChannelName(currentEvent.id))
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const emoji = payload?.emoji;
        if (typeof emoji === 'string' && emoji.length > 0 && emoji.length <= 8) showFloatingEmoji(emoji);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isProjectorScreen, currentEvent.id, showFloatingEmoji]);

  // Filter memories for the current event
  const eventMemories = memories.filter(
    (m) => !m.eventId || m.eventId === currentEvent.id
  );

  // Newest first in the same order on every screen, which the shared slideshow depends on
  const publicMemories = eventMemories
    .filter((m) => !m.isPrivate)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || a.id.localeCompare(b.id));
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
  // A timed round closes itself when its timer runs out, with no host action or database write needed:
  // every screen works it out from the saved end time, and the server already refuses late votes.
  const timerRanOut = Boolean(currentEvent.votingOpen) && secondsLeft === 0;
  const roundIsOpen = Boolean(currentEvent.votingOpen) && !timerRanOut;
  const votingRound: VotingRound = {
    isOpen: roundIsOpen,
    isActive: roundIsOpen,
    promptId: currentEvent.votingPromptId || prompts[0]?.id || '',
    endsAt: votingEndsAt,
    secondsLeft,
    closedAt: currentEvent.votingClosedAt || (timerRanOut ? votingEndsAt : null),
  };

  // Reloads the current event's posts, for moments that need exact numbers (the winner reveal)
  // The server releases per-photo votes the moment the round ends. A phone whose clock runs slightly
  // fast can ask a moment too early, so try again rather than showing "no votes".
  const refreshPosts = useCallback(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const stillHidden = await fetchPostsForEvent(currentEvent.id);
      if (!stillHidden) return;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }, [fetchPostsForEvent, currentEvent.id]);

  // The projector goes back to each photo's own votes when a round ends, so get them
  const roundClosedAt = votingRound.closedAt;
  useEffect(() => {
    if (!isProjectorScreen || !roundClosedAt) return;
    const timer = setTimeout(refreshPosts, 1500);
    return () => clearTimeout(timer);
  }, [isProjectorScreen, roundClosedAt, refreshPosts]);

  // Votes are only allowed on photos in the live round's category
  const canVoteOn = (memory: MemoryItem) =>
    votingRound.isActive && !memory.isPrivate && memory.promptId === votingRound.promptId;

  // Shared slideshow: every screen works out the same position from the server's clock, so a playing
  // slideshow stays in step with no messages. Only the host's skip and pause change the event.
  const slideshowPaused = Boolean(currentEvent.slideshowPaused);
  const isSlideshowPlaying = !slideshowPaused;
  const slideAnchorIndex = currentEvent.slideshowAnchorIndex || 0;
  const slideAnchorMs = currentEvent.slideshowAnchorAt ? new Date(currentEvent.slideshowAnchorAt).getTime() : 0;
  const computeSlidePosition = useCallback(
    () =>
      slideshowPaused
        ? slideAnchorIndex
        : slideAnchorIndex + Math.floor((Date.now() + clockOffsetMs - slideAnchorMs) / SLIDE_MS),
    [slideshowPaused, slideAnchorIndex, slideAnchorMs, clockOffsetMs]
  );
  const [slidePosition, setSlidePosition] = useState(0);
  const slideCount = publicMemories.length;
  useEffect(() => {
    setSlidePosition(computeSlidePosition());
    if (slideshowPaused || slideCount === 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      // Wake exactly when the next slide is due, rather than counting from when this screen opened
      const intoSlide = ((Date.now() + clockOffsetMs - slideAnchorMs) % SLIDE_MS + SLIDE_MS) % SLIDE_MS;
      timer = setTimeout(() => {
        setSlidePosition(computeSlidePosition());
        scheduleNext();
      }, SLIDE_MS - intoSlide + 5);
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, [computeSlidePosition, slideshowPaused, slideCount, clockOffsetMs, slideAnchorMs]);
  const currentSlideIdx = slideCount > 0 ? ((slidePosition % slideCount) + slideCount) % slideCount : 0;

  // Host only: save a new position (the database's rules refuse anyone else, and it reaches every screen)
  const saveSlideshow = (position: number, paused: boolean) => {
    const anchorAt = new Date(Date.now() + clockOffsetMs).toISOString();
    const anchorIndex = slideCount > 0 ? ((position % slideCount) + slideCount) % slideCount : 0;
    const patch = { slideshowAnchorAt: anchorAt, slideshowAnchorIndex: anchorIndex, slideshowPaused: paused };
    setEvents((prev) => prev.map((ev) => (ev.id === currentEvent.id ? { ...ev, ...patch } : ev)));
    if (!isSupabaseConfigured() || !isUuid(currentEvent.id)) return;
    supabase
      .from('events')
      .update({ slideshow_anchor_at: anchorAt, slideshow_anchor_index: anchorIndex, slideshow_paused: paused })
      .eq('id', currentEvent.id)
      .then(({ error }) => {
        if (error) {
          console.warn('Slideshow update error:', error);
          triggerToast('Could not update the slideshow', error.message);
          if (hostUser) fetchHostEvents(hostUser.id);
        }
      });
  };

  const toggleSlideshowPlaying = () => saveSlideshow(computeSlidePosition(), isSlideshowPlaying);

  const activeSlideMemory =
    eventMemories.find((m) => m.id === spotlightId && !m.isPrivate) ||
    publicMemories[currentSlideIdx % Math.max(1, publicMemories.length)] ||
    eventMemories[0] || {
      id: 'empty',
      guestName: 'Memorie Aisle',
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
    setHostUser(null);
    // Also runs from the sign-out event above; repeated here in case that event doesn't arrive
    clearBrowserData();
    triggerToast('Logged out of Host Admin');
  };

  // Event Creation
  const createEvent = async (data: {
    id?: string;
    title: string;
    date: string;
    venue?: string;
    coverUrl?: string;
    initialPrompts?: PromptItem[];
  }): Promise<EventItem> => {
    // The 6-digit event PIN is assigned by the database and can't be chosen or changed
    let joinCode = '';
    const slug =
      data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
      'wedding-event';

    let defaultPromptsList =
      data.initialPrompts && data.initialPrompts.length > 0
        ? data.initialPrompts
        : INITIAL_PROMPTS;

    let eventUuid = data.id && isUuid(data.id) ? data.id : generateUUID();
    let finalCoverUrl = data.coverUrl || DEFAULT_COVER_URL;

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
              venue: data.venue?.trim() || '',
              slug,
              // An uploaded cover is stored in R2 just below; the database only keeps its address
              cover_url: data.coverUrl && !data.coverUrl.startsWith('data:') ? data.coverUrl : DEFAULT_COVER_URL,
              owner_id: hostUser.id,
            },
          ])
          .select()
          .single();

        if (insertError || !dbEvent) {
          console.warn('Supabase event insert failed:', insertError);
          triggerToast('Could not create the event', insertError?.message || 'Please try again');
          throw new Error(insertError?.message || 'Event insert failed');
        }

        eventUuid = dbEvent.id;
        joinCode = dbEvent.join_code;
        finalCoverUrl = dbEvent.cover_url;
        if (data.coverUrl?.startsWith('data:')) {
          try {
            const stored = await uploadMediaToR2(data.coverUrl, eventUuid, generateUUID());
            const { error: coverError } = await supabase.from('events').update({ cover_url: stored.url }).eq('id', eventUuid);
            if (coverError) throw coverError;
            finalCoverUrl = stored.url;
          } catch (coverErr) {
            console.warn('Cover upload failed:', coverErr);
            triggerToast('Could not upload the cover image', 'Your event was created with the default cover');
          }
        }
        // Save the starter categories and use their real ids (so uploads are tagged with real categories)
        if (defaultPromptsList.length > 0) {
          const { data: savedPrompts, error: promptsError } = await supabase
            .from('prompts')
            .insert(
              defaultPromptsList.map((p) => ({
                event_id: eventUuid,
                label: p.label,
                icon: p.icon || '🌿',
              }))
            )
            .select();
          if (promptsError) console.warn('Supabase prompts insert failed:', promptsError);
          if (savedPrompts && savedPrompts.length > 0) {
            defaultPromptsList = savedPrompts.map((p: any) => ({ id: p.id, label: p.label, icon: p.icon || '🌿' }));
          }
        }
      } catch (err) {
        console.warn('createEvent Supabase exception:', err);
        throw err;
      }
    }

    const newEvent: EventItem = {
      id: eventUuid,
      title: data.title.trim(),
      date: data.date.trim() || '24 May 2026',
      venue: data.venue?.trim() || '',
      code: joinCode,
      slug,
      coverUrl: finalCoverUrl,
      prompts: defaultPromptsList,
      votingPromptId: defaultPromptsList[0]?.id || '',
      createdAt: new Date().toISOString(),
      ownerId: hostUser?.id,
    };

    setEvents((prev) => [newEvent, ...prev]);
    setCurrentEventIdState(newEvent.id);
    triggerToast(`Created celebration "${newEvent.title}"!`, `Event PIN: ${formatPin(newEvent.code)}`);
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
        if (updates.coverUrl) {
          payload.cover_url = updates.coverUrl.startsWith('data:')
            ? (await uploadMediaToR2(updates.coverUrl, id, generateUUID())).url
            : updates.coverUrl;
        }
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
    const promptId = generateUUID();
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
    triggerToast(`Added tag: "${label}"`, 'Immediately selectable by guests');

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
      triggerToast('Close the live contest first', 'This tag is being voted on right now');
      return;
    }

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      // Find every post in this tag from the database (not just what this screen has loaded)
      const { data: rows, error: findError } = await supabase
        .from('posts')
        .select('id')
        .eq('event_id', currentEvent.id)
        .eq('category_tag', promptId);
      if (findError) {
        triggerToast('Could not delete tag', findError.message);
        return;
      }
      const postIds = (rows || []).map((r: { id: string }) => r.id);

      if (postIds.length > 0) {
        // Files first: the R2 route checks ownership against the rows, so they must still exist
        await deleteMediaFromR2({ postIds });
        const { error: deleteError } = await supabase.from('posts').delete().in('id', postIds);
        if (deleteError) {
          triggerToast('Could not delete the tag’s photos', deleteError.message);
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
      'Tag deleted',
      removedIds.size > 0 ? `${removedIds.size} photos and videos permanently deleted` : undefined
    );

    if (isSupabaseConfigured() && isUuid(promptId)) {
      const { error } = await supabase.from('prompts').delete().eq('id', promptId);
      if (error) console.warn('deletePrompt db error:', error);
    }
  };

  // Host: open a voting round on the chosen tag (optional time limit)
  const startVotingRound = async (promptId: string, durationMinutes: number | null) => {
    if (!promptId) {
      triggerToast('Select a photo tag for the contest first');
      return;
    }
    const endsAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60_000).toISOString() : null;
    const patch = { votingOpen: true, votingEndsAt: endsAt, votingPromptId: promptId, votingClosedAt: null };
    setEvents((prev) => prev.map((ev) => (ev.id === currentEvent.id ? { ...ev, ...patch } : ev)));
    setNowMs(Date.now());
    const durationDescription = durationMinutes
      ? durationMinutes === 1
        ? 'Guests can vote for 1 minute'
        : durationMinutes >= 60 && durationMinutes % 60 === 0
          ? `Guests can vote for ${durationMinutes / 60} hour${durationMinutes > 60 ? 's' : ''}`
          : `Guests can vote for ${durationMinutes} minutes`
      : 'Guests can vote until you close the contest';

    triggerToast('Live photo contest started', durationDescription);

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      const { error } = await supabase
        .from('events')
        .update({ voting_open: true, voting_ends_at: endsAt, voting_prompt_id: promptId, voting_closed_at: null })
        .eq('id', currentEvent.id);
      if (error) {
        console.warn('startVotingRound error:', error);
        triggerToast('Could not start the contest', error.message);
        if (hostUser) fetchHostEvents(hostUser.id);
      }
    }
  };

  // Host: close the round and return the winning photo (most votes in the round's category)
  const closeVotingRound = async (): Promise<MemoryItem | null> => {
    // Saved on the event so guests who weren't watching still get the winner reveal later
    const closedAt = new Date().toISOString();
    const winner =
      publicMemories
        .filter((m) => m.promptId === votingRound.promptId)
        .sort((a, b) => b.votes - a.votes)[0] || null;

    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === currentEvent.id ? { ...ev, votingOpen: false, votingEndsAt: null, votingClosedAt: closedAt } : ev
      )
    );
    triggerToast(
      'Photo contest closed',
      winner && winner.votes > 0 ? `Winner: "${winner.caption.slice(0, 40)}" by ${winner.guestName}` : 'No votes were cast'
    );

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      const { error } = await supabase
        .from('events')
        .update({ voting_open: false, voting_ends_at: null, voting_closed_at: closedAt })
        .eq('id', currentEvent.id);
      if (error) {
        console.warn('closeVotingRound error:', error);
        triggerToast('Could not close the contest', error.message);
        if (hostUser) fetchHostEvents(hostUser.id);
      }
    }
    return winner && winner.votes > 0 ? winner : null;
  };

  // Guest & Reaction Handlers
  const setGuestName = (name: string) => {
    setGuestNameState(name);
    setHasJoined(true);
    // Give this browser a stable guest id the first time the guest joins
    const id = guestId || generateUUID();
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
      // Clears all host data below, then saves the name just entered; keeps this event's public view
      joiningAsGuestRef.current = true;
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
      joiningAsGuestRef.current = false;
      setHostUser(null);
      clearBrowserData();
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

    // Everyone else's phone stays quiet: the tap goes to the projector only (the sender already showed it above).
    // A tap on the projector itself is already on screen, so nothing needs sending.
    // Throttled so rapid tapping can't flood the channel.
    const now = Date.now();
    if (
      !isProjectorScreen &&
      isSupabaseConfigured() &&
      isUuid(currentEvent.id) &&
      now - lastReactionSentRef.current >= REACTION_BROADCAST_GAP_MS
    ) {
      lastReactionSentRef.current = now;
      sendReactionToProjector(currentEvent.id, emoji);
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

    const memoryUuid = generateUUID();
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
      triggerToast(
        `New ${created.type} shared to Live Gallery & Projector`,
        `Tagged under "${getPrompt(created.promptId).label}"`
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
          return;
        }
      } catch (err) {
        console.error('addMemory Supabase error:', err);
        return;
      }
    }

    // Only now is the photo really there for the projector to celebrate
    if (!created.isPrivate) sendReaction('✨');
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
      id: generateUUID(),
      eventId: currentEvent.id,
      guestName: newEntry.guestName?.trim() || finalAuthor,
      type: newEntry.type || 'photo',
      duration: newEntry.type === 'video' ? (newEntry.duration || '0:19') : undefined,
      url: newEntry.url,
      // Hosts may leave the caption blank; guests' blank captions get a default wish
      caption:
        newEntry.caption.trim() ||
        (hostUser ? '' : `Wishing ${currentEvent.title} a lifetime of quiet mornings and loud celebrations!`),
      subCaption: hostUser
        ? undefined
        : newEntry.type === 'video'
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
        const { error: dbError } = await supabase.from('posts').insert(
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
        if (dbError) {
          console.error('Supabase posts insert error:', dbError);
          triggerToast('Database sync notice', dbError.message);
          return;
        }
      } catch (err) {
        console.error('addMultipleMemories Supabase error:', err);
        return;
      }
    }

    // Only now are the photos really there for the projector to celebrate
    if (uploadedList.some((c) => !c.isPrivate)) sendReaction('✨');
  };

  // Returns this browser's voter id, creating a guest id if a guest votes before joining
  const ensureVoterId = (): string => {
    if (hostUser?.id) return hostUser.id;
    if (guestId) return guestId;
    const id = generateUUID();
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
        votingRound.isActive ? 'This photo isn’t in the live contest' : 'Voting isn’t open right now',
        votingRound.isActive
          ? `Vote for photos in "${getPrompt(votingRound.promptId).label}"`
          : 'The hosts will start a live photo contest soon'
      );
      return;
    }
    const nextVoted = !target.votedByMe;
    // One vote per round: voting for a new photo moves the vote off the previous pick
    const previousPick = nextVoted
      ? memories.find(
          (m) => m.id !== memoryId && m.votedByMe && m.eventId === target.eventId && m.promptId === target.promptId
        )
      : undefined;
    const snapshot = memories;

    // Optimistic update; corrected below with the server's answer
    const applyVote = (voted: boolean, votes: number) =>
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? { ...m, votedByMe: voted, votes } : m)));
    if (previousPick) {
      setMemories((prev) =>
        prev.map((m) =>
          m.id === previousPick.id ? { ...m, votedByMe: false, votes: Math.max(0, m.votes - 1) } : m
        )
      );
    }
    applyVote(nextVoted, nextVoted ? target.votes + 1 : Math.max(0, target.votes - 1));
    if (nextVoted) sendReaction('🥂');

    if (!isSupabaseConfigured() || !isUuid(memoryId)) return;

    const { data, error } = await supabase.rpc('toggle_vote', {
      p_post_id: memoryId,
      p_voter_id: ensureVoterId(),
    });
    if (error || !data) {
      console.warn('toggleVote error:', error);
      setMemories(snapshot);
      triggerToast('Vote not saved', error?.message || 'Please check your connection and try again');
      return;
    }
    setMemories((prev) => prev.map((m) => (m.id === memoryId ? { ...m, votedByMe: Boolean(data.voted) } : m)));
    // Any photo the server moved the vote away from is no longer "voted by me"
    const movedFrom: string[] = Array.isArray(data.moved_from) ? data.moved_from : [];
    if (movedFrom.length > 0) {
      setMemories((prev) => prev.map((m) => (movedFrom.includes(m.id) ? { ...m, votedByMe: false } : m)));
      triggerToast('Vote moved', 'You have one vote per round');
    }
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
    saveSlideshow(computeSlidePosition(), false);
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
    // Advancing from a pinned photo also releases it on every screen
    if (spotlightId) resumeSlideshow();
    saveSlideshow(computeSlidePosition() + 1, slideshowPaused);
    triggerToast('Advanced to next memory on live screen');
  };

  const cyclePrevSlide = () => {
    if (spotlightId) resumeSlideshow();
    saveSlideshow(computeSlidePosition() - 1, slideshowPaused);
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
        lookupEvent,
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
        refreshPosts,
        deleteMemory,
        deleteMultipleMemories,
        spotlightId,
        setSpotlightId,
        currentSlideIdx,
        isSlideshowPlaying,
        toggleSlideshowPlaying,
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

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  isActive: boolean;
  promptId: string;
}

interface EventContextType {
  // Host Auth
  isHostLoggedIn: boolean;
  hostUser: HostUser | null;
  loginHost: (email: string, pass: string) => boolean;
  loginWithGoogle: () => Promise<{ error?: string }>;
  loginHostWithPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpHostWithPassword: (
    email: string,
    pass: string,
    fullName?: string
  ) => Promise<{ success: boolean; error?: string; requireVerification?: boolean }>;
  logoutHost: () => Promise<void> | void;

  // Events Management
  events: EventItem[];
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

  // Guest State
  guestName: string;
  hasJoined: boolean;
  setGuestName: (name: string) => void;
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
  setVotingCategory: (promptId: string) => void;

  // Actions
  joinCelebration: (name: string) => void;
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
  setVotingRound: React.Dispatch<React.SetStateAction<VotingRound>>;

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
const STORAGE_KEY_HOST_AUTH = 'withlove_host_user_auth';
const STORAGE_KEY_REACTIONS = 'withlove_reactions_count';

const isUuid = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export function EventProvider({ children }: { children: ReactNode }) {
  // Host Auth State
  const [hostUser, setHostUser] = useState<HostUser | null>(null);

  // Events State
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [currentEventId, setCurrentEventIdState] = useState<string>(INITIAL_EVENTS[0].id);

  // Guest State
  const [guestName, setGuestNameState] = useState<string>('Clara Vance');
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
        }));
        setEvents(mapped);
      }
    } catch (err) {
      console.warn('Error fetching events from Supabase:', err);
    }
  }, []);

  // Fetch Posts from Supabase
  const fetchPostsFromDb = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data: dbPosts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching posts from Supabase:', error);
        return;
      }

      if (dbPosts) {
        const mapped: MemoryItem[] = dbPosts.map((p: any) => ({
          id: p.id,
          eventId: p.event_id || undefined,
          guestName: p.guest_name || 'Wedding Guest',
          type: (p.media_type as 'photo' | 'video') || 'photo',
          duration: p.video_duration || undefined,
          url: p.file_url,
          caption: p.caption || '',
          promptId: p.category_tag || 'fav-chapter',
          isPrivate: Boolean(p.is_private),
          votes: p.votes_count || 0,
          votedByMe: false,
          timestamp: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        if (mapped.length > 0) {
          setMemories(mapped);
        }

        const spotlighted = dbPosts.find((p: any) => p.is_spotlight);
        if (spotlighted) {
          setSpotlightId(spotlighted.id);
        }
      }
    } catch (err) {
      console.warn('Error fetching posts from Supabase:', err);
    }
  }, []);

  // 1. Initial Load from LocalStorage (fast fallback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEY_HOST_AUTH);
      if (savedAuth) {
        setHostUser(JSON.parse(savedAuth));
      }

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

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user: HostUser = {
          id: session.user.id,
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Host User',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        };
        setHostUser(user);
        try {
          localStorage.setItem(STORAGE_KEY_HOST_AUTH, JSON.stringify(user));
        } catch (e) {}
      }
    });

    // Listen to Auth State Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const user: HostUser = {
          id: session.user.id,
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Host User',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        };
        setHostUser(user);
        try {
          localStorage.setItem(STORAGE_KEY_HOST_AUTH, JSON.stringify(user));
        } catch (e) {}
      } else if (event === 'SIGNED_OUT') {
        setHostUser(null);
        try {
          localStorage.removeItem(STORAGE_KEY_HOST_AUTH);
        } catch (e) {}
      }
    });

    // Pull from DB
    fetchEventsFromDb();
    fetchPostsFromDb();

    // Set up Real-time Live Synchronization Channel
    const channel = supabase
      .channel('realtime-photosharing-v1')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPostsFromDb();
        }
      )
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
  }, [fetchEventsFromDb, fetchPostsFromDb]);

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
      localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(memories));
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

  // Filter memories for the current event
  const eventMemories = memories.filter(
    (m) => !m.eventId || m.eventId === currentEvent.id
  );

  const publicMemories = eventMemories.filter((m) => !m.isPrivate);
  const privateMemories = eventMemories.filter((m) => m.isPrivate);

  // Live Voting State derived from current event
  const [votingRound, setVotingRound] = useState<VotingRound>({
    isActive: true,
    promptId: currentEvent.votingPromptId || prompts[0]?.id || 'fav-chapter',
  });

  useEffect(() => {
    if (currentEvent.votingPromptId) {
      setVotingRound((v) => ({ ...v, promptId: currentEvent.votingPromptId }));
    }
  }, [currentEvent.id, currentEvent.votingPromptId]);

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
      guestName: 'WithLove',
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
  const loginHost = (email: string, pass: string): boolean => {
    if (!email.trim()) return false;
    const user: HostUser = {
      id: `host-${Date.now()}`,
      name: email.split('@')[0].replace(/[._]/g, ' ') || 'Wedding Host',
      email: email.trim(),
    };
    setHostUser(user);
    try {
      localStorage.setItem(STORAGE_KEY_HOST_AUTH, JSON.stringify(user));
    } catch (e) {}
    triggerToast(`Welcome back, ${user.name}!`, 'Host admin session active');
    return true;
  };

  const loginWithGoogle = async (): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured()) {
      const err =
        'Supabase keys are not set yet. Please paste your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local';
      triggerToast('Configuration Required', 'Please set up your .env.local keys');
      return { error: err };
    }

    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
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
          const user: HostUser = {
            id: data.user.id,
            name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              data.user.email?.split('@')[0] ||
              'Wedding Host',
            email: data.user.email || email.trim(),
            avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          };
          setHostUser(user);
          triggerToast(`Welcome back, ${user.name}!`, 'Host admin session active');
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to sign in' };
      }
    }

    loginHost(email, pass);
    return { success: true };
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

    loginHost(email, pass);
    return { success: true };
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
    try {
      localStorage.removeItem(STORAGE_KEY_HOST_AUTH);
    } catch (e) {}
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
              owner_id: isUuid(hostUser.id) ? hostUser.id : '61e6052c-d4bf-446d-b51f-aa5961791d1a',
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

  const deletePrompt = async (promptId: string) => {
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
    triggerToast('Category removed');

    if (isSupabaseConfigured() && isUuid(promptId)) {
      try {
        await supabase.from('prompts').delete().eq('id', promptId);
      } catch (e) {
        console.warn('deletePrompt db error:', e);
      }
    }
  };

  const setVotingCategory = (promptId: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== currentEvent.id) return ev;
        return { ...ev, votingPromptId: promptId };
      })
    );
    setVotingRound((v) => ({ ...v, promptId }));
    triggerToast('Live voting contest category updated');

    if (isSupabaseConfigured() && isUuid(currentEvent.id)) {
      supabase
        .from('events')
        .update({ voting_prompt_id: promptId })
        .eq('id', currentEvent.id)
        .then();
    }
  };

  // Guest & Reaction Handlers
  const setGuestName = (name: string) => {
    setGuestNameState(name);
    setHasJoined(true);
    try {
      localStorage.setItem(STORAGE_KEY_GUEST, name);
    } catch (e) {}
  };

  const joinCelebration = (nameInput: string) => {
    const clean = nameInput.trim() || 'Wedding Guest';
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

    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 70) + 15;
    setFloatingEmojis((prev) => [...prev.slice(-12), { id, emoji, left }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2600);

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
    if (newEntry.guestName?.trim() && newEntry.guestName.trim() !== guestName) {
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
      votes: 1,
      votedByMe: true,
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

    // Insert into Supabase 'posts' table
    if (isSupabaseConfigured()) {
      try {
        const { error: dbError } = await supabase.from('posts').insert([
          {
            id: memoryUuid,
            event_id: eventIdVal,
            guest_name: finalAuthor,
            guest_id: hostUser?.id && isUuid(hostUser.id) ? hostUser.id : null, // null safely bypasses foreign key check for guests
            file_url: newEntry.url,
            caption: created.caption,
            category_tag: created.promptId,
            media_type: created.type,
            video_duration: created.duration || null,
            is_private: created.isPrivate,
            is_spotlight: false,
            votes_count: 1,
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
    if (firstCustomName && firstCustomName !== guestName) {
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
      votes: 1,
      votedByMe: true,
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

    // Insert batch into Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('posts').insert(
          createdList.map((c) => ({
            id: c.id,
            event_id: eventIdVal,
            guest_name: c.guestName,
            guest_id: hostUser?.id && isUuid(hostUser.id) ? hostUser.id : null,
            file_url: c.url,
            caption: c.caption,
            category_tag: c.promptId,
            media_type: c.type,
            video_duration: c.duration || null,
            is_private: c.isPrivate,
            is_spotlight: false,
            votes_count: 1,
          }))
        );
      } catch (err) {
        console.error('addMultipleMemories Supabase error:', err);
      }
    }
  };

  const toggleVote = async (memoryId: string) => {
    const target = memories.find((m) => m.id === memoryId);
    if (!target) return;
    const nextVoted = !target.votedByMe;
    const nextVotes = nextVoted ? target.votes + 1 : Math.max(0, target.votes - 1);

    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== memoryId) return m;
        return {
          ...m,
          votedByMe: nextVoted,
          votes: nextVotes,
        };
      })
    );
    sendReaction('🥂');

    if (isSupabaseConfigured() && isUuid(memoryId)) {
      try {
        await supabase.from('posts').update({ votes_count: nextVotes }).eq('id', memoryId);
        if (nextVoted) {
          await supabase.from('reactions').insert([
            {
              post_id: memoryId,
              reaction_type: 'vote',
              guest_id: hostUser?.id && isUuid(hostUser.id) ? hostUser.id : null,
              event_id: isUuid(currentEvent.id) ? currentEvent.id : null,
            },
          ]);
        } else {
          await supabase.from('reactions').delete().eq('post_id', memoryId);
        }
      } catch (e) {
        console.warn('toggleVote db error:', e);
      }
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
          await supabase.from('posts').update({ is_spotlight: false }).eq('event_id', currentEvent.id);
        }
        if (nextSpotlight) {
          await supabase.from('posts').update({ is_spotlight: true }).eq('id', memoryId);
        }
      } catch (e) {
        console.warn('toggleSpotlight db error:', e);
      }
    }
  };

  const cycleNextSlide = () => {
    setSpotlightId(null);
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
        hostUser,
        loginHost,
        loginWithGoogle,
        loginHostWithPassword,
        signUpHostWithPassword,
        logoutHost,
        events,
        currentEvent,
        getEventById,
        setCurrentEventId,
        createEvent,
        updateEvent,
        deleteEvent,
        guestName,
        hasJoined,
        setGuestName,
        guestCount,
        reactionCount,
        memories: eventMemories,
        prompts,
        publicMemories,
        privateMemories,
        getPrompt,
        addPrompt,
        deletePrompt,
        setVotingCategory,
        joinCelebration,
        switchEventByCode,
        addMemory,
        addMultipleMemories,
        toggleVote,
        togglePrivacy,
        toggleSpotlight,
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
        setVotingRound,
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

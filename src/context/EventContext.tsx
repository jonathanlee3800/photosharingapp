'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  }) => EventItem;
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
  addPrompt: (label: string, icon?: string) => void;
  deletePrompt: (promptId: string) => void;
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
  }) => void;
  addMultipleMemories: (entries: Array<{
    type: 'photo' | 'video';
    url: string;
    caption: string;
    promptId: string;
    isPrivate?: boolean;
    duration?: string;
    guestName?: string;
  }>) => void;
  toggleVote: (memoryId: string) => void;
  togglePrivacy: (memoryId: string) => void;
  toggleSpotlight: (memoryId: string) => void;
  deleteMemory: (memoryId: string) => void;
  deleteMultipleMemories: (ids: string[]) => void;

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
  const [spotlightId, setSpotlightId] = useState<string | null>('mem-1');
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState<boolean>(true);

  // Reactions, Toasts, ZIP Modal
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [isZipModalOpen, setIsZipModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Load from LocalStorage
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

  // Supabase Auth State Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // 1. Initial active session check
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

    // 2. Real-time auth changes listener (Google OAuth, Sign In, Sign Out)
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

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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

  const triggerToast = (title: string, subtitle = 'Synced across all active screens') => {
    setToast({ title, subtitle, id: Date.now() });
  };

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

    // Fallback demo mode if Supabase credentials are not provided
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

    // Fallback demo mode
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
  const createEvent = (data: {
    id?: string;
    title: string;
    date: string;
    venue: string;
    code?: string;
    coverUrl?: string;
    initialPrompts?: PromptItem[];
  }): EventItem => {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toLowerCase();
    const generatedId = (data.id?.trim() || data.code?.trim() || `evt-${randomSuffix}`).toLowerCase();
    const rawCode = (data.code?.trim() || generatedId).toUpperCase();
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'wedding-event';

    const defaultPromptsList =
      data.initialPrompts && data.initialPrompts.length > 0
        ? data.initialPrompts
        : [
            { id: `prompt-${Date.now()}-1`, label: 'A moment to remember', icon: '🌿' },
            { id: `prompt-${Date.now()}-2`, label: 'Oldest memory together', icon: '🕰️' },
            { id: `prompt-${Date.now()}-3`, label: 'Funniest candid shot', icon: '🥂' },
            { id: `prompt-${Date.now()}-4`, label: 'Dance floor magic', icon: '✨' },
          ];

    const newEvent: EventItem = {
      id: generatedId,
      title: data.title.trim(),
      date: data.date.trim() || '24 May 2026',
      venue: data.venue.trim() || 'The Glasshouse',
      code: rawCode,
      slug,
      coverUrl:
        data.coverUrl ||
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
      prompts: defaultPromptsList,
      votingPromptId: defaultPromptsList[0].id,
      createdAt: new Date().toISOString(),
    };

    setEvents((prev) => [newEvent, ...prev]);
    setCurrentEventIdState(newEvent.id);
    triggerToast(`Created event "${newEvent.title}"!`, `Event ID: ${newEvent.id}`);
    return newEvent;
  };

  const updateEvent = (id: string, updates: Partial<EventItem>) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    triggerToast('Event details updated');
  };

  const deleteEvent = (id: string) => {
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
  };

  // Mini-Categories / Prompts Management for current event
  const addPrompt = (label: string, icon = '🌿') => {
    if (!label.trim()) return;
    const newPrompt: PromptItem = {
      id: `prompt-${Date.now()}`,
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
  };

  const deletePrompt = (promptId: string) => {
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
  };

  // Memory Handlers
  const addMemory = (newEntry: {
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

    const created: MemoryItem = {
      id: `mem-${Date.now()}`,
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
  };

  const addMultipleMemories = (entries: Array<{
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

    const createdList: MemoryItem[] = entries.map((newEntry, idx) => ({
      id: `mem-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
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
  };

  const toggleVote = (memoryId: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== memoryId) return m;
        const nextVoted = !m.votedByMe;
        return {
          ...m,
          votedByMe: nextVoted,
          votes: nextVoted ? m.votes + 1 : Math.max(0, m.votes - 1),
        };
      })
    );
    sendReaction('🥂');
  };

  const toggleSpotlight = (memoryId: string) => {
    const target = eventMemories.find((m) => m.id === memoryId);
    if (!target) return;
    if (target.isPrivate) {
      triggerToast('Cannot spotlight a Private Vault photo', 'Make it public first');
      return;
    }

    if (spotlightId === memoryId) {
      setSpotlightId(null);
      triggerToast('Spotlight released', 'Resumed auto-rolling slideshow');
    } else {
      setSpotlightId(memoryId);
      triggerToast(
        `Spotlighted "${target.caption.slice(0, 32)}..."`,
        'Locked onto Live Slideshow & Projector Screen'
      );
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

  const togglePrivacy = (memoryId: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== memoryId) return m;
        const nextPriv = !m.isPrivate;
        if (nextPriv && spotlightId === memoryId) {
          setSpotlightId(null);
        }
        triggerToast(
          nextPriv ? 'Moved to Couple’s Private Vault' : 'Restored to Public Slideshow',
          nextPriv ? 'Hidden from guest gallery & projector' : 'Now visible on live screens'
        );
        return { ...m, isPrivate: nextPriv };
      })
    );
  };

  const deleteMemory = (memoryId: string) => {
    if (spotlightId === memoryId) setSpotlightId(null);
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    triggerToast('Memory deleted by host moderation');
  };

  const deleteMultipleMemories = (ids: string[]) => {
    const idSet = new Set(ids);
    if (spotlightId && idSet.has(spotlightId)) setSpotlightId(null);
    setMemories((prev) => prev.filter((m) => !idSet.has(m.id)));
    triggerToast(`Deleted ${ids.length} memories`, 'Removed from gallery and projector');
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

export interface MemoryItem {
  id: string;
  eventId?: string;
  guestName: string;
  type: 'photo' | 'video';
  duration?: string;
  url: string;
  caption: string;
  subCaption?: string;
  promptId: string;
  isPrivate: boolean;
  votes: number;
  votedByMe?: boolean;
  timestamp: string;
}

export interface PromptItem {
  id: string;
  label: string;
  icon: string;
}

export interface PresetItem {
  label: string;
  url: string;
  type: 'photo' | 'video';
  duration?: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  venue: string;
  code: string;
  slug: string;
  coverUrl: string;
  prompts: PromptItem[];
  votingPromptId: string;
  createdAt: string;
}

export interface HostUser {
  id: string;
  name: string;
  email: string;
}

export const INITIAL_PROMPTS: PromptItem[] = [
  { id: 'fav-chapter', label: 'A moment to remember', icon: '🌿' },
  { id: 'oldest-joshua', label: 'Oldest photo with Joshua', icon: '🕰️' },
  { id: 'funny-simone', label: 'Most funny picture of Simone', icon: '🥂' },
  { id: 'dance-floor', label: 'Late night dance floor', icon: '✨' },
];

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'event-1',
    title: 'Joshua & Simone',
    date: '24 May 2026',
    venue: 'The Glasshouse',
    code: 'EVENT-1',
    slug: 'joshua-and-simone',
    coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
    prompts: INITIAL_PROMPTS,
    votingPromptId: 'funny-simone',
    createdAt: '2026-05-20T10:00:00Z',
  },
];

export const SAMPLE_PRESETS: PresetItem[] = [
  {
    label: 'Sparkler First Dance',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
    type: 'photo',
  },
  {
    label: 'Garden Vows Portrait',
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85',
    type: 'photo',
  },
  {
    label: 'Champagne Tower Laughs',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85',
    type: 'photo',
  },
  {
    label: 'Evening Courtyard Toast (Video)',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=85',
    type: 'video',
    duration: '0:24',
  },
  {
    label: 'Simone Candid Laugh',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
    type: 'photo',
  },
  {
    label: 'Film Throwback 2016',
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85',
    type: 'photo',
  },
];

export const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    eventId: 'event-1',
    guestName: 'Hannah & Liam',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
    caption: 'The beginning of our favourite chapter.',
    subCaption: 'Under the fairy lights right after the first toast — nobody in the courtyard had dry eyes.',
    promptId: 'fav-chapter',
    isPrivate: false,
    votes: 42,
    votedByMe: true,
    timestamp: '2 mins ago',
  },
  {
    id: 'mem-2',
    eventId: 'event-1',
    guestName: 'Clara Vance',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85',
    caption: 'Simone attempting to sabre the champagne bottle with a butter knife!',
    subCaption: 'Table 4 ducked for cover but she pulled it off effortlessly.',
    promptId: 'funny-simone',
    isPrivate: false,
    votes: 38,
    votedByMe: false,
    timestamp: '7 mins ago',
  },
  {
    id: 'mem-3',
    eventId: 'event-1',
    guestName: 'Marcus & Elena',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85',
    caption: 'Summer roadtrip in Big Sur, 2016. Joshua still had that beat-up film camera.',
    subCaption: 'We knew even back then that Simone was the only one who laughed at his puns.',
    promptId: 'oldest-joshua',
    isPrivate: false,
    votes: 29,
    votedByMe: false,
    timestamp: '12 mins ago',
  },
  {
    id: 'mem-4',
    eventId: 'event-1',
    guestName: 'Oliver Tan',
    type: 'video',
    duration: '0:24',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=85',
    caption: 'A quick video toast from everyone at the university table!',
    subCaption: 'Video well-wish (plays in couple archive · displays as editorial still on screen).',
    promptId: 'fav-chapter',
    isPrivate: false,
    votes: 21,
    votedByMe: false,
    timestamp: '16 mins ago',
  },
  {
    id: 'mem-5',
    eventId: 'event-1',
    guestName: 'Sophie Lin',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
    caption: 'When the espresso martinis arrived at 10:30pm sharp.',
    subCaption: 'Iconic bridal energy.',
    promptId: 'funny-simone',
    isPrivate: false,
    votes: 34,
    votedByMe: true,
    timestamp: '21 mins ago',
  },
  {
    id: 'mem-6',
    eventId: 'event-1',
    guestName: 'Rachel (Maid of Honour)',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85',
    caption: 'Quiet polaroid from your morning vow exchange in the conservatory.',
    subCaption: 'Marked private just for Joshua & Simone to treasure after the honeymoon.',
    promptId: 'fav-chapter',
    isPrivate: true,
    votes: 9,
    votedByMe: false,
    timestamp: '28 mins ago',
  },
  {
    id: 'mem-7',
    eventId: 'event-1',
    guestName: 'Lucas Meyer',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=85',
    caption: 'High-note duet during the encore song!',
    subCaption: 'Unbeatable choreography.',
    promptId: 'funny-simone',
    isPrivate: false,
    votes: 25,
    votedByMe: false,
    timestamp: '33 mins ago',
  },
  {
    id: 'mem-8',
    eventId: 'event-1',
    guestName: 'Grace & Noah',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=85',
    caption: 'Stealing a quiet moment in the olive grove before dinner.',
    subCaption: 'Here is to a lifetime of calm and joy together.',
    promptId: 'funny-simone',
    isPrivate: false,
    votes: 19,
    votedByMe: false,
    timestamp: '40 mins ago',
  },
];

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  QrCode,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Tag,
  Download,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { PromptItem } from '@/lib/initialData';
import { generateQrDataUrl, downloadQrCode } from '@/lib/qrHelper';
import HostAuthGuard from '@/components/HostAuthGuard';

const COVER_PRESETS = [
  {
    label: 'Conservatory Portrait',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Garden Vows',
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Courtyard Evening',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Sunset Olive Grove',
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=85',
  },
];

const EMOJI_OPTIONS = ['🌿', '🥂', '✨', '🕰️', '💃', '📸', '🎉', '💐', '🎂', '💌'];

export default function CreateEventPage() {
  const router = useRouter();
  const { events, createEvent } = useEvent();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('24 May 2026');
  const [venue, setVenue] = useState('The Glasshouse');
  const [uniqueEventId, setUniqueEventId] = useState(() => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let slug = 'evt-';
    for (let i = 0; i < 6; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  });
  const [codeError, setCodeError] = useState('');
  const [selectedCover, setSelectedCover] = useState(0);

  // Mini-Categories State for this new event
  const [categories, setCategories] = useState<PromptItem[]>([
    { id: 'cat-1', label: 'A moment to remember', icon: '🌿' },
    { id: 'cat-2', label: 'Oldest memory together', icon: '🕰️' },
    { id: 'cat-3', label: 'Most candid & funny shot', icon: '🥂' },
    { id: 'cat-4', label: 'Dance floor magic', icon: '✨' },
  ]);

  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📸');

  // Generated QR preview
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const regenerateEventId = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let slug = 'evt-';
    for (let i = 0; i < 6; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUniqueEventId(slug);
    setCodeError('');
  };

  // Generate QR code whenever uniqueEventId changes
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://withlove.app';
    const cleanId = uniqueEventId.trim().toLowerCase() || 'evt-new';
    const targetUrl = `${origin}/user/${cleanId}`;

    generateQrDataUrl(targetUrl, { width: 320, margin: 2 }).then((data) => {
      setQrDataUrl(data);
    });
  }, [uniqueEventId]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;

    const newItem: PromptItem = {
      id: `cat-${Date.now()}`,
      label: newCatLabel.trim(),
      icon: newCatIcon,
    };

    setCategories((prev) => [...prev, newItem]);
    setNewCatLabel('');
  };

  const handleRemoveCategory = (id: string) => {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const cleanId = uniqueEventId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    if (!cleanId) {
      setCodeError('Please provide a valid unique Event ID.');
      return;
    }

    const isDuplicate = events.some(
      (ev) => ev.id.toLowerCase() === cleanId || ev.code.toLowerCase() === cleanId
    );
    if (isDuplicate) {
      setCodeError(`Event ID "${cleanId}" is already in use. Click Generate New ID.`);
      return;
    }

    const newEvent = createEvent({
      id: cleanId,
      title: title.trim(),
      date: date.trim() || '24 May 2026',
      venue: venue.trim() || 'The Glasshouse',
      code: cleanId.toUpperCase(),
      coverUrl: COVER_PRESETS[selectedCover].url,
      initialPrompts: categories,
    });

    router.push(`/host/${newEvent.id}`);
  };

  return (
    <HostAuthGuard>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
        <Link
          href="/host/events"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C2820]/60 hover:text-[#1C2820] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </Link>

        {/* Header */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full">
            Host Portal
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#1C2820] mt-2">
            Create a New Event
          </h1>
          <p className="text-sm text-[#1C2820]/65 mt-1 font-medium">
            Generate an instant QR code for guest phones and set up custom mini-categories for well-wishes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Event Details & Mini Categories (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Basic Details Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm space-y-5">
              <h2 className="font-serif text-2xl font-bold text-[#1C2820]">
                1. Celebration Details
              </h2>

              <div>
                <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide mb-1.5">
                  Event Title / Couple Names *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Joshua & Simone, Sarah & David Wedding"
                  className="w-full px-4 py-3 rounded-xl border border-[#1C2820]/20 text-sm font-semibold focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#2D4A3A]" />
                    <span>Event Date</span>
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="e.g. 24 May 2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#1C2820]/20 text-xs font-semibold focus:outline-none focus:border-[#2D4A3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2D4A3A]" />
                    <span>Venue / Location</span>
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. The Glasshouse"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#1C2820]/20 text-xs font-semibold focus:outline-none focus:border-[#2D4A3A]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide">
                    Unique Event ID & QR Code Identifier
                  </label>
                  <button
                    type="button"
                    onClick={regenerateEventId}
                    className="text-[11px] font-bold text-[#2D4A3A] hover:underline"
                  >
                    Regenerate Unique ID
                  </button>
                </div>
                <input
                  type="text"
                  value={uniqueEventId}
                  onChange={(e) => {
                    setUniqueEventId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    if (codeError) setCodeError('');
                  }}
                  placeholder="e.g. evt-8k3f9a"
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider focus:outline-none ${
                    codeError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[#1C2820]/20 focus:border-[#2D4A3A]'
                  }`}
                />
                {codeError ? (
                  <span className="block text-[11px] text-red-600 mt-1 font-semibold">
                    {codeError}
                  </span>
                ) : (
                  <span className="block text-[10px] text-[#1C2820]/50 mt-1 font-medium">
                    Guest URL: <span className="font-mono font-bold text-[#2D4A3A]">/user/{uniqueEventId || 'evt-id'}</span> · Host URL: <span className="font-mono font-bold text-[#2D4A3A]">/host/{uniqueEventId || 'evt-id'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* 2. Cover Photo Picker Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm space-y-4">
              <h2 className="font-serif text-2xl font-bold text-[#1C2820]">
                2. Theme Cover Image
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COVER_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCover(idx)}
                    className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedCover === idx
                        ? 'border-[#2D4A3A] scale-105 shadow-md ring-2 ring-[#2D4A3A]/30'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt="" className="w-full h-full object-cover" />
                    {selectedCover === idx && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Mini-Categories Builder Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#1C2820]">
                    3. Mini-Categories & Prompts
                  </h2>
                  <p className="text-xs text-[#1C2820]/60 font-medium mt-0.5">
                    Guests can select these categories when uploading candid photos or video toasts.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#E9EFEA] text-[#2D4A3A] text-xs font-bold">
                  {categories.length} Prompts
                </span>
              </div>

              {/* Existing Categories List */}
              <div className="space-y-2">
                {categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#1C2820]/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-xs font-bold text-[#1C2820]">{cat.label}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat.id)}
                      disabled={categories.length <= 1}
                      className="p-1.5 text-[#1C2820]/40 hover:text-red-600 disabled:opacity-20 transition-colors"
                      title="Remove category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Category Row */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-[#1C2820]/15 space-y-3">
                <span className="text-xs font-bold text-[#1C2820] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#2D4A3A]" />
                  <span>Add another mini-category</span>
                </span>

                <div className="flex items-center gap-2">
                  {/* Emoji select */}
                  <select
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-16 p-2 rounded-xl border border-[#1C2820]/20 text-base text-center bg-white"
                  >
                    {EMOJI_OPTIONS.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="e.g. Best bouquet reaction, Table 4 laughs"
                    className="flex-1 px-3 py-2 rounded-xl border border-[#1C2820]/20 text-xs font-semibold focus:outline-none focus:border-[#2D4A3A]"
                  />

                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-4 py-2 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#1F3628] transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live QR Code Preview & Submit (5 cols) */}
          <div className="lg:col-span-5 space-y-6 sticky top-24">
            <div className="bg-[#FAF8F5] rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-lg space-y-6 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D4A3A]">
                  Instant QR Generation
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#1C2820] mt-1">
                  Live Event QR Code
                </h3>
                <p className="text-xs text-[#1C2820]/65 mt-1 font-medium">
                  Automatically configured to direct guests to your wedding event.
                </p>
              </div>

              {/* QR Code Graphic */}
              <div className="bg-white p-6 rounded-3xl border border-[#1C2820]/10 shadow-md inline-block mx-auto">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Event QR code"
                    className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-[#1C2820]/40">
                    <QrCode className="w-16 h-16 animate-pulse" />
                  </div>
                )}
                <div className="mt-3 text-center">
                  <div className="font-serif text-base font-bold text-[#1C2820]">
                    {title || 'Joshua & Simone'}
                  </div>
                  <div className="text-[10px] font-mono font-bold tracking-wider text-[#2D4A3A] mt-0.5">
                    /user/{uniqueEventId}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Event & Save QR</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </HostAuthGuard>
  );
}


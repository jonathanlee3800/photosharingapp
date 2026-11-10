'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  QrCode,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Tag,
  Download,
  Upload,
  Camera,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { PromptItem } from '@/lib/initialData';
import HostAuthGuard from '@/components/HostAuthGuard';
import DatePicker from '@/components/DatePicker';
import { processUploadedImage, isValidImageFile, isHeicFile } from '@/lib/imageProcessor';

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
  const { createEvent, triggerToast } = useEvent();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  });
  // The 6-digit event PIN is assigned by the database when the event is created
  const [submitError, setSubmitError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Cover photo selection & custom upload state
  const [selectedCover, setSelectedCover] = useState(0);
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [isCustomCoverSelected, setIsCustomCoverSelected] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverFileName, setCoverFileName] = useState<string | null>(null);

  // Mini-Categories State for this new event
  // Start with a single category; hosts add more if they want
  const [categories, setCategories] = useState<PromptItem[]>([
    { id: 'cat-1', label: 'A moment to remember', icon: '🌿' },
  ]);

  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📸');

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers onChange
    e.target.value = '';

    if (!isValidImageFile(file)) {
      triggerToast('Please select a valid image file (JPG, PNG, HEIC, WebP)');
      return;
    }

    setIsUploadingCover(true);
    setCoverFileName(file.name);

    const isHeic = isHeicFile(file);

    // If standard image, show instant 0ms preview; if HEIC, wait for conversion so browser doesn't break
    if (!isHeic) {
      const instantUrl = URL.createObjectURL(file);
      setCustomCoverUrl(instantUrl);
      setIsCustomCoverSelected(true);
      triggerToast('Cover photo selected!', file.name);
    } else {
      triggerToast('Converting iPhone photo...', file.name);
    }

    try {
      // Process, decode HEIC via server libheif, and compress
      const processed = await processUploadedImage(file, { maxDimension: 1400, quality: 0.85 });
      setCustomCoverUrl(processed.dataUrl);
      setCoverFileName(processed.fileName);
      setIsCustomCoverSelected(true);
      triggerToast('Cover photo ready!', processed.fileName);
    } catch (err) {
      console.warn('Cover upload processing notice:', err);
      triggerToast('Could not process photo', 'Please select another photo');
    } finally {
      setIsUploadingCover(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    const finalCover = isCustomCoverSelected && customCoverUrl
      ? customCoverUrl
      : COVER_PRESETS[selectedCover]?.url || COVER_PRESETS[0].url;

    setSubmitError('');
    setIsCreating(true);
    try {
      const newEvent = await createEvent({
        title: title.trim(),
        date: date.trim(),
        coverUrl: finalCover,
        initialPrompts: categories,
      });
      router.push(`/host/${newEvent.id}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Could not create the event. Please try again.');
      setIsCreating(false);
    }
  };

  const activeCoverUrl = isCustomCoverSelected && customCoverUrl
    ? customCoverUrl
    : COVER_PRESETS[selectedCover]?.url || COVER_PRESETS[0].url;

  return (
    <HostAuthGuard>
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
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
            Set up your celebration, generate your guest QR code, and customize photo tags for your gallery.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Event Details & Tags (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Basic Details Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm space-y-5">
              <h2 className="font-serif text-2xl font-bold text-[#1C2820]">
                1. Celebration Details
              </h2>

              <div>
                <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sarah & David"
                  className="w-full px-4 py-3 rounded-xl border border-[#1C2820]/20 bg-white text-sm font-semibold text-[#1C2820] placeholder:text-[#1C2820]/40 placeholder:text-sm placeholder:font-normal focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all shadow-sm"
                />
              </div>

              <div className="sm:max-w-[50%]">
                <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#2D4A3A]" />
                  <span>Event Date</span>
                </label>
                <DatePicker value={date} onChange={setDate} />
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/10 flex items-start gap-3">
                <QrCode className="w-5 h-5 text-[#2D4A3A] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#1C2820] uppercase tracking-wide">Event PIN</div>
                  <p className="text-[11px] text-[#1C2820]/60 font-medium mt-0.5 leading-relaxed">
                    When you launch the event, we automatically generate a unique 6-digit code (e.g. <span className="font-bold tabular-nums text-[#2D4A3A]">482 913</span>) for your celebration. Your guests use this code to join by typing it on the welcome screen or scanning the QR code you display on the day. You can print or display this code at the venue so everyone can find the gallery.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Theme Cover Image Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm space-y-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#1C2820]">
                  2. Theme Cover Image
                </h2>
                <p className="text-xs text-[#1C2820]/60 font-medium mt-0.5">
                  Choose from our curated presets below or upload your own custom cover.
                </p>
              </div>

              {/* Hidden Native File Input */}
              <input
                id="custom-cover-file-input"
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleCoverFileUpload}
                className="hidden"
              />

              {/* High-visibility Live Preview Banner for Custom Upload */}
              {isCustomCoverSelected && customCoverUrl && (
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#2D4A3A] shadow-md h-52 bg-black/10 transition-all animate-in fade-in duration-200">
                  <img
                    src={customCoverUrl}
                    alt="Custom cover preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex items-end justify-between p-4 text-white">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[#9BC4A8] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Active Custom Cover Selected</span>
                      </div>
                      <div className="text-sm font-bold truncate max-w-xs sm:max-w-md mt-0.5">
                        {coverFileName || 'Your custom uploaded photo'}
                      </div>
                    </div>
                    <label
                      htmlFor="custom-cover-file-input"
                      className="cursor-pointer px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 text-white text-xs font-bold transition-colors shrink-0"
                    >
                      Change Photo
                    </label>
                  </div>
                </div>
              )}

              {/* Presets and Custom Tile Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {/* Custom Photo Tile: Upload trigger when empty; thumbnail selector when filled (upload disabled) */}
                {!customCoverUrl ? (
                  <label
                    htmlFor="custom-cover-file-input"
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-dashed border-[#1C2820]/25 hover:border-[#2D4A3A] bg-[#FAF8F5] cursor-pointer transition-all flex flex-col items-center justify-center text-center p-2 group shadow-sm"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5 text-[#2D4A3A]">
                      {isUploadingCover ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-[10px] font-bold leading-tight">
                        {isUploadingCover ? 'Loading...' : 'Upload Photo'}
                      </span>
                    </div>
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomCoverSelected(true)}
                    className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                      isCustomCoverSelected
                        ? 'border-[#2D4A3A] scale-105 shadow-md ring-2 ring-[#2D4A3A]/30'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={customCoverUrl} alt="Custom cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20" />
                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-bold text-white bg-black/60 rounded px-1 py-0.5 truncate text-center">
                      Custom Photo
                    </span>
                    {isCustomCoverSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                )}

                {/* 4 Presets */}
                {COVER_PRESETS.map((preset, idx) => {
                  const isSelected = !isCustomCoverSelected && selectedCover === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsCustomCoverSelected(false);
                        setSelectedCover(idx);
                      }}
                      className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-[#2D4A3A] scale-105 shadow-md ring-2 ring-[#2D4A3A]/30'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-bold text-white bg-black/60 rounded px-1 py-0.5 truncate text-center">
                        {preset.label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Tags Builder Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-bold text-[#1C2820]">
                    3. Photo Tags
                  </h2>
                  <span className="px-2.5 py-1 rounded-full bg-[#E9EFEA] text-[#2D4A3A] text-xs font-bold whitespace-nowrap shrink-0">
                    {categories.length} {categories.length === 1 ? 'Tag' : 'Tags'}
                  </span>
                </div>
                <p className="text-xs text-[#1C2820]/60 font-medium leading-relaxed">
                  Photo themes and fun prompts for your guests (e.g. First Dance, Heartfelt Toasts). Guests choose a tag when uploading so memories stay organized in your gallery, and you can pick any tag to run live photo contests on screen.
                </p>
              </div>

              {/* Existing Tags List */}
              <div className="space-y-2">
                {categories.map((cat) => (
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
                      title="Remove tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Tag Row */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-[#1C2820]/15 space-y-3">
                <span className="text-xs font-bold text-[#1C2820] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#2D4A3A]" />
                  <span>Add another tag</span>
                </span>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <select
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="w-14 h-[42px] rounded-xl border border-[#1C2820]/20 text-base text-center bg-white cursor-pointer focus:outline-none focus:border-[#2D4A3A] shrink-0"
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
                      placeholder="e.g. First Dance"
                      className="flex-1 min-w-0 px-3.5 h-[42px] rounded-xl border border-[#1C2820]/20 bg-white text-xs sm:text-sm font-medium text-[#1C2820] placeholder:text-[#1C2820]/40 placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/10 transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="h-[42px] w-full sm:w-auto px-4 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#1F3628] transition-colors shrink-0 shadow-sm active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Tag</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#1C2820]/50 font-medium">
                  Suggestions: First Dance, Best Bouquet Reaction, Dance Floor Energy
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Event Card Preview & Submit (5 cols) */}
          <div className="lg:col-span-5 space-y-6 sticky top-24">
            <div className="bg-[#FAF8F5] rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-lg space-y-6 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D4A3A]">
                  Instant QR code
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#1C2820] mt-1">
                  Live Event Card
                </h3>
                <p className="text-xs text-[#1C2820]/65 mt-1 font-medium">
                  Preview of your celebration header & QR code.
                </p>
              </div>

              {/* Live Preview Card */}
              <div className="bg-white p-5 rounded-3xl border border-[#1C2820]/10 shadow-md inline-block mx-auto w-full text-left">
                {/* Live Cover Photo Preview */}
                <div className="relative h-32 rounded-2xl overflow-hidden mb-4 bg-black/10">
                  <img
                    src={activeCoverUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9BC4A8]">
                      {isCustomCoverSelected ? '✓ Custom Cover Photo' : COVER_PRESETS[selectedCover]?.label}
                    </span>
                  </div>
                </div>

                {/* QR placeholder: the real QR needs the join code, which is assigned on launch */}
                <div className="w-40 h-40 mx-auto rounded-2xl border-2 border-dashed border-[#1C2820]/15 flex flex-col items-center justify-center gap-2 text-[#1C2820]/40">
                  <QrCode className="w-12 h-12" />
                  <span className="text-[10px] font-semibold text-center px-3">Ready after launch</span>
                </div>

                <div className="mt-3 text-center">
                  <div className="font-serif text-base font-bold text-[#1C2820] truncate">
                    {title || 'Your event name'}
                  </div>
                  <div className="text-[10px] font-mono font-bold tracking-wider text-[#2D4A3A] mt-0.5">
                    PIN: • • •  • • •
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={!title.trim() || isCreating}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isCreating ? 'Creating your event…' : 'Launch Event & Save QR code'}</span>
                </button>
                {submitError && (
                  <p className="text-[11px] text-red-600 font-semibold text-center">{submitError}</p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </HostAuthGuard>
  );
}

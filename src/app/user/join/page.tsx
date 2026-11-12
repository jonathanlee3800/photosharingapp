'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowRight,
  Camera,
  Images,
  Trophy,
  User,
  X,
  Loader2,
  Check,
  Sparkles,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const routeEventId =
    typeof params?.eventId === 'string' ? decodeURIComponent(params.eventId) : '';

  const {
    currentEvent,
    getEventById,
    guestName,
    setGuestName,
    triggerToast,
    joinCelebration,
    hostUser,
    hasJoined,
    setCurrentEventId,
  } = useEvent();

  // Resolve active event from URL parameter first, fallback to context
  const activeEvent = (routeEventId ? getEventById(routeEventId) : undefined) || currentEvent;
  const targetEventId = routeEventId || activeEvent.id || currentEvent.id;

  const [nameInput, setNameInput] = useState(guestName || '');
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitializedRef = useRef(Boolean(guestName));

  // Sync route event into context if different
  useEffect(() => {
    if (routeEventId && currentEvent.id !== routeEventId) {
      setCurrentEventId(routeEventId, true);
    }
  }, [routeEventId, currentEvent.id, setCurrentEventId]);

  // Sync guest name only ONCE on initial hydration from local storage
  useEffect(() => {
    if (!hasInitializedRef.current && guestName) {
      setNameInput(guestName);
      hasInitializedRef.current = true;
    }
  }, [guestName]);

  const initials =
    (nameInput.trim() || guestName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'G';

  const isNameChanged =
    hasJoined &&
    nameInput.trim().length > 0 &&
    nameInput.trim().toLowerCase() !== (guestName || '').trim().toLowerCase();

  /**
   * Unified, guaranteed navigation handler:
   * 1. Validates input
   * 2. Saves name & activates guest session
   * 3. Syncs target event ID
   * 4. Navigates to `/user/${targetEventId}/gallery` with hard-redirect fallback
   */
  const handleProceed = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim();

    // A non-empty name is required to participate in photo sharing
    if (!trimmed) {
      setNameError('Please add your name so the couple knows who is sharing.');
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setNameError('');
    setSubmitting(true);

    const finalName = trimmed;

    try {
      if (hasJoined) {
        if (trimmed !== guestName) {
          setGuestName(trimmed);
          triggerToast('Name updated', `Sharing photos as "${trimmed}"`);
        }
      } else {
        await joinCelebration(finalName);
      }

      if (targetEventId && currentEvent.id !== targetEventId) {
        setCurrentEventId(targetEventId, true);
      }
    } catch (err) {
      console.error('Error proceeding to celebration:', err);
    }

    // Direct navigation to the event's gallery
    const destination = `/user/${targetEventId}/gallery`;
    router.push(destination);

    // Safety fallback: if Next.js router soft-nav delays, trigger hard navigation
    setTimeout(() => {
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/gallery')) {
        window.location.href = destination;
      }
    }, 350);
  };

  const coverImage =
    activeEvent.coverUrl ||
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85';

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-center items-center overflow-x-hidden bg-[#FAF8F5]">
      {/* Ambient background glow on desktop (Apple-style subtle aura) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 hidden md:block">
        <div
          className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-cover bg-center opacity-[0.08] blur-3xl scale-110"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/60 via-[#FAF8F5]/90 to-[#FAF8F5]" />
      </div>

      <div className="relative z-10 w-full flex-1 flex flex-col md:items-center md:justify-center md:py-10 md:px-4">
        {/* Main Apple Squircle Card */}
        <div className="w-full md:max-w-[480px] md:rounded-[32px] md:overflow-hidden md:bg-white md:border md:border-[#1C2820]/[0.08] md:shadow-[0_24px_70px_rgba(45,74,58,0.14)] bg-[#FAF8F5] flex flex-col flex-1 md:flex-none">
          {/* Hero Cover Banner */}
          <div className="relative h-[38vh] min-h-[250px] max-h-[350px] md:h-64 bg-[#182B24] overflow-hidden">
            <img
              src={coverImage}
              alt={activeEvent.title}
              className="absolute inset-0 w-full h-full object-cover select-none"
            />
            {/* Apple Cinematic Dual-Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50" />

            {/* Brand Capsule (Top Left) */}
            <div
              className="absolute left-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-white shadow-sm"
              style={{ top: 'calc(env(safe-area-inset-top) + 0.85rem)' }}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-serif text-[13px] font-bold">
                m
              </span>
              <span className="font-serif text-[15px] tracking-tight font-medium">memorie aisle</span>
            </div>

            {/* Passcode Pill (Top Right, if present) */}
            {activeEvent.code && (
              <div
                className="absolute right-5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/15 text-[11px] font-mono font-semibold tracking-wider text-white shadow-sm"
                style={{ top: 'calc(env(safe-area-inset-top) + 0.85rem)' }}
              >
                {activeEvent.code}
              </div>
            )}

            {/* Event Typography (Bottom of Banner) */}
            <div className="absolute inset-x-0 bottom-0 px-6 pb-9 md:pb-6 text-white animate-fade-up">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {activeEvent.date && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-[11px] uppercase tracking-[0.14em] font-semibold text-white/95">
                    {activeEvent.date}
                  </span>
                )}
                {activeEvent.venue && (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/85">
                    {activeEvent.venue}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-[36px] leading-[1.08] font-medium tracking-tight text-white drop-shadow-sm">
                {activeEvent.title}
              </h1>
            </div>
          </div>

          {/* Interactive Sheet Content */}
          <div className="relative -mt-6 md:mt-0 flex-1 rounded-t-[28px] md:rounded-none bg-[#FAF8F5] md:bg-white px-6 pt-7 md:pt-6 pb-9 space-y-6">
            {/* Host Notice Banner (if signed in as host) */}
            {hostUser && (
              <div className="p-3.5 rounded-2xl bg-[#E9EFEA] border border-[#2D4A3A]/10 text-[12px] text-[#1C2820]/75 leading-relaxed flex items-start gap-2.5 animate-fade-up">
                <span className="text-base leading-none mt-0.5">ℹ️</span>
                <div>
                  Signed in as host <strong className="font-semibold text-[#1C2820]">{hostUser.email}</strong>.
                  Joining as a guest enters the guest view.
                </div>
              </div>
            )}

            {/* STATE 1: RETURNING GUEST */}
            {hasJoined ? (
              <div className="space-y-5 animate-fade-up">
                {/* Apple Welcome Guest Card */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/[0.06] shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center font-serif text-lg font-bold shadow-[0_4px_12px_rgba(45,74,58,0.25)] flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2D4A3A]">
                        Guest Connected
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-[16px] font-medium text-[#1C2820] truncate">
                      Welcome back, {guestName || 'Guest'}
                    </p>
                  </div>
                </div>

                {/* Form to edit name or proceed directly */}
                <form onSubmit={handleProceed} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label htmlFor="guest-name-returning" className="text-[13px] font-semibold text-[#1C2820]">
                        Your Display Name
                      </label>
                      {isNameChanged && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                          Modified
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#1C2820]/40">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        ref={inputRef}
                        id="guest-name-returning"
                        type="text"
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="go"
                        value={nameInput}
                        onChange={(e) => {
                          setNameInput(e.target.value);
                          if (nameError) setNameError('');
                        }}
                        placeholder="Enter your name"
                        className={`w-full h-14 pl-12 pr-11 rounded-2xl bg-white md:bg-[#FAF8F5] border text-[16px] font-medium text-[#1C2820] placeholder:text-[#1C2820]/35 focus:outline-none focus:ring-4 transition-all ${
                          nameError
                            ? 'border-red-400 focus:ring-red-100'
                            : 'border-[#1C2820]/12 focus:border-[#2D4A3A] focus:ring-[#2D4A3A]/10'
                        }`}
                      />
                      {nameInput.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNameInput('');
                            if (inputRef.current) inputRef.current.focus();
                          }}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#1C2820]/35 hover:text-[#1C2820]/75"
                          aria-label="Clear name input"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className={`px-1 text-[12px] ${nameError ? 'text-red-600 font-medium' : 'text-[#1C2820]/50'}`}>
                      {nameError || 'Shown next to the photos, well-wishes, and reactions you share.'}
                    </p>
                  </div>

                  {/* Primary Apple Action Button: Always ready, never disabled */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-14 rounded-2xl bg-[#2D4A3A] hover:bg-[#233A2E] text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_12px_32px_rgba(45,74,58,0.25)] hover:shadow-[0_16px_40px_rgba(45,74,58,0.32)] active:scale-[0.985] transition-all press disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Entering celebration...</span>
                      </>
                    ) : isNameChanged ? (
                      <>
                        <span>Save & Continue to Gallery</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        <span>Continue to Gallery</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* STATE 2: FIRST-TIME GUEST */
              <div className="space-y-6 animate-fade-up">
                <div className="space-y-1.5">
                  <h2 className="font-serif text-[28px] sm:text-[30px] leading-tight font-medium text-[#1C2820]">
                    Our day. Your eyes.
                  </h2>
                  <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#1C2820]/65">
                    Share your photos straight from your phone camera roll. No app download, no account required.
                  </p>
                </div>

                <form onSubmit={handleProceed} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="guest-name-new" className="text-[13px] font-semibold text-[#1C2820] px-1 block">
                      Your Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#1C2820]/40">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        ref={inputRef}
                        id="guest-name-new"
                        type="text"
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="go"
                        value={nameInput}
                        onChange={(e) => {
                          setNameInput(e.target.value);
                          if (nameError) setNameError('');
                        }}
                        placeholder="e.g. Jessica or Uncle Bob"
                        className={`w-full h-14 pl-12 pr-11 rounded-2xl bg-white md:bg-[#FAF8F5] border text-[16px] font-medium text-[#1C2820] placeholder:text-[#1C2820]/35 focus:outline-none focus:ring-4 transition-all ${
                          nameError
                            ? 'border-red-400 focus:ring-red-100'
                            : 'border-[#1C2820]/12 focus:border-[#2D4A3A] focus:ring-[#2D4A3A]/10'
                        }`}
                      />
                      {nameInput.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNameInput('');
                            if (inputRef.current) inputRef.current.focus();
                          }}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#1C2820]/35 hover:text-[#1C2820]/75"
                          aria-label="Clear name input"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className={`px-1 text-[12px] ${nameError ? 'text-red-600 font-medium' : 'text-[#1C2820]/50'}`}>
                      {nameError || 'Shown next to the photos you share with the couple.'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-14 rounded-2xl bg-[#2D4A3A] hover:bg-[#233A2E] text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_12px_32px_rgba(45,74,58,0.25)] hover:shadow-[0_16px_40px_rgba(45,74,58,0.32)] active:scale-[0.985] transition-all press disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Joining celebration...</span>
                      </>
                    ) : (
                      <>
                        <span>Join the celebration</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Apple 3-Pill Feature Grid */}
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white md:bg-[#FAF8F5] border border-[#1C2820]/[0.06] shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-[#2D4A3A]/[0.08] flex items-center justify-center text-[#2D4A3A] mb-1.5">
                    <Camera className="w-4 h-4" />
                  </div>
                  <span className="text-[12px] font-semibold text-[#1C2820]">Instant Sharing</span>
                  <span className="text-[10px] text-[#1C2820]/50 mt-0.5 leading-tight">No app needed</span>
                </div>

                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white md:bg-[#FAF8F5] border border-[#1C2820]/[0.06] shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-[#2D4A3A]/[0.08] flex items-center justify-center text-[#2D4A3A] mb-1.5">
                    <Images className="w-4 h-4" />
                  </div>
                  <span className="text-[12px] font-semibold text-[#1C2820]">Live Screen</span>
                  <span className="text-[10px] text-[#1C2820]/50 mt-0.5 leading-tight">Rolling slideshow</span>
                </div>

                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white md:bg-[#FAF8F5] border border-[#1C2820]/[0.06] shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-[#2D4A3A]/[0.08] flex items-center justify-center text-[#2D4A3A] mb-1.5">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-[12px] font-semibold text-[#1C2820]">Photo Contest</span>
                  <span className="text-[10px] text-[#1C2820]/50 mt-0.5 leading-tight">Vote & win</span>
                </div>
              </div>
            </div>

            {/* Subtle Host Sign-in Footer */}
            <div className="pt-2.5 border-t border-[#1C2820]/[0.06] text-center">
              <p className="text-[11px] text-[#1C2820]/50 flex flex-col items-center gap-0.5">
                <span>Hosting this celebration?</span>
                <Link href="/host/login" className="font-semibold text-[#2D4A3A] hover:underline">
                  Sign in as host
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

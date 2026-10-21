'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Camera,
  Heart,
  Play,
  ArrowRight,
  Lock,
  Sparkles,
  Shield,
  Users,
  Image as ImageIcon,
  Calendar,
  MapPin,
  QrCode,
  KeyRound,
  Check,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentEvent,
    events,
    setCurrentEventId,
    switchEventByCode,
    guestName,
    hasJoined,
    joinCelebration,
    memories,
    guestCount,
    reactionCount,
  } = useEvent();

  const [nameInput, setNameInput] = useState(guestName || '');
  const [nameError, setNameError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');

  useEffect(() => {
    if (guestName) {
      setNameInput(guestName);
    }
  }, [guestName]);

  // Detect QR code param (?code=...) and switch event or report invalid code
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      const cleanCode = codeParam.trim().toUpperCase();
      const match = events.find(
        (e) =>
          e.code.toUpperCase() === cleanCode ||
          e.slug.toUpperCase() === cleanCode ||
          e.id.toUpperCase() === cleanCode
      );
      if (match) {
        if (match.id !== currentEvent.id) {
          setCurrentEventId(match.id);
        }
        setCodeError('');
        setCodeSuccess(`Connected via QR code: ${match.title} (${match.code})`);
      } else {
        setShowCodeInput(true);
        setPasscodeInput(cleanCode);
        setCodeSuccess('');
        setCodeError(
          `Event code "${cleanCode}" does not exist. Please check your passcode with the host or select an active event below.`
        );
      }
    }
  }, [searchParams, events]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setNameError('Please enter your name so the couple knows who is sharing.');
      return;
    }
    setNameError('');
    joinCelebration(nameInput.trim());
    setEditingName(false);
    router.push(`/user/${currentEvent.id}/gallery`);
  };

  const handleSwitchCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    setCodeSuccess('');
    if (!passcodeInput.trim()) {
      setCodeError('Please enter a celebration ID or passcode');
      return;
    }
    const cleanInput = passcodeInput.trim();
    const match = events.find(
      (ev) =>
        ev.id.toLowerCase() === cleanInput.toLowerCase() ||
        ev.code.toLowerCase() === cleanInput.toLowerCase() ||
        ev.slug.toLowerCase() === cleanInput.toLowerCase()
    );
    if (match) {
      setCurrentEventId(match.id);
      setCodeSuccess('Celebration switched! Redirecting...');
      setPasscodeInput('');
      router.push(`/user/${match.id}`);
    } else {
      setCodeError(`No celebration found with ID or code "${cleanInput}"`);
    }
  };

  return (
    <main className="flex-1 bg-[#FAF8F5] text-[#1C2820] flex flex-col justify-between">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[#182B24] text-[#FAF8F5] py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        {/* Background Event Image with Dark Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={currentEvent.coverUrl}
            alt={currentEvent.title}
            className="w-full h-full object-cover opacity-30 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#182B24] via-[#182B24]/75 to-[#182B24]/90" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-widest uppercase text-[#9BC4A8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#74A886] animate-pulse" />
            <span>{currentEvent.date}</span>
            <span>·</span>
            <span>{currentEvent.venue}</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-7xl lg:text-8xl font-normal tracking-tight leading-none text-white drop-shadow-sm break-words">
            {currentEvent.title}
          </h1>

          <p className="font-serif italic text-xl sm:text-3xl text-white/90 max-w-2xl mx-auto font-light leading-relaxed">
            “Our day. Your eyes.”
          </p>

          <p className="text-xs sm:text-base text-white/75 max-w-xl mx-auto font-medium leading-relaxed">
            Share your candid photos, video toasts, and heartfelt well-wishes directly from your mobile browser. No app download needed.
          </p>
        </div>
      </div>

      {/* Main Join & Quick Navigation Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 pb-28 sm:pb-16 w-full space-y-8">
        {/* Join Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-10 shadow-xl border border-[#1C2820]/10 flex flex-col gap-6">
          {hasJoined && !editingName ? (
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="space-y-2 flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  <span>Joined Celebration</span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#1C2820] leading-tight">
                  Welcome back, {guestName}!
                </h2>
                <p className="text-xs sm:text-sm text-[#1C2820]/70 leading-relaxed font-medium">
                  You’re signed in to {currentEvent.title}’s live album. Snap a candid moment or browse the live guest stream.
                </p>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="text-xs font-bold text-[#2D4A3A] hover:underline pt-1 inline-block"
                >
                  Not {guestName}? Change your name →
                </button>
              </div>

              <div className="w-full md:w-80 space-y-2.5 shrink-0">
                <Link
                  href={`/user/${currentEvent.id}/upload`}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] active:scale-[0.98] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap / Upload Photo</span>
                </Link>
                <Link
                  href={`/user/${currentEvent.id}/gallery`}
                  className="w-full py-3 px-6 rounded-xl border border-[#1C2820]/20 hover:border-[#2D4A3A] bg-[#FAF8F5] hover:bg-[#E9EFEA]/50 text-[#1C2820] text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4 text-[#2D4A3A]" />
                  <span>Browse Live Gallery ({memories.length})</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              <div className="space-y-3 flex-1 text-center md:text-left">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full">
                  Join Celebration
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#1C2820] leading-tight">
                  Ready to celebrate?
                </h2>
                <p className="text-xs sm:text-sm text-[#1C2820]/70 leading-relaxed font-medium">
                  Enter your name below to attach your well-wishes and candid photos to {currentEvent.title}’s live album.
                </p>
              </div>

              <form onSubmit={handleJoin} className="w-full md:w-80 space-y-3 shrink-0">
                <div>
                  <label className="block text-[11px] font-bold text-[#1C2820]/75 uppercase tracking-wide mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="e.g. Clara Vance"
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 transition-all shadow-sm ${
                      nameError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                        : 'border-[#1C2820]/20 focus:border-[#2D4A3A] focus:ring-[#2D4A3A]/20'
                    }`}
                  />
                  {nameError && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1.5">
                      {nameError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] active:scale-[0.98] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Enter Celebration</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-[#1C2820]/60 pt-1">
                  <Lock className="w-3 h-3 text-[#2D4A3A]" />
                  <span>Private vault uploads available for couple</span>
                </div>
              </form>
            </div>
          )}

          {/* Passcode Toggle / Event Switcher */}
          <div className="border-t border-[#1C2820]/10 pt-4">
            {!showCodeInput ? (
              <div className="space-y-2 text-center">
                {codeSuccess && (
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    {codeSuccess}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowCodeInput(true)}
                  className="text-xs font-semibold text-[#2D4A3A] hover:underline flex items-center justify-center gap-1.5 w-full py-1 text-center transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Have an event passcode? Enter here</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#1C2820]/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C2820]">
                    <KeyRound className="w-4 h-4 text-[#2D4A3A]" />
                    <span>Enter Celebration Passcode</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCodeInput(false);
                      setCodeError('');
                    }}
                    className="text-[11px] text-[#1C2820]/60 hover:text-[#1C2820] font-semibold"
                  >
                    Hide
                  </button>
                </div>

                <form onSubmit={handleSwitchCode} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={passcodeInput}
                    onChange={(e) => {
                      setPasscodeInput(e.target.value.toUpperCase());
                      setCodeError('');
                    }}
                    placeholder="e.g. JANDS26 or SARAH26"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#1C2820]/20 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-[#2D4A3A] bg-white text-[#1C2820]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#2D4A3A] hover:bg-[#1F3628] text-white text-xs font-bold transition-all shadow-sm shrink-0"
                  >
                    Switch Celebration
                  </button>
                </form>

                {codeError && (
                  <p className="text-[11px] text-red-600 font-semibold">{codeError}</p>
                )}
                {codeSuccess && (
                  <p className="text-[11px] text-emerald-700 font-semibold">{codeSuccess}</p>
                )}

                <div className="flex items-center gap-2 text-[11px] text-[#1C2820]/65 flex-wrap pt-1">
                  <span className="font-medium">Active:</span>
                  <span className="px-2 py-0.5 rounded bg-[#2D4A3A]/10 text-[#2D4A3A] font-bold text-[10px]">
                    {currentEvent.title} ({currentEvent.code})
                  </span>
                  {events.filter((e) => e.id !== currentEvent.id).length > 0 && (
                    <>
                      <span className="text-[#1C2820]/40">·</span>
                      <span className="font-medium">Other codes:</span>
                      {events
                        .filter((e) => e.id !== currentEvent.id)
                        .map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              switchEventByCode(ev.code);
                            }}
                            className="px-2 py-0.5 rounded border border-[#1C2820]/15 bg-white text-[10px] font-bold text-[#1C2820]/80 hover:border-[#2D4A3A] transition-colors"
                          >
                            {ev.code}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Event Stats Counter */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#1C2820]/10 shadow-sm">
            <div className="font-serif text-2xl sm:text-4xl text-[#2D4A3A] font-bold">
              {memories.length}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-[#1C2820]/65 mt-1">
              Memories Shared
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#1C2820]/10 shadow-sm">
            <div className="font-serif text-2xl sm:text-4xl text-[#2D4A3A] font-bold">
              {guestCount}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-[#1C2820]/65 mt-1">
              Guests Joined
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#1C2820]/10 shadow-sm">
            <div className="font-serif text-2xl sm:text-4xl text-[#2D4A3A] font-bold">
              {reactionCount.toLocaleString()}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-[#1C2820]/65 mt-1">
              Loves & Reactions
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href={`/user/${currentEvent.id}/gallery`}
            className="group bg-white p-5 rounded-2xl border border-[#1C2820]/10 hover:border-[#2D4A3A] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1C2820] mb-1">
                Guest Gallery
              </h3>
              <p className="text-xs text-[#1C2820]/65 font-medium leading-relaxed">
                Browse candid photos, read stories, and heart your favorites.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#2D4A3A]">
              <span>View Gallery</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href={`/user/${currentEvent.id}/upload`}
            className="group bg-white p-5 rounded-2xl border border-[#1C2820]/10 hover:border-[#2D4A3A] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1C2820] mb-1">
                Upload Moment
              </h3>
              <p className="text-xs text-[#1C2820]/65 font-medium leading-relaxed">
                Take a photo or choose from library with your personalized well-wish.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#2D4A3A]">
              <span>Snap / Upload</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href={`/user/${currentEvent.id}/slideshow`}
            className="group bg-[#182B24] text-white p-5 rounded-2xl border border-white/10 hover:border-[#74A886] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/10 text-[#74A886] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white mb-1">
                Live Slideshow
              </h3>
              <p className="text-xs text-white/70 font-medium leading-relaxed">
                Watch memories rolling in real-time with live floating emoji reactions.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#74A886]">
              <span>Watch Live</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/host/events"
            className="group bg-white p-5 rounded-2xl border border-[#1C2820]/10 hover:border-[#2D4A3A] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1C2820] mb-1">
                Host Portal
              </h3>
              <p className="text-xs text-[#1C2820]/65 font-medium leading-relaxed">
                Manage celebrations, table QR codes, moderation vault, and ZIP export.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#2D4A3A]">
              <span>Host Events</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-serif text-2xl">Loading celebration...</div>}>
      <HomeContent />
    </Suspense>
  );
}

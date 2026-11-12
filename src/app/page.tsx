'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Images,
  Trophy,
  Download,
  ArrowRight,
  Loader2,
  Sparkles,
  QrCode,
  X,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function HomePage() {
  const router = useRouter();
  const { lookupEvent, isHostLoggedIn, hostUser, hasJoined } = useEvent();

  // If host users are already logged in, bring them straight to the app
  useEffect(() => {
    if (isHostLoggedIn && hostUser) {
      router.replace('/host/events');
    }
  }, [isHostLoggedIn, hostUser, router]);

  // Guest Join State
  const [guestCode, setGuestCode] = useState('');
  const [guestError, setGuestError] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const guestInputRef = useRef<HTMLInputElement>(null);

  // Guest submit handler
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = guestCode.trim();
    if (!clean) {
      setGuestError('Please enter your 6-digit PIN or event code.');
      if (guestInputRef.current) guestInputRef.current.focus();
      return;
    }

    setGuestError('');
    setGuestLoading(true);

    try {
      // Clean input in case user pasted a URL e.g. /user/482910
      let codeToLookup = clean;
      if (clean.includes('/user/')) {
        const afterUser = clean.split('/user/')[1] || '';
        codeToLookup = afterUser.split('/')[0].split('?')[0];
      }

      const found = await lookupEvent(codeToLookup);
      if (found) {
        // Direct guests to the actual celebration:
        // If already joined with a name, go straight to gallery, otherwise to the event join onboarding
        const destination = hasJoined ? `/user/${found.id}/gallery` : `/user/${found.id}`;
        router.push(destination);
        return;
      }
      setGuestError('Event not found. Please double-check the 6-digit PIN.');
    } catch (err) {
      setGuestError('Failed to verify code. Please check your internet connection.');
    } finally {
      setGuestLoading(false);
    }
  };

  if (isHostLoggedIn && hostUser) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2D4A3A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] text-[#1C2820] overflow-x-hidden selection:bg-[#2D4A3A]/15 selection:text-[#1C2820]">
      {/* Background Ambient Aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[#2D4A3A]/[0.07] via-[#2D4A3A]/[0.03] to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[40%] -right-40 w-[600px] h-[600px] bg-[#E9EFEA]/60 rounded-full blur-3xl" />
        <div className="absolute top-[65%] -left-40 w-[600px] h-[600px] bg-[#FAF8F5] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* ========================================================= */}
        {/* SECTION 1: HERO & TRUST HIGHLIGHTS                        */}
        {/* ========================================================= */}
        <section className="pt-12 sm:pt-20 md:pt-24 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          {/* Apple Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#1C2820]/[0.08] shadow-[0_2px_10px_rgba(45,74,58,0.06)] mb-6 animate-fade-up">
            <Sparkles className="w-4 h-4 text-[#2D4A3A]" />
            <span className="text-[12px] font-semibold tracking-wide text-[#1C2820]/80">
              Modern Wedding Photo Sharing & Live Experience
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight text-[#1C2820] leading-[1.08] max-w-4xl mx-auto animate-fade-up">
            Every perspective of your day, gathered into one story.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg md:text-xl text-[#1C2820]/70 max-w-2xl mx-auto leading-relaxed animate-fade-up">
            Guest photo sharing with zero app downloads. Project a real-time live slideshow on the big screen, run interactive photo contests, and download original print-ready memories.
          </p>

          {/* 4 Trust Highlights */}
          <div className="mt-12 pt-8 border-t border-[#1C2820]/[0.08] grid grid-cols-2 md:grid-cols-4 gap-4 text-center animate-fade-up">
            <div className="space-y-1">
              <p className="font-serif text-2xl sm:text-3xl font-medium text-[#2D4A3A]">No App Needed</p>
              <p className="text-[12px] text-[#1C2820]/60">Upload directly in Safari & Chrome</p>
            </div>
            <div className="space-y-1">
              <p className="font-serif text-2xl sm:text-3xl font-medium text-[#2D4A3A]">Live Slideshow</p>
              <p className="text-[12px] text-[#1C2820]/60">Real-time projector sync</p>
            </div>
            <div className="space-y-1">
              <p className="font-serif text-2xl sm:text-3xl font-medium text-[#2D4A3A]">Photo Contest</p>
              <p className="text-[12px] text-[#1C2820]/60">Live guest voting rounds</p>
            </div>
            <div className="space-y-1">
              <p className="font-serif text-2xl sm:text-3xl font-medium text-[#2D4A3A]">100% Full-Res</p>
              <p className="text-[12px] text-[#1C2820]/60">1-click uncompressed ZIP vault</p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: GUEST PIN (SPREAD ACROSS COLUMNS)              */}
        {/* ========================================================= */}
        <section id="guest-pin" className="py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-24">
          <div className="rounded-[32px] sm:rounded-[36px] bg-white border border-[#1C2820]/[0.08] shadow-[0_24px_70px_rgba(45,74,58,0.12)] p-6 sm:p-10 lg:p-12 animate-fade-up">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Column: Guest Context & Value Props */}
              <div className="lg:col-span-7 space-y-4 sm:space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E9EFEA] border border-[#2D4A3A]/10 text-[11px] font-bold uppercase tracking-wider text-[#2D4A3A]">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Guest Instant Access</span>
                </div>

                <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-medium tracking-tight text-[#1C2820] leading-[1.1]">
                  Join your friends’ celebration in seconds.
                </h2>

                <p className="text-sm sm:text-base text-[#1C2820]/70 leading-relaxed max-w-xl">
                  Scan the QR code at your table, or enter your 6-digit PIN or event passcode below to upload candid moments straight to the live slideshow.
                </p>

                {/* 3 Apple Capability Pills */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/[0.06] flex items-center sm:flex-col sm:items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#2D4A3A]/[0.08] text-[#2D4A3A] flex items-center justify-center shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1C2820]">Zero Apps</p>
                      <p className="text-[11px] text-[#1C2820]/50">Safari & Chrome</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/[0.06] flex items-center sm:flex-col sm:items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#2D4A3A]/[0.08] text-[#2D4A3A] flex items-center justify-center shrink-0">
                      <Images className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1C2820]">Live Screen</p>
                      <p className="text-[11px] text-[#1C2820]/50">Venue projector</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/[0.06] flex items-center sm:flex-col sm:items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#2D4A3A]/[0.08] text-[#2D4A3A] flex items-center justify-center shrink-0">
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1C2820]">Photo Contest</p>
                      <p className="text-[11px] text-[#1C2820]/50">Live guest voting</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Code Console */}
              <div className="lg:col-span-5 bg-[#FAF8F5] p-5 sm:p-7 rounded-2xl border border-[#1C2820]/[0.08] space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1C2820]/75">
                    Event Passcode
                  </span>
                  <span className="text-[11px] text-[#1C2820]/45">6-digit PIN</span>
                </div>

                <form onSubmit={handleGuestSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        ref={guestInputRef}
                        id="guest-event-code"
                        type="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        enterKeyHint="go"
                        placeholder="e.g. 482 910 or EVENT-1"
                        value={guestCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGuestCode(val);
                          if (guestError) setGuestError('');
                        }}
                        className={`w-full h-14 pl-4 pr-11 rounded-xl bg-white border text-center sm:text-left text-[18px] sm:text-[19px] font-mono font-bold tracking-wider text-[#1C2820] placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[14px] placeholder:text-[#1C2820]/35 focus:outline-none focus:ring-4 transition-all ${
                          guestError
                            ? 'border-red-400 focus:ring-red-100'
                            : 'border-[#1C2820]/15 focus:border-[#2D4A3A] focus:ring-[#2D4A3A]/10'
                        }`}
                      />
                      {guestCode.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setGuestCode('');
                            if (guestInputRef.current) guestInputRef.current.focus();
                          }}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#1C2820]/35 hover:text-[#1C2820]/75"
                          aria-label="Clear code"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {guestError && (
                      <p className="px-1 text-[12px] text-red-600 font-medium">
                        {guestError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={guestLoading}
                    className="w-full h-14 rounded-xl bg-[#2D4A3A] hover:bg-[#233A2E] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_28px_rgba(45,74,58,0.2)] hover:shadow-[0_14px_34px_rgba(45,74,58,0.25)] active:scale-[0.985] transition-all press disabled:opacity-60"
                  >
                    {guestLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Finding celebration...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter Celebration</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: KEY FEATURES (APPLE 4-BENTO GRID)               */}
        {/* ========================================================= */}
        <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3.5 py-1.5 rounded-full">
              Crafted for Real Weddings
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-[#1C2820] mt-3">
              Everything couples and guests need, nothing they don’t.
            </h2>
            <p className="mt-3 text-base text-[#1C2820]/65 leading-relaxed">
              Designed to disappear into the background so you and your guests can stay present in the moment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="rounded-[32px] bg-white border border-[#1C2820]/[0.08] p-8 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-[#1C2820]">
                Zero-App Guest Sharing
              </h3>
              <p className="text-sm text-[#1C2820]/70 leading-relaxed">
                Guests never need to download an app from the App Store or remember a password. They simply scan the QR code with their camera app and upload directly from their photo gallery.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-[#2D4A3A]">
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">iPhone Live Photos</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">HEIC & High-Res</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Video Clips</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="rounded-[32px] bg-white border border-[#1C2820]/[0.08] p-8 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center">
                <Images className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-[#1C2820]">
                Live Venue Projector Feed
              </h3>
              <p className="text-sm text-[#1C2820]/70 leading-relaxed">
                Plug your laptop or venue projector in and watch the room come alive. As guests snap photos during cocktail hour, dinner, and dancing, the slideshow cycles through moments automatically.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-[#2D4A3A]">
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Auto-Advancing</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Immersive Full Screen</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Live Well-Wishes</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-[32px] bg-white border border-[#1C2820]/[0.08] p-8 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-[#1C2820]">
                Live Photo Contests & Voting
              </h3>
              <p className="text-sm text-[#1C2820]/70 leading-relaxed">
                Turn your wedding into an interactive experience. Launch timed contests like "Oldest photo with the bride" or "Wildest dance floor moment". Guests vote live and winners are celebrated.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-[#2D4A3A]">
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Host Countdown Timer</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Live Heart Voting</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Confetti Reveal</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="rounded-[32px] bg-white border border-[#1C2820]/[0.08] p-8 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-[#1C2820]">
                Original-Res Vault & ZIP Export
              </h3>
              <p className="text-sm text-[#1C2820]/70 leading-relaxed">
                Social media platforms compress and shrink your photos. Memory Aisle stores each file in its original captured quality so you can print albums, frame photos, and keep them for a lifetime.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-[#2D4A3A]">
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">1-Click Full ZIP</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Zero Downscaling</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1C2820]/10">Forever Cloud Archive</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: HOW IT WORKS (3 SIMPLE STEPS)                   */}
        {/* ========================================================= */}
        <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-[#1C2820]/[0.08] scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3.5 py-1.5 rounded-full">
              Seamless Workflow
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-[#1C2820] mt-3">
              How Memory Aisle Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative">
            {/* Step 1 */}
            <div className="space-y-3 p-6 rounded-3xl bg-white border border-[#1C2820]/[0.06] shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center font-serif text-lg font-bold mx-auto shadow-md">
                1
              </div>
              <h3 className="font-serif text-xl font-medium text-[#1C2820]">Create & Display</h3>
              <p className="text-xs sm:text-sm text-[#1C2820]/65 leading-relaxed">
                Hosts set up their celebration in 60 seconds, choose photo prompts, and place generated QR table cards at every seat.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3 p-6 rounded-3xl bg-white border border-[#1C2820]/[0.06] shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center font-serif text-lg font-bold mx-auto shadow-md">
                2
              </div>
              <h3 className="font-serif text-xl font-medium text-[#1C2820]">Guests Snap & Share</h3>
              <p className="text-xs sm:text-sm text-[#1C2820]/65 leading-relaxed">
                Guests scan the code, enter their name, and immediately share candid pictures, videos, and heartfelt messages.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3 p-6 rounded-3xl bg-white border border-[#1C2820]/[0.06] shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center font-serif text-lg font-bold mx-auto shadow-md">
                3
              </div>
              <h3 className="font-serif text-xl font-medium text-[#1C2820]">Live Screen & Vault</h3>
              <p className="text-xs sm:text-sm text-[#1C2820]/65 leading-relaxed">
                Watch memories light up the big screen live during your reception, then download every single uncompressed file in a ZIP.
              </p>
            </div>
          </div>

          {/* Bottom Banner */}
          <div className="mt-14 p-8 sm:p-12 rounded-[32px] bg-gradient-to-br from-[#182B24] via-[#22392D] to-[#2D4A3A] text-white text-center shadow-xl space-y-4">
            <h3 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight">
              Ready to capture every angle of your celebration?
            </h3>
            <p className="text-white/80 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Create your event today or join your friends’ wedding celebration right now.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#guest-pin"
                className="px-6 h-12 rounded-xl bg-white text-[#182B24] text-xs font-bold flex items-center gap-2 hover:bg-white/90 transition-all press"
              >
                <span>Enter with PIN</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/host/signup"
                className="px-6 h-12 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2 hover:bg-white/20 transition-all press"
              >
                <span>Create Host Account</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* FOOTER                                                    */}
        {/* ========================================================= */}
        <footer className="border-t border-[#1C2820]/[0.08] bg-white py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
              <span className="w-7 h-7 rounded-[8px] bg-[#2D4A3A] text-white flex items-center justify-center font-serif text-base font-bold">
                M
              </span>
              <span className="font-serif text-xl tracking-tight font-medium text-[#1C2820]">
                Memory Aisle
              </span>
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#1C2820]/65">
              <a href="#features" className="hover:text-[#1C2820] transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-[#1C2820] transition-colors">
                How It Works
              </a>
              <Link href="/host/login" className="hover:text-[#1C2820] transition-colors">
                Host Sign In
              </Link>
              <Link href="/host/signup" className="hover:text-[#1C2820] transition-colors">
                Create Event
              </Link>
            </div>

            <p className="text-[11px] text-[#1C2820]/45 text-center md:text-right">
              © 2026 Memory Aisle. Built for modern weddings.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

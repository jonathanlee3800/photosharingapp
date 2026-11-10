'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Pause, ChevronRight, ChevronLeft, Maximize2, X, Pin } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { generateQrDataUrl } from '@/lib/qrHelper';
import { formatPin } from '@/lib/pin';
import SlideStage from '@/components/SlideStage';

const CONTROLS_HIDE_MS = 3000;

/** The big screen: one photo at a time on a calm stage, with a single card showing how to join. */
export default function ProjectorScreen({ exitHref }: { exitHref?: string }) {
  const {
    currentEvent,
    isHostLoggedIn,
    votingRound,
    publicMemories,
    activeSlideMemory: active,
    spotlightId,
    floatingEmojis,
    cycleNextSlide,
    cyclePrevSlide,
    isSlideshowPlaying,
    toggleSlideshowPlaying,
  } = useEvent();
  // Only the host may skip, pause or resume the slideshow; anyone else just watches
  const canControl = isHostLoggedIn;
  const roundTotalVotes = currentEvent.roundVoteTotal ?? 0;

  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    generateQrDataUrl(`${window.location.origin}/user/${currentEvent.id}`, { width: 320, margin: 1 }).then(setQrDataUrl);
  }, [currentEvent.id]);

  // Controls and the pointer appear when the mouse moves, then get out of the way
  const [showControls, setShowControls] = useState(true);
  useEffect(() => {
    let timer = setTimeout(() => setShowControls(false), CONTROLS_HIDE_MS);
    const wake = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), CONTROLS_HIDE_MS);
    };
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  // Keyboard shortcuts for presenting (host only)
  useEffect(() => {
    if (!canControl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        cycleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cyclePrevSlide();
      } else if (e.key === 'p' || e.key === 'P') {
        toggleSlideshowPlaying();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!active) return null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const controlClass = 'w-11 h-11 rounded-full flex items-center justify-center text-[#2D4A3A] hover:bg-[#E9EFEA] transition-colors';

  return (
    <div
      className={`relative w-full h-full min-h-[100dvh] overflow-hidden bg-[#FAF8F5] text-[#1C2820] font-sans select-none flex flex-col ${
        showControls ? '' : 'cursor-none'
      }`}
    >
      {/* Status */}
      <div className="relative z-10 shrink-0 h-[72px] px-10 flex items-center justify-between">
        <span className="font-serif text-[26px] font-medium tracking-tight text-[#1C2820] truncate">{currentEvent.title}</span>
        {votingRound.isActive ? (
          <span className="h-10 px-4 rounded-full bg-[#E9EFEA] flex items-center gap-2.5 text-[15px] font-medium text-[#2D4A3A]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D4A3A] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2D4A3A]" />
            </span>
            <span className="tabular-nums font-semibold">{roundTotalVotes}</span>
            <span className="text-[#2D4A3A]/70">{roundTotalVotes === 1 ? 'total vote' : 'total votes'}</span>
          </span>
        ) : spotlightId ? (
          <span className="h-10 px-4 rounded-full bg-[#E9EFEA] flex items-center gap-2 text-[15px] font-medium text-[#2D4A3A]">
            <Pin className="w-3.5 h-3.5" /> Pinned
          </span>
        ) : null}
      </div>

      {/* The photo */}
      <div className="relative z-10 flex-1 min-h-0 mx-10">
        <SlideStage active={active} memories={publicMemories} />
      </div>

      {/* Who shared it, and how to join */}
      <div className="relative z-10 shrink-0 px-10 pt-6 pb-8 flex items-end justify-between gap-10">
        <div key={active.id} className="min-w-0 flex-1 animate-[slideFade_900ms_ease-out_both]">
          {active.caption && (
            <h2 className="font-serif text-[clamp(30px,3.6vw,56px)] font-medium tracking-tight leading-[1.08] line-clamp-2">
              {active.caption}
            </h2>
          )}
          <p className="mt-2 text-[clamp(15px,1.4vw,21px)] text-[#1C2820]/55 truncate">
            By <span className="text-[#2D4A3A] font-semibold">{active.guestName}</span>
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-5 p-3 pl-6 rounded-[28px] bg-white border border-[#1C2820]/[0.06] shadow-[0_16px_50px_rgba(45,74,58,0.12)]">
          <div className="text-right">
            <p className="text-[15px] font-medium text-[#1C2820]/60 leading-tight">www.memorieaisle.com/join</p>
            <p className="mt-1.5 text-[clamp(30px,3vw,44px)] font-semibold tracking-tight leading-none tabular-nums text-[#2D4A3A]">
              {formatPin(currentEvent.code)}
            </p>
            <p className="mt-1.5 text-[13px] text-[#1C2820]/45 leading-tight">PIN, or scan the QR code</p>
          </div>
          <div className="w-[108px] h-[108px] bg-white rounded-[18px] shrink-0">
            {qrDataUrl && <img src={qrDataUrl} alt={`QR code for ${currentEvent.title}`} className="w-full h-full object-contain" />}
          </div>
        </div>
      </div>

      {/* Reactions */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {floatingEmojis.map((item) => (
          <div key={item.id} style={{ left: `${item.left}%` }} className="absolute bottom-44 text-6xl animate-rise">
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Controls fade in when the mouse moves */}
      <div
        className={`absolute z-30 top-4 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/90 backdrop-blur-2xl border border-[#1C2820]/[0.08] shadow-[0_12px_40px_rgba(45,74,58,0.18)]">
          {exitHref && (
            <Link href={exitHref} className={controlClass} title="Back to overview" aria-label="Back to overview">
              <X className="w-[18px] h-[18px]" />
            </Link>
          )}
          {canControl && (
            <>
              <button type="button" onClick={cyclePrevSlide} className={controlClass} title="Previous (Left arrow)" aria-label="Previous photo">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={toggleSlideshowPlaying}
                className={controlClass}
                title={isSlideshowPlaying ? 'Pause (P)' : 'Play (P)'}
                aria-label={isSlideshowPlaying ? 'Pause slideshow' : 'Play slideshow'}
              >
                {isSlideshowPlaying ? <Pause className="w-[18px] h-[18px]" /> : <Play className="w-[18px] h-[18px]" />}
              </button>
              <button type="button" onClick={cycleNextSlide} className={controlClass} title="Next (Right arrow or Space)" aria-label="Next photo">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <button type="button" onClick={toggleFullscreen} className={controlClass} title="Full screen" aria-label="Full screen">
            <Maximize2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

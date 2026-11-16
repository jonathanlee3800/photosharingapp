'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  X,
  Pin,
  Tv,
  QrCode,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { generateQrDataUrl } from '@/lib/qrHelper';
import { formatPin } from '@/lib/pin';
import SlideStage from '@/components/SlideStage';

const CONTROLS_HIDE_MS = 1000;

/**
 * Big Screen Projector:
 * - Full-bleed ambient color aura covering the entire screen edge-to-edge.
 * - Phone responsive: adapts hero bounds, bottom join card, and controls for mobile portrait & landscape.
 * - Touch swipe gestures for seamless navigation on phones and tablets.
 * - Standardized 2-format carousel (vertical 3:4 and horizontal 4:3) with tucked side cards.
 * - Nav controls moved down to bottom center (auto-hides on idle).
 * - Cinema Mode toggle: Hides QR code / PIN / join widgets to showcase only the photos & well-wishes.
 */
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

  const canControl = isHostLoggedIn;
  const roundTotalVotes = currentEvent.roundVoteTotal ?? 0;

  // Cinema Mode: when active, hides QR code, PIN and extra widgets to display ONLY photos & well-wishes
  const [isCleanMode, setIsCleanMode] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    generateQrDataUrl(`${window.location.origin}/user/${currentEvent.id}`, {
      width: 320,
      margin: 1,
    }).then(setQrDataUrl);
  }, [currentEvent.id]);

  // Controls appear on mouse/touch interaction, then fade out after 3 seconds of inactivity
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Keyboard shortcuts for seamless presenting
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        cycleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cyclePrevSlide();
      } else if (e.key === 'p' || e.key === 'P') {
        if (canControl) toggleSlideshowPlaying();
      } else if (e.key === 'q' || e.key === 'Q' || e.key === 'c' || e.key === 'C') {
        setIsCleanMode((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canControl, cycleNextSlide, cyclePrevSlide, toggleSlideshowPlaying]);

  // Touch swipe support for mobile phones and touchscreens
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Horizontal swipe gesture detection (minimum 40px swipe)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        cycleNextSlide();
      } else {
        cyclePrevSlide();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!active) return null;

  const controlClass =
    'w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-[#2D4A3A] hover:bg-[#E9EFEA] transition-colors shrink-0';

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-full min-h-[100dvh] overflow-hidden bg-[#FAF8F5] text-[#1C2820] font-sans select-none flex flex-col justify-between ${
        showControls ? '' : 'cursor-none'
      }`}
    >
      {/* 1. Full-Bleed Ambient Aura extending across the ENTIRE page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        {active.type === 'video' ? (
          <video
            key={`ambient-${active.id}`}
            src={active.url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover blur-[80px] sm:blur-[140px] opacity-40 scale-125 transform-gpu transition-opacity duration-1000"
          />
        ) : (
          <img
            key={`ambient-${active.id}`}
            src={active.url}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover blur-[80px] sm:blur-[140px] opacity-40 scale-125 transform-gpu animate-ambient-pulse transition-opacity duration-1000"
          />
        )}
        {/* Soft wash overlay matching WithLove palette */}
        <div className="absolute inset-0 bg-[#FAF8F5]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5]/85 via-[#FAF8F5]/15 to-[#FAF8F5]/50" />
      </div>

      {/* 2. Top Header (Airy, discreet, hidden in Clean Cinema Mode) */}
      {!isCleanMode && (
        <div className="relative z-10 shrink-0 h-[44px] sm:h-[54px] px-4 sm:px-10 flex items-center justify-between">
          <span className="font-serif text-[18px] sm:text-[24px] font-medium tracking-tight text-[#1C2820] truncate drop-shadow-xs max-w-[55vw] sm:max-w-none">
            {currentEvent.title}
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            {votingRound.isActive ? (
              <span className="h-7.5 sm:h-8.5 px-2.5 sm:px-3 rounded-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-sm flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[13px] font-medium text-[#2D4A3A]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D4A3A] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2D4A3A]" />
                </span>
                <span className="tabular-nums font-semibold">{roundTotalVotes}</span>
                <span className="text-[#2D4A3A]/70">{roundTotalVotes === 1 ? 'vote' : 'votes'}</span>
              </span>
            ) : spotlightId ? (
              <span className="h-7.5 sm:h-8.5 px-2.5 sm:px-3 rounded-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-sm flex items-center gap-1.5 text-[11px] sm:text-[13px] font-medium text-[#2D4A3A]">
                <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Pinned
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Screen Edge Ambient Blending Vignettes (Dissolves carousel into sides of screen) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 sm:w-32 md:w-48 bg-gradient-to-r from-[#FAF8F5]/85 via-[#FAF8F5]/30 to-[#FAF8F5]/0 z-25" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 sm:w-32 md:w-48 bg-gradient-to-l from-[#FAF8F5]/85 via-[#FAF8F5]/30 to-[#FAF8F5]/0 z-25" />

      {/* 3. The Photo Carousel Stage (Maximized Hero & Infinite Filmstrip Ribbon) */}
      <div
        className={`relative z-10 flex-1 min-h-0 w-full flex items-center justify-center ${
          isCleanMode ? 'my-0 sm:my-1' : 'my-0 sm:my-1'
        }`}
      >
        <div
          className={`w-full h-full flex items-center justify-center ${
            isCleanMode
              ? 'max-h-[66vh] sm:max-h-[82vh] md:max-h-[86vh] lg:max-h-[89vh]'
              : 'max-h-[52vh] sm:max-h-[74vh] md:max-h-[79vh] lg:max-h-[83vh]'
          }`}
        >
          <SlideStage
            active={active}
            memories={publicMemories}
            showPeeks={true}
            onPrev={cyclePrevSlide}
            onNext={cycleNextSlide}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Well-Wishes & Join QR Code */}
      <div
        className={`relative z-10 shrink-0 px-4 sm:px-8 md:px-12 ${
          isCleanMode ? 'pt-1 pb-16 sm:pb-6' : 'pt-1 pb-16 sm:pb-5'
        }`}
      >
        {isCleanMode ? (
          /* Cinema Clean Mode: ONLY the photos, well-wishes & guest author centered */
          <div key={active.id} className="max-w-4xl mx-auto text-center px-2 sm:px-4 animate-fade-up">
            {active.caption && (
              <h2 className="font-serif text-[clamp(18px,4vw,44px)] font-medium tracking-tight leading-[1.2] text-[#1C2820] drop-shadow-xs">
                “{active.caption}”
              </h2>
            )}
            <p className="mt-1 text-[clamp(12px,1.2vw,17px)] text-[#1C2820]/70 font-medium">
              Shared by <span className="text-[#2D4A3A] font-semibold">{active.guestName}</span>
            </p>
          </div>
        ) : (
          /* Standard Mode: Well-wishes on the left, Join Card & QR code on the right (responsive on phone) */
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 sm:gap-12">
            <div key={active.id} className="min-w-0 flex-1 animate-fade-up text-left">
              {active.caption && (
                <h2 className="font-serif text-[clamp(17px,3vw,44px)] font-medium tracking-tight leading-[1.18] line-clamp-2 text-[#1C2820] drop-shadow-xs">
                  {active.caption}
                </h2>
              )}
              <p className="mt-1 text-[clamp(12px,1.2vw,18px)] text-[#1C2820]/65 truncate">
                Shared by <span className="text-[#2D4A3A] font-semibold">{active.guestName}</span>
              </p>
            </div>

            {/* Join QR Card */}
            <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 sm:gap-4 p-2 sm:p-2.5 pl-3.5 sm:pl-5 rounded-[18px] sm:rounded-[22px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_12px_35px_rgba(28,40,32,0.10)] sm:shadow-[0_16px_45px_rgba(28,40,32,0.12)]">
              <div className="text-left sm:text-right">
                <p className="text-[12px] sm:text-[14px] font-medium text-[#1C2820]/60 leading-tight">
                  <span className="hidden sm:inline">www.memorieaisle.com/join</span>
                  <span className="sm:hidden">Join Event</span>
                </p>
                <p className="mt-0.5 sm:mt-1 text-[20px] sm:text-[clamp(24px,2.4vw,34px)] font-semibold tracking-tight leading-none tabular-nums text-[#2D4A3A]">
                  {formatPin(currentEvent.code)}
                </p>
                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[12px] text-[#1C2820]/45 leading-tight">
                  <span className="hidden sm:inline">PIN, or scan the QR code</span>
                  <span className="sm:hidden">PIN, or scan QR</span>
                </p>
              </div>
              <div className="w-[52px] h-[52px] sm:w-[92px] sm:h-[92px] bg-white rounded-[12px] sm:rounded-[16px] p-1 shrink-0 border border-[#1C2820]/5 shadow-xs">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${currentEvent.title}`}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Floating Emoji Reactions */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-40 text-5xl sm:text-6xl animate-rise"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* 6. Host Controls Bar (MOVED DOWN TO BOTTOM CENTER) */}
      <div
        className={`absolute z-30 bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 transition-opacity duration-300 max-w-[95vw] ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-white/95 backdrop-blur-2xl border border-[#1C2820]/[0.08] shadow-[0_12px_40px_rgba(45,74,58,0.18)]">
          {exitHref && (
            <Link
              href={exitHref}
              className={controlClass}
              title="Back to overview"
              aria-label="Back to overview"
            >
              <X className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </Link>
          )}
          {canControl && (
            <>
              <button
                type="button"
                onClick={cyclePrevSlide}
                className={controlClass}
                title="Previous (Left arrow)"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                type="button"
                onClick={toggleSlideshowPlaying}
                className={controlClass}
                title={isSlideshowPlaying ? 'Pause (P)' : 'Play (P)'}
                aria-label={isSlideshowPlaying ? 'Pause slideshow' : 'Play slideshow'}
              >
                {isSlideshowPlaying ? (
                  <Pause className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                ) : (
                  <Play className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                )}
              </button>
              <button
                type="button"
                onClick={cycleNextSlide}
                className={controlClass}
                title="Next (Right arrow or Space)"
                aria-label="Next photo"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          {/* Cinema / Clean Mode Toggle (Hides QR code & join chrome) */}
          <button
            type="button"
            onClick={() => setIsCleanMode((prev) => !prev)}
            className={`${controlClass} ${isCleanMode ? 'bg-[#E9EFEA] text-[#2D4A3A]' : ''}`}
            title={isCleanMode ? 'Show QR Code & Join Info (Q)' : 'Cinema Mode: Photos only (Q)'}
            aria-label={isCleanMode ? 'Show QR Code' : 'Cinema Mode'}
          >
            {isCleanMode ? (
              <QrCode className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            ) : (
              <Tv className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={controlClass}
            title="Full screen (F)"
            aria-label="Full screen"
          >
            <Maximize2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

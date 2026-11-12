'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pin, Trophy } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import SlideStage from '@/components/SlideStage';

const REACTION_EMOJIS = ['❤️', '🥂', '✨', '😂', '🎉'];

/**
 * Live Slideshow on the Guest Portal:
 * - Identical visual aesthetic to the host projector screen (ambient aura, cinematic ribbon, edge vignettes).
 * - Scaled photo stage height to comfortably accommodate guest reactions & captions.
 * - Glass reaction pill dock to send live emoji reactions to the big screen.
 * - Syncs automatically with the host projector, with touch swipe support.
 */
export default function SlideshowPage() {
  const {
    publicMemories,
    activeSlideMemory: liveActive,
    spotlightId,
    votingRound,
    floatingEmojis,
    sendReaction,
    cycleNextSlide,
    cyclePrevSlide,
    isHostLoggedIn,
  } = useEvent();

  // Local browsing override: allows guests to step through photos, or stay synced with the big screen
  const [localId, setLocalId] = useState<string | null>(null);

  // If a photo is spotlighted/pinned on the big screen, immediately sync to it
  useEffect(() => {
    if (spotlightId) setLocalId(null);
  }, [spotlightId]);

  const active = (localId && publicMemories.find((m) => m.id === localId)) || liveActive;
  const isLiveSync = !localId || localId === liveActive?.id;

  const handlePrev = () => {
    if (isHostLoggedIn) {
      cyclePrevSlide();
      return;
    }
    if (publicMemories.length < 2) return;
    const idx = publicMemories.findIndex((m) => m.id === active.id);
    const prevIdx = (idx - 1 + publicMemories.length) % publicMemories.length;
    setLocalId(publicMemories[prevIdx].id);
  };

  const handleNext = () => {
    if (isHostLoggedIn) {
      cycleNextSlide();
      return;
    }
    if (publicMemories.length < 2) return;
    const idx = publicMemories.findIndex((m) => m.id === active.id);
    const nextIdx = (idx + 1) % publicMemories.length;
    setLocalId(publicMemories[nextIdx].id);
  };

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
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicMemories, active?.id]);

  if (!active) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#1C2820]/60">
        <p className="font-serif text-[24px]">No photos in the slideshow yet</p>
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full overflow-hidden select-none flex flex-col justify-between bg-[#FAF8F5] text-[#1C2820] font-sans h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-4.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-4rem)]"
    >
      {/* 1. Subtle, Clean Ambient Aura extending harmoniously across the page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute inset-0 bg-[#FAF8F5]" />
        {active.type === 'video' ? (
          <video
            key={`ambient-${active.id}`}
            src={active.url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover blur-[80px] sm:blur-[130px] opacity-25 scale-110 transform-gpu transition-opacity duration-1000"
          />
        ) : (
          <img
            key={`ambient-${active.id}`}
            src={active.url}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover blur-[80px] sm:blur-[130px] opacity-25 scale-110 transform-gpu animate-ambient-pulse transition-opacity duration-1000"
          />
        )}
        {/* Soft, consistent wash blending seamlessly with Navbar and Tab Bar - no harsh bands or muddy patches */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/90 via-[#FAF8F5]/35 to-[#FAF8F5]/90" />
      </div>

      {/* 2. Top Header / Live Sync Status Pill */}
      <div className="relative z-10 shrink-0 h-[40px] sm:h-[48px] px-4 sm:px-8 flex items-center justify-between">
        {/* Left: Sync status */}
        <div className="flex items-center gap-2">
          {isLiveSync ? (
            <span className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-xs flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-[#2D4A3A]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D4A3A] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2D4A3A]" />
              </span>
              <span>Live on projector</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setLocalId(null)}
              className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-[#2D4A3A] text-white shadow-xs flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold press"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#9BC4A8] animate-pulse" />
              <span>Sync with Big Screen</span>
            </button>
          )}
        </div>

        {/* Right: Spotlight or Voting Indicator */}
        <div className="flex items-center gap-2">
          {spotlightId && (
            <span className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-white/90 backdrop-blur-xl text-[11px] sm:text-[12px] font-semibold text-[#2D4A3A] flex items-center gap-1.5 shadow-xs border border-white/60">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
          {votingRound.isActive && (
            <span className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-xs flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-[#2D4A3A]">
              <Trophy className="w-3 h-3" /> Contest open
            </span>
          )}
        </div>
      </div>

      {/* 3. The Photo Carousel Stage (Sized down to accommodate reactions & caption) */}
      <div className="relative z-10 flex-1 min-h-0 w-full flex items-center justify-center my-0 sm:my-1">
        <div className="w-full h-full flex items-center justify-center max-h-[44vh] sm:max-h-[48vh] md:max-h-[52vh] lg:max-h-[56vh]">
          <SlideStage
            active={active}
            memories={publicMemories}
            showPeeks={true}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Caption, Guest Name & Reaction Buttons */}
      <div className="relative z-10 shrink-0 px-4 sm:px-8 pb-3 sm:pb-5 pt-1 text-center max-w-2xl mx-auto w-full">
        {/* Caption & Guest Author */}
        <div key={active.id} className="min-w-0 animate-fade-up">
          {active.caption && (
            <h2 className="font-serif text-[clamp(17px,2.6vw,26px)] font-medium tracking-tight leading-[1.2] line-clamp-2 text-[#1C2820] drop-shadow-xs">
              “{active.caption}”
            </h2>
          )}
          <p className="mt-1 text-[clamp(12px,1.1vw,15px)] text-[#1C2820]/65 truncate">
            Shared by <span className="text-[#2D4A3A] font-semibold">{active.guestName}</span>
          </p>
        </div>

        {/* Reaction Emojis Dock */}
        <div className="mt-3 sm:mt-4 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-full bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_10px_30px_rgba(28,40,32,0.12)]">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                aria-label={`React with ${emoji}`}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 hover:bg-[#E9EFEA] border border-[#1C2820]/[0.05] shadow-xs text-[22px] sm:text-[26px] flex items-center justify-center press active:scale-90 hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-[11px] sm:text-[12px] text-[#1C2820]/50 font-medium">
            Tap an emoji to react live on the big screen ✨
          </p>
        </div>
      </div>

      {/* 5. Floating Emoji Reactions */}
      <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-28 sm:bottom-36 text-5xl sm:text-6xl animate-rise"
          >
            {item.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

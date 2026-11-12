'use client';

import React from 'react';
import { Pin } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import SlideStage from '@/components/SlideStage';

const REACTION_EMOJIS = ['❤️', '🥂', '✨', '😂', '🎉'];

/**
 * The live slideshow on a guest's phone: the same photo as the big screen, plus reactions.
 * Sized to fit the screen between the top bar and the tab bar, so nothing needs scrolling.
 */
export default function SlideshowPage() {
  const { publicMemories, activeSlideMemory: active, spotlightId, floatingEmojis, sendReaction } = useEvent();

  if (!active) return null;

  return (
    <div className="relative flex-none select-none flex flex-col md:flex-row md:items-stretch md:gap-10 w-full max-w-6xl mx-auto px-4 md:px-8 pt-3 md:pt-8 md:pb-8 h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-4.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-4rem)]">
      {/* The photo */}
      <div className="relative flex-1 min-h-0 min-w-0">
        <SlideStage active={active} memories={publicMemories} showPeeks={false} rounded="rounded-[22px] md:rounded-[28px]" />
        {spotlightId && (
          <span className="absolute top-2 left-2 h-8 px-3 rounded-full bg-white/90 backdrop-blur-xl text-[13px] font-medium text-[#2D4A3A] flex items-center gap-1.5 shadow-sm">
            <Pin className="w-3 h-3" /> Pinned
          </span>
        )}
      </div>

      {/* Who shared it, and reactions */}
      <div className="shrink-0 md:w-[320px] md:flex md:flex-col md:justify-center pt-4 pb-3 md:py-0">
        <div key={active.id} className="animate-[slideFade_900ms_ease-out_both] min-h-[3.25rem]">
          {active.caption && (
            <p className="font-serif text-[24px] md:text-[34px] font-medium tracking-tight leading-[1.15] text-[#1C2820] line-clamp-2">
              {active.caption}
            </p>
          )}
          <p className="mt-1 text-[14px] text-[#1C2820]/55 truncate">
            By <span className="font-semibold text-[#2D4A3A]">{active.guestName}</span>
          </p>
        </div>

        <p className="mt-4 md:mt-8 text-[13px] font-medium text-[#1C2820]/55">Send live reactions to the screen</p>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => sendReaction(emoji)}
              aria-label={`React with ${emoji}`}
              className="h-12 rounded-2xl bg-white border border-[#1C2820]/[0.07] shadow-[0_2px_8px_rgba(45,74,58,0.06)] text-[24px] flex items-center justify-center press"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Reactions floating up */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {floatingEmojis.map((item) => (
          <div key={item.id} style={{ left: `${item.left}%` }} className="absolute bottom-32 text-4xl md:text-5xl animate-rise">
            {item.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

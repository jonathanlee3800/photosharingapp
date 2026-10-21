'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  Film,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Tv,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function SlideshowPage() {
  const {
    currentEvent,
    publicMemories,
    activeSlideMemory,
    spotlightId,
    setSpotlightId,
    getPrompt,
    reactionCount,
    floatingEmojis,
    sendReaction,
    cycleNextSlide,
    cyclePrevSlide,
    isSlideshowPlaying,
    setIsSlideshowPlaying,
  } = useEvent();

  if (!activeSlideMemory) {
    return (
      <div className="flex-1 bg-[#14241B] text-white flex items-center justify-center p-8">
        <p className="font-serif text-2xl">Awaiting memories to roll...</p>
      </div>
    );
  }

  const promptObj = getPrompt(activeSlideMemory.promptId);

  return (
    <div className="flex-1 bg-gradient-to-br from-[#182B24] to-[#0D1510] text-[#FAF8F5] flex flex-col justify-between relative overflow-hidden select-none min-h-[calc(100vh-4rem)]">
      {/* Floating Emoji Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-32 text-4xl sm:text-5xl drop-shadow-2xl animate-rise"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Top Bar inside Slideshow */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between border-b border-white/10 relative z-20">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#74A886] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#9BC4A8]">
            {spotlightId ? 'Pinned Spotlight' : 'Live Rolling Slideshow'}
          </span>
          <span className="text-xs text-white/40 hidden sm:inline">· 5.5s interval</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Controls */}
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/10">
            <button
              onClick={cyclePrevSlide}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title={isSlideshowPlaying ? 'Pause' : 'Play'}
            >
              {isSlideshowPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={cycleNextSlide}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Link
            href={`/user/${currentEvent.id}/projector`}
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold border border-white/10 text-white transition-all"
          >
            <Tv className="w-3.5 h-3.5 text-[#9BC4A8]" />
            <span>Open 16:9 Screen</span>
          </Link>
        </div>
      </div>

      {/* Main Slideshow Stage */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-8 relative z-20">
        {/* Photo / Video Container */}
        <div className="w-full md:w-1/2 aspect-[4/3] sm:aspect-square md:aspect-[4/5] max-h-[520px] rounded-3xl overflow-hidden shadow-2xl border-4 border-[#25362A] relative shrink-0 bg-black/40">
          {activeSlideMemory.url.startsWith('data:video') ? (
            <video
              src={activeSlideMemory.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover transition-all duration-1000 ease-out"
            />
          ) : (
            <img
              src={activeSlideMemory.url}
              alt={activeSlideMemory.caption}
              className="w-full h-full object-cover transition-all duration-1000 ease-out"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

          <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-md border border-white/10">
            <span>{promptObj.icon}</span>
            <span>{spotlightId ? 'Couple Spotlight' : promptObj.label}</span>
          </span>

          {activeSlideMemory.type === 'video' && (
            <span className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 border border-white/10">
              <Film className="w-4 h-4 text-[#9BC4A8]" />
              <span>Video well-wish · {activeSlideMemory.duration || '0:24'}</span>
            </span>
          )}
        </div>

        {/* Narrative & Reactions */}
        <div className="w-full md:w-1/2 space-y-6 flex flex-col justify-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#9BC4A8]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Candid Memory</span>
            </div>

            <blockquote className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium leading-tight text-white drop-shadow-sm">
              “{activeSlideMemory.caption}”
            </blockquote>

            {activeSlideMemory.subCaption && (
              <p className="text-sm sm:text-base text-white/70 font-medium leading-relaxed">
                {activeSlideMemory.subCaption}
              </p>
            )}

            <div className="text-xs sm:text-sm text-[#9BC4A8] font-bold uppercase tracking-wider pt-2">
              By {activeSlideMemory.guestName} · {activeSlideMemory.timestamp}
            </div>
          </div>

          {/* Real-time Emoji Reactions Bar */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-white/75">
              <span>Send live love to the screen</span>
              <span>{reactionCount.toLocaleString()} total loves</span>
            </div>
            <div className="flex items-center gap-2">
              {['❤️', '🥂', '✨', '😂', '🎉'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/25 active:scale-90 text-2xl flex items-center justify-center transition-all border border-white/5 shadow-sm"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Queue Strip */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 pb-28 sm:pb-4 border-t border-white/10 relative z-20">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 shrink-0">
            Stream Queue:
          </span>
          {publicMemories.map((m) => {
            const isCurrent = m.id === activeSlideMemory.id;
            return (
              <button
                key={m.id}
                onClick={() => setSpotlightId(m.id)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                  isCurrent
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

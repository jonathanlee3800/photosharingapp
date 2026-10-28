'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Heart,
  QrCode,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Maximize2,
} from 'lucide-react';
import { MemoryItem, PromptItem } from '@/lib/initialData';
import { useEvent, FloatingEmoji } from '@/context/EventContext';
import { generateQrDataUrl } from '@/lib/qrHelper';

interface ProjectorScreenProps {
  memories?: MemoryItem[];
  activeMemory?: MemoryItem;
  isSpotlight?: boolean;
  getPrompt?: (id: string) => PromptItem;
  floatingEmojis?: FloatingEmoji[];
  onReaction?: (emoji: string) => void;
  onNextSlide?: () => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  fullscreenMode?: boolean;
}

export default function ProjectorScreen({
  memories: propMemories,
  activeMemory: propActiveMemory,
  isSpotlight: propIsSpotlight,
  getPrompt: propGetPrompt,
  floatingEmojis: propFloatingEmojis,
  onReaction: propOnReaction,
  onNextSlide: propOnNextSlide,
  isPlaying: propIsPlaying,
  onTogglePlay: propOnTogglePlay,
  fullscreenMode = true,
}: ProjectorScreenProps) {
  const eventContext = useEvent();
  const { currentEvent } = eventContext;

  const memories = propMemories ?? eventContext.publicMemories;
  const activeMemory = propActiveMemory ?? eventContext.activeSlideMemory;
  const isSpotlight = propIsSpotlight ?? Boolean(eventContext.spotlightId);
  const getPrompt = propGetPrompt ?? eventContext.getPrompt;
  const floatingEmojis = propFloatingEmojis ?? eventContext.floatingEmojis;
  const handleReaction = propOnReaction ?? eventContext.sendReaction;
  const handleNextSlide = propOnNextSlide ?? eventContext.cycleNextSlide;
  const isPlaying = propIsPlaying ?? eventContext.isSlideshowPlaying;
  const handleTogglePlay =
    propOnTogglePlay ??
    (() => eventContext.setIsSlideshowPlaying((p) => !p));

  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://memoryaisle.app';
    const targetUrl = `${origin}/user/${currentEvent.id}`;
    generateQrDataUrl(targetUrl, { width: 200, margin: 1 }).then((data) => {
      setQrDataUrl(data);
    });
  }, [currentEvent.id]);

  // Keyboard navigation for presentation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        eventContext.cyclePrevSlide();
      } else if (e.key === 'p' || e.key === 'P') {
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handleTogglePlay, eventContext]);

  if (!activeMemory) return null;
  const promptObj = getPrompt(activeMemory.promptId);

  // Derive adjacent images for carousel depth effect (safely falling back to activeMemory if memories is empty)
  const currentIndex = memories.findIndex((m) => m.id === activeMemory.id);
  const safeIdx = currentIndex >= 0 ? currentIndex : 0;
  const prevMemory =
    memories[(safeIdx - 1 + memories.length) % Math.max(1, memories.length)] ||
    memories[0] ||
    activeMemory;
  const nextMemory =
    memories[(safeIdx + 1) % Math.max(1, memories.length)] ||
    memories[0] ||
    activeMemory;

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div
      className={`w-full h-full min-h-screen bg-[#182B24] text-[#F4F3F0] flex flex-col justify-between relative overflow-hidden font-serif select-none`}
    >
      {/* Floating Emoji Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-32 text-6xl drop-shadow-2xl animate-rise"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Top Header Bar */}
      <div className="px-8 sm:px-12 py-6 sm:py-8 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="text-2xl sm:text-3xl">🌿</span>
          <span className="text-2xl sm:text-4xl tracking-wide text-white font-medium">
            {currentEvent.title}
          </span>
          <span className="text-white/20 text-3xl font-light mx-1 hidden sm:inline">|</span>
          <span className="text-xs font-sans tracking-[0.25em] uppercase text-white/60 font-bold hidden sm:inline">
            {currentEvent.date} · {currentEvent.venue}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] font-sans font-bold tracking-[0.2em] uppercase text-[#F4F3F0]">
          <span className="w-2 h-2 rounded-full bg-[#74A886] animate-pulse"></span>
          OUR DAY, THROUGH YOUR EYES
        </div>
      </div>

      {/* Center Cinematic Carousel Stage */}
      <div className="flex-1 w-full relative flex items-center justify-center z-10 px-6 sm:px-12 min-h-0">
        {/* Left Ghost Slide */}
        <div className="hidden lg:block absolute left-[-8%] w-[35%] h-[65%] opacity-25 blur-[2px] scale-90 rounded-[2.5rem] overflow-hidden border border-white/10 transition-all duration-700 ease-in-out">
          {prevMemory.type === 'video' ? (
            <video src={prevMemory.url} muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img
              src={prevMemory.url}
              className="w-full h-full object-cover"
              alt=""
            />
          )}
        </div>

        {/* Center Primary Slide */}
        <div className="relative w-full max-w-4xl h-[52vh] sm:h-[58vh] rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.85)] border-[6px] border-[#25362A] z-20 transition-all duration-700 ease-in-out bg-black/40">
          {activeMemory.type === 'video' ? (
            <video
              src={activeMemory.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-105"
            />
          ) : (
            <img
              src={activeMemory.url}
              className="w-full h-full object-cover scale-105"
              alt={activeMemory.caption}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"></div>

          {activeMemory.type === 'video' && (
            <div className="absolute bottom-6 left-6 px-4 py-2 rounded-xl bg-black/80 backdrop-blur-md text-white text-xs font-bold font-sans flex items-center gap-2 border border-white/15">
              <span className="w-2 h-2 rounded-full bg-[#74A886] animate-pulse" />
              <span>Video well-wish · {activeMemory.duration || '0:24'}</span>
            </div>
          )}
        </div>

        {/* Right Ghost Slide */}
        <div className="hidden lg:block absolute right-[-8%] w-[35%] h-[65%] opacity-25 blur-[2px] scale-90 rounded-[2.5rem] overflow-hidden border border-white/10 transition-all duration-700 ease-in-out">
          {nextMemory.type === 'video' ? (
            <video src={nextMemory.url} muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img
              src={nextMemory.url}
              className="w-full h-full object-cover"
              alt=""
            />
          )}
        </div>
      </div>

      {/* Bottom Editorial Quote & Tabletop QR Code */}
      <div className="w-full px-8 sm:px-14 py-8 pb-10 flex flex-col md:flex-row items-end justify-between gap-6 z-20 bg-gradient-to-t from-[#0B1510] via-[#14241B]/95 to-transparent shrink-0">
        {/* Left: Caption & Guest Attribution */}
        <div className="max-w-2xl">
          <div className="text-xs font-sans font-bold text-[#A3C9B0] uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{isSpotlight ? 'A MOMENT IN THE SPOTLIGHT' : 'LIVE SLIDESHOW'}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl text-[#FAF8F5] leading-[1.08] mb-3 font-normal drop-shadow-md">
            “{activeMemory.caption}”
          </h2>

          <div className="text-sm sm:text-base font-sans text-white/70 font-medium">
            Through <span className="text-[#FAF8F5] font-bold">{activeMemory.guestName}</span>
            ’s eyes
            <span className="mx-3 opacity-50">·</span> {promptObj.label}
            <span className="mx-3 opacity-50">·</span> {activeMemory.timestamp}
          </div>
        </div>

        {/* Right: Table QR Code for Guest Scanning */}
        <div className="flex flex-col items-end text-right shrink-0">
          <div className="flex items-center gap-3 mb-4 mr-1">
            <Heart
              className="w-8 h-8 text-[#FAF8F5] stroke-[1.5px] cursor-pointer hover:scale-110 active:scale-90 transition-transform"
              onClick={() => handleReaction('❤️')}
            />
            <span className="text-3xl sm:text-4xl text-[#FAF8F5] font-medium">
              {activeMemory.votes}
            </span>
            <span className="text-xs font-sans text-white/50 font-bold uppercase tracking-widest mt-1 ml-1">
              little loves sent
            </span>
          </div>

          <div className="flex items-center gap-6 font-sans">
            <div className="text-right hidden sm:block">
              <div className="text-lg font-serif text-[#FAF8F5] mb-0.5">
                Your view belongs here, too.
              </div>
              <div className="text-xs text-white/60 font-medium">
                Scan to share photos, leave wishes, or send loves.
              </div>
            </div>

            <div className="h-10 w-px bg-white/20 hidden sm:block"></div>

            <div className="text-right">
              <div className="text-base font-mono font-bold text-[#FAF8F5] leading-tight">
                /user/{currentEvent.id}
              </div>
              <div className="text-[10px] text-white/60 tracking-wider font-bold uppercase">
                ID: {currentEvent.id} · No app needed
              </div>
            </div>

            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1.5 rounded-2xl shadow-2xl shrink-0 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${currentEvent.title}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <QrCode className="w-full h-full text-[#14241B]" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Host Controls Overlay */}
      <div className="absolute top-4 right-4 z-40 opacity-15 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md p-2 rounded-full border border-white/15 shadow-xl">
          <button
            onClick={() => eventContext.cyclePrevSlide()}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
            title="Previous slide (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleTogglePlay}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
            title={isPlaying ? 'Pause slideshow (P)' : 'Play slideshow (P)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleNextSlide}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
            title="Next slide (Right Arrow / Space)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  ZoomIn,
  ZoomOut,
  Sparkles,
  User,
} from 'lucide-react';
import { MemoryItem } from '@/lib/initialData';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: MemoryItem | null;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onToggleVote?: (id: string) => void;
  onDownload?: (memory: MemoryItem) => void;
  categoryLabel?: string;
  categoryIcon?: string;
  currentIndex?: number;
  totalCount?: number;
}

export default function PhotoLightboxModal({
  isOpen,
  onClose,
  memory,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  onToggleVote,
  onDownload,
  categoryLabel,
  categoryIcon = '🌿',
  currentIndex = 1,
  totalCount = 1,
}: PhotoLightboxModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Reset zoom when switching photos or closing
  useEffect(() => {
    setIsZoomed(false);
  }, [memory?.id, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev, hasNext, hasPrev]);

  // Handle touch swipe gestures on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 45) {
      if (diff > 0 && hasNext && onNext) {
        onNext();
      } else if (diff < 0 && hasPrev && onPrev) {
        onPrev();
      }
    }
    setTouchStartX(null);
  };

  if (!isOpen || !memory) return null;

  const initials =
    memory.guestName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'WG';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md text-white animate-in fade-in duration-200">
      {/* Top Header Controls Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3.5 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-bold tracking-wider text-white/90">
            {currentIndex} / {totalCount}
          </span>
          {categoryLabel && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2D4A3A]/80 backdrop-blur-md text-[10px] sm:text-xs font-semibold text-[#9BC4A8] max-w-[140px] sm:max-w-xs truncate">
              <span>{categoryIcon}</span>
              <span className="truncate">{categoryLabel}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={() => setIsZoomed((z) => !z)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all text-white/90 hover:text-white"
            title={isZoomed ? 'Zoom out' : 'Zoom in'}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" /> : <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Download button */}
          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(memory)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all text-white/90 hover:text-white"
              title="Download photo"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center transition-all text-white shadow-lg"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Image + Next/Prev + Swipe support */}
      <div
        className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-6 pt-14 pb-28 sm:pb-24"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Previous Button */}
        {hasPrev && onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 sm:left-6 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 active:scale-90 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-xl"
            title="Previous memory (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>
        )}

        {/* Photo / Video Container */}
        <div
          className={`relative max-w-5xl max-h-[65vh] sm:max-h-[75vh] w-full h-full flex items-center justify-center overflow-auto cursor-pointer select-none transition-transform duration-300 ${
            isZoomed ? 'scale-150 sm:scale-125' : 'scale-100'
          }`}
          onClick={() => memory.type !== 'video' && setIsZoomed((z) => !z)}
        >
          {memory.type === 'video' ? (
            <video
              src={memory.url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
          ) : (
            <img
              src={memory.url}
              alt={memory.caption}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-all"
            />
          )}
        </div>

        {/* Navigation Next Button */}
        {hasNext && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 sm:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 active:scale-90 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-xl"
            title="Next memory (Right Arrow)"
          >
            <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>
        )}
      </div>

      {/* Bottom Info Bar / Drawer */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/90 to-transparent p-3.5 sm:p-6 pb-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 flex-1 pr-1 w-full">
            <blockquote className="font-serif italic text-sm sm:text-2xl text-white/95 leading-snug line-clamp-2 sm:line-clamp-none">
              “{memory.caption}”
            </blockquote>

            <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-white/70 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#2D4A3A] border border-white/20 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white">
                  {initials}
                </span>
                <span className="font-semibold text-white/90">{memory.guestName}</span>
              </div>
              <span>·</span>
              <span>{memory.timestamp}</span>
            </div>
          </div>

          {/* Like Heart Button */}
          {onToggleVote && (
            <button
              type="button"
              onClick={() => onToggleVote(memory.id)}
              className={`w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 ${
                memory.votedByMe
                  ? 'bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white shadow-lg border border-white/20'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform ${
                  memory.votedByMe ? 'fill-red-400 text-red-400 scale-110' : 'text-white'
                }`}
              />
              <span>{memory.votes} Loves</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

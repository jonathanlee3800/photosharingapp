'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  Film,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  Filter,
  Columns,
  Grid3X3,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import PhotoLightboxModal from '@/components/PhotoLightboxModal';

export default function GalleryPage() {
  const {
    currentEvent,
    publicMemories,
    prompts,
    getPrompt,
    activeSlideMemory,
    toggleVote,
    downloadSingle,
  } = useEvent();

  const [selectedPromptId, setSelectedPromptId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mobileLayout, setMobileLayout] = useState<'reel' | 'grid'>('reel');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 3;

  const horizontalScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollReel = (direction: 'left' | 'right') => {
    if (horizontalScrollRef.current) {
      const scrollAmount = horizontalScrollRef.current.clientWidth * 0.85;
      horizontalScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const filtered = publicMemories.filter((m) => {
    if (selectedPromptId !== 'all' && m.promptId !== selectedPromptId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.caption.toLowerCase().includes(q) ||
        m.guestName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Reset to page 1 when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPromptId, searchQuery]);

  const totalPhotos = filtered.length;
  const shouldPaginate = totalPhotos > ITEMS_PER_PAGE;
  const totalPages = shouldPaginate ? Math.ceil(totalPhotos / ITEMS_PER_PAGE) : 1;

  // Ensure currentPage is within valid bounds
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalPhotos);

  const paginatedMemories = shouldPaginate
    ? filtered.slice(startIndex, endIndex)
    : filtered;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    horizontalScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-28 sm:pb-12">
      {/* Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1C2820]/10 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full">
            Live Guest Feed
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#1C2820] mt-2 leading-none">
            Every little moment.
          </h1>
          <p className="text-sm text-[#1C2820]/65 mt-2 font-medium">
            Tap any heart to send love to {currentEvent.title}’s live screen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/user/${currentEvent.id}/upload`}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Photo</span>
          </Link>
          <Link
            href={`/user/${currentEvent.id}/vote`}
            className="px-4 py-2.5 rounded-xl bg-[#E9EFEA] hover:bg-[#D8E5DA] text-[#2D4A3A] text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Trophy className="w-4 h-4" />
            <span>Live Contest</span>
          </Link>
        </div>
      </div>

      {/* Featured / Spotlight Memory Hero Banner */}
      {activeSlideMemory && !activeSlideMemory.isPrivate && (
        <>
          {/* Mobile compact spotlight bar */}
          <div
            onClick={() => {
              const heroIdx = filtered.findIndex((m) => m.id === activeSlideMemory.id);
              if (heroIdx !== -1) setLightboxIndex(heroIdx);
            }}
            className="md:hidden bg-white p-3 rounded-2xl border border-[#1C2820]/10 shadow-sm flex items-center gap-3 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/5 shrink-0 relative">
              <img
                src={activeSlideMemory.url}
                alt=""
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[#74A886] animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D4A3A] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#74A886]" /> On Big Screen
              </span>
              <p className="text-xs font-semibold text-[#1C2820] truncate mt-0.5">
                “{activeSlideMemory.caption}”
              </p>
              <span className="text-[10px] text-[#1C2820]/60 font-medium">
                By {activeSlideMemory.guestName} · Tap to view
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleVote(activeSlideMemory.id);
              }}
              className={`p-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeSlideMemory.votedByMe
                  ? 'bg-[#2D4A3A] text-white shadow-sm'
                  : 'bg-[#E9EFEA] text-[#2D4A3A]'
              }`}
            >
              <Heart className={`w-4 h-4 ${activeSlideMemory.votedByMe ? 'fill-white' : ''}`} />
            </button>
          </div>

          {/* Desktop Magazine Spotlight */}
          <div className="hidden md:grid bg-white rounded-3xl overflow-hidden border border-[#1C2820]/10 shadow-md grid-cols-12 items-center">
            <div
              onClick={() => {
                const heroIdx = filtered.findIndex((m) => m.id === activeSlideMemory.id);
                if (heroIdx !== -1) setLightboxIndex(heroIdx);
              }}
              className="col-span-5 h-72 lg:h-80 relative overflow-hidden bg-black/5 cursor-pointer group"
            >
              <img
                src={activeSlideMemory.url}
                alt={activeSlideMemory.caption}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-[#182B24]/90 backdrop-blur-md text-[#FAF8F5] text-xs font-bold flex items-center gap-1.5 shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-[#9BC4A8]" />
                Currently on Big Screen
              </span>
              <span className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to view full-screen
              </span>
            </div>

            <div className="col-span-7 p-6 lg:p-8 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#2D4A3A]">
                  {getPrompt(activeSlideMemory.promptId).label}
                </div>
                <blockquote className="font-serif text-2xl lg:text-3xl text-[#1C2820] leading-snug">
                  “{activeSlideMemory.caption}”
                </blockquote>
                {activeSlideMemory.subCaption && (
                  <p className="text-xs sm:text-sm text-[#1C2820]/70 font-medium leading-relaxed">
                    {activeSlideMemory.subCaption}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#1C2820]/10">
                <div className="text-xs font-semibold text-[#1C2820]/75">
                  Shared by <span className="font-bold text-[#1C2820]">{activeSlideMemory.guestName}</span> · {activeSlideMemory.timestamp}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVote(activeSlideMemory.id);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all ${
                    activeSlideMemory.votedByMe
                      ? 'bg-[#2D4A3A] text-white shadow-md'
                      : 'bg-[#E9EFEA] text-[#2D4A3A] hover:bg-[#D8E5DA]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${activeSlideMemory.votedByMe ? 'fill-white' : ''}`} />
                  <span>{activeSlideMemory.votes} Likes</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Filter Bar: Categories + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          <button
            onClick={() => setSelectedPromptId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedPromptId === 'all'
                ? 'bg-[#2D4A3A] text-white shadow-sm'
                : 'bg-white border border-[#1C2820]/10 text-[#1C2820]/70 hover:bg-[#E9EFEA]'
            }`}
          >
            All Moments ({publicMemories.length})
          </button>
          {prompts.map((p) => {
            const count = publicMemories.filter((m) => m.promptId === p.id).length;
            const active = selectedPromptId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPromptId(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-[#2D4A3A] text-white shadow-sm'
                    : 'bg-white border border-[#1C2820]/10 text-[#1C2820]/70 hover:bg-[#E9EFEA]'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 sm:w-64">
          <Search className="w-4 h-4 text-[#1C2820]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search captions or guests..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#1C2820]/10 text-xs font-medium focus:outline-none focus:border-[#2D4A3A]"
          />
        </div>
      </div>

      {/* Mobile Gallery Controls & View Switcher */}
      <div className="flex sm:hidden items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#1C2820]">
            {shouldPaginate
              ? `Page ${safeCurrentPage} of ${totalPages} (${totalPhotos} photos)`
              : `${totalPhotos} ${totalPhotos === 1 ? 'Memory' : 'Memories'}`}
          </span>
          {mobileLayout === 'reel' && paginatedMemories.length > 1 && (
            <span className="text-[10px] text-[#2D4A3A] font-bold bg-[#E9EFEA] px-2 py-0.5 rounded-full">
              Swipe ↔
            </span>
          )}
        </div>

        {/* View Switcher: Reel vs Grid */}
        <div className="flex items-center gap-1 bg-[#E9EFEA] p-0.5 rounded-xl border border-[#1C2820]/10">
          <button
            type="button"
            onClick={() => setMobileLayout('reel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mobileLayout === 'reel'
                ? 'bg-[#2D4A3A] text-white shadow-sm'
                : 'text-[#1C2820]/70'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Reel</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileLayout('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mobileLayout === 'grid'
                ? 'bg-[#2D4A3A] text-white shadow-sm'
                : 'text-[#1C2820]/70'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Responsive Photo Gallery */}
      <div
        ref={horizontalScrollRef}
        className={
          mobileLayout === 'reel'
            ? 'flex overflow-x-auto gap-4 pb-4 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6 sm:overflow-visible no-scrollbar'
            : 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6'
        }
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {paginatedMemories.map((item, idx) => {
          const promptObj = getPrompt(item.promptId);
          const globalIdx = filtered.findIndex((m) => m.id === item.id);
          return (
            <div
              key={item.id}
              onClick={() => setLightboxIndex(globalIdx !== -1 ? globalIdx : idx)}
              className={`bg-white rounded-2xl overflow-hidden border border-[#1C2820]/10 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer ${
                mobileLayout === 'reel'
                  ? 'w-[70vw] max-w-[270px] shrink-0 sm:w-auto sm:shrink'
                  : 'w-full'
              }`}
            >
              <div className="relative aspect-[4/3] sm:aspect-[4/5] overflow-hidden bg-black/5">
                {item.url.startsWith('data:video') ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                )}
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                  <span>{promptObj.icon}</span>
                  <span className="truncate max-w-[110px]">{promptObj.label}</span>
                </span>
                {item.type === 'video' && (
                  <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <Film className="w-3 h-3 text-[#9BC4A8]" />
                    <span>{item.duration || '0:24'}</span>
                  </span>
                )}
                <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  View Full
                </span>
              </div>

              <div className="p-3 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-[#1C2820] font-semibold leading-snug line-clamp-2">
                    “{item.caption}”
                  </p>
                  {item.subCaption && (
                    <p className="text-[10px] sm:text-xs text-[#1C2820]/60 mt-0.5 line-clamp-1 font-medium">
                      {item.subCaption}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1C2820]/10 text-xs">
                  <div className="min-w-0 pr-1">
                    <div className="font-bold text-[#1C2820] text-[11px] sm:text-xs truncate">
                      {item.guestName}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-[#1C2820]/50 font-medium">
                      {item.timestamp}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVote(item.id);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold active:scale-90 transition-transform shrink-0 ${
                      item.votedByMe
                        ? 'bg-[#2D4A3A] text-white shadow-sm'
                        : 'bg-[#FAF8F5] border border-[#1C2820]/10 text-[#1C2820]/70 hover:bg-[#E9EFEA]'
                    }`}
                  >
                    <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${item.votedByMe ? 'fill-white' : ''}`} />
                    <span className="text-[11px] sm:text-xs">{item.votes}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls (when more than 3 photos) */}
      {shouldPaginate && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#1C2820]/10">
          <div className="text-xs font-semibold text-[#1C2820]/70">
            Showing <span className="font-bold text-[#1C2820]">{startIndex + 1}–{endIndex}</span> of{' '}
            <span className="font-bold text-[#1C2820]">{totalPhotos}</span> moments · Page{' '}
            <span className="font-bold text-[#1C2820]">{safeCurrentPage}</span> of{' '}
            <span className="font-bold text-[#1C2820]">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="px-3.5 py-2 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] hover:bg-[#E9EFEA] disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    pageNum === safeCurrentPage
                      ? 'bg-[#2D4A3A] text-white shadow-sm scale-105'
                      : 'bg-white border border-[#1C2820]/15 text-[#1C2820]/75 hover:bg-[#E9EFEA]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="px-3.5 py-2 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] hover:bg-[#E9EFEA] disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#1C2820]/10 text-[#1C2820]/60 space-y-3">
          <p className="font-serif text-2xl font-medium text-[#1C2820]">No memories found</p>
          <p className="text-xs">Be the first to share a moment under this category!</p>
          <Link
            href={`/user/${currentEvent.id}/upload`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Upload Moment
          </Link>
        </div>
      )}

      {/* Full-Screen Photo Lightbox Modal */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <PhotoLightboxModal
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          memory={filtered[lightboxIndex]}
          onNext={() =>
            setLightboxIndex((prev) =>
              prev !== null && prev < filtered.length - 1 ? prev + 1 : prev
            )
          }
          onPrev={() =>
            setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
          }
          hasNext={lightboxIndex < filtered.length - 1}
          hasPrev={lightboxIndex > 0}
          currentIndex={lightboxIndex + 1}
          totalCount={filtered.length}
          categoryLabel={getPrompt(filtered[lightboxIndex].promptId).label}
          categoryIcon={getPrompt(filtered[lightboxIndex].promptId).icon}
          onToggleVote={toggleVote}
          onDownload={downloadSingle}
        />
      )}
    </div>
  );
}

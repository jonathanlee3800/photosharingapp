'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Heart, Film, Trophy, Plus, Search, ChevronRight, X, Camera } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import PhotoLightboxModal from '@/components/PhotoLightboxModal';

const REACTION_EMOJIS = ['❤️', '🥂', '✨', '😂', '🎉'];
const PAGE_SIZE = 24;

export default function GalleryPage() {
  const {
    currentEvent,
    publicMemories,
    prompts,
    getPrompt,
    activeSlideMemory,
    toggleVote,
    downloadSingle,
    sendReaction,
    floatingEmojis,
    canVoteOn,
    votingRound,
  } = useEvent();

  const [selectedPromptId, setSelectedPromptId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = publicMemories.filter((m) => {
    if (selectedPromptId !== 'all' && m.promptId !== selectedPromptId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.caption.toLowerCase().includes(q) || m.guestName.toLowerCase().includes(q);
    }
    return true;
  });

  // Start from the top of the list whenever the filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedPromptId, searchQuery]);

  const visible = filtered.slice(0, visibleCount);
  const spotlight =
    activeSlideMemory && !activeSlideMemory.isPrivate && publicMemories.some((m) => m.id === activeSlideMemory.id)
      ? activeSlideMemory
      : null;
  const roundPrompt = votingRound.isActive ? getPrompt(votingRound.promptId) : null;

  const openMemory = (id: string) => {
    const idx = filtered.findIndex((m) => m.id === id);
    if (idx !== -1) setLightboxIndex(idx);
  };

  const heartButton = (item: (typeof publicMemories)[number], variant: 'tile' | 'card') => {
    const votable = canVoteOn(item);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleVote(item.id);
        }}
        aria-label={votable ? (item.votedByMe ? 'Remove vote' : 'Vote') : 'Voting opens during a live round'}
        aria-pressed={item.votedByMe}
        className={`press inline-flex items-center gap-1 rounded-full font-semibold ${
          variant === 'tile' ? 'h-8 px-2.5 text-[12px]' : 'h-10 px-4 text-[14px]'
        } ${
          item.votedByMe
            ? 'bg-white text-[#2D4A3A]'
            : variant === 'tile'
              ? 'bg-black/35 backdrop-blur-md text-white'
              : 'bg-[#E9EFEA] text-[#2D4A3A]'
        } ${votable ? '' : 'opacity-60'}`}
      >
        <Heart className={variant === 'tile' ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill={item.votedByMe ? 'currentColor' : 'none'} />
        <span>{item.votes}</span>
      </button>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-8 md:pb-16">
      {/* Header */}
      <header className="px-5 md:px-8 pt-6 md:pt-10 pb-5 flex items-end justify-between gap-4">
        <div className="animate-fade-up">
          <p className="text-[12px] uppercase tracking-[0.16em] font-semibold text-[#2D4A3A]/80">Live gallery</p>
          <h1 className="font-serif text-[38px] md:text-[56px] leading-[1.02] font-medium tracking-tight text-[#1C2820] mt-1">
            Every little moment.
          </h1>
          <p className="text-[15px] text-[#1C2820]/55 mt-2">
            {publicMemories.length} {publicMemories.length === 1 ? 'memory' : 'memories'} shared so far
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            href={`/user/${currentEvent.code}/vote`}
            className="h-11 px-4 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] text-[14px] font-semibold flex items-center gap-2 press"
          >
            <Trophy className="w-4 h-4" /> Contest
          </Link>
          <Link
            href={`/user/${currentEvent.code}/upload`}
            className="h-11 px-5 rounded-2xl bg-[#2D4A3A] text-white text-[14px] font-semibold flex items-center gap-2 press"
          >
            <Plus className="w-4 h-4" /> Share a photo
          </Link>
        </div>
      </header>

      {/* Live voting round banner */}
      {roundPrompt && (
        <div className="px-4 md:px-8 pb-4">
          <Link
            href={`/user/${currentEvent.code}/vote`}
            className="flex items-center gap-3 p-4 rounded-[22px] bg-[#2D4A3A] text-white press animate-fade-up"
          >
            <span className="relative flex w-10 h-10 rounded-full bg-white/15 items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[#9BC4A8] ring-2 ring-[#2D4A3A] animate-pulse" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-tight">Live vote is open</span>
              <span className="block text-[13px] text-white/75 truncate">
                {roundPrompt.icon} {roundPrompt.label}
                {votingRound.secondsLeft !== null &&
                  ` · ${Math.floor(votingRound.secondsLeft / 60)}:${String(votingRound.secondsLeft % 60).padStart(2, '0')} left`}
              </span>
            </span>
            <span className="text-[14px] font-semibold flex items-center gap-0.5 shrink-0">
              Vote <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      )}

      {/* On the big screen + reactions */}
      {spotlight && (
        <section className="px-4 md:px-8 pb-6" aria-label="On the big screen">
          <div className="relative rounded-[28px] overflow-hidden bg-white border border-[#1C2820]/[0.06] shadow-[0_10px_40px_rgba(28,40,32,0.08)] md:grid md:grid-cols-2">
            {/* Floating reactions (yours and everyone else's) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {floatingEmojis.map((item) => (
                <div
                  key={item.id}
                  style={{ left: `${item.left}%` }}
                  className="absolute bottom-24 text-4xl drop-shadow-lg animate-rise"
                >
                  {item.emoji}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openMemory(spotlight.id)}
              className="relative block w-full aspect-[4/3] md:aspect-auto md:min-h-[360px] bg-black/5 text-left"
              aria-label="View photo"
            >
              {spotlight.type === 'video' ? (
                <video src={spotlight.url} muted playsInline autoPlay loop className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <img src={spotlight.url} alt={spotlight.caption} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
              <span className="absolute top-3.5 left-3.5 h-8 px-3 rounded-full bg-black/45 backdrop-blur-md text-white text-[12px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9BC4A8] animate-pulse" />
                On the big screen
              </span>
              <span className="md:hidden absolute bottom-4 left-4 right-4 text-white">
                <span className="block font-serif text-[22px] leading-snug line-clamp-2">{spotlight.caption && `“${spotlight.caption}”`}</span>
                <span className="block text-[13px] text-white/80 mt-1">{spotlight.guestName}</span>
              </span>
            </button>

            <div className="p-4 md:p-8 flex flex-col justify-between gap-4">
              <div className="hidden md:block space-y-2">
                <p className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[#2D4A3A]/80">
                  {getPrompt(spotlight.promptId).icon} {getPrompt(spotlight.promptId).label}
                </p>
                <blockquote className="font-serif text-[30px] leading-snug text-[#1C2820]">{spotlight.caption && `“${spotlight.caption}”`}</blockquote>
                <p className="text-[14px] text-[#1C2820]/60">
                  {spotlight.guestName} · {spotlight.timestamp}
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-[#1C2820]/55">Send love to the big screen</p>
                  {heartButton(spotlight, 'card')}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendReaction(emoji)}
                      aria-label={`React with ${emoji}`}
                      className="h-12 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/[0.06] text-[22px] flex items-center justify-center press"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search + categories (stay pinned under the top bar while scrolling) */}
      <div className="sticky z-30 glass border-b border-[#1C2820]/[0.06] top-[calc(3.5rem+env(safe-area-inset-top))] md:top-16">
        <div className="px-4 md:px-8 pt-3 pb-3 space-y-3">
          <div className="relative">
            <Search className="w-[18px] h-[18px] text-[#1C2820]/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captions or names"
              enterKeyHint="search"
              className="w-full h-11 pl-11 pr-10 rounded-full bg-[#1C2820]/[0.05] text-[15px] text-[#1C2820] placeholder:text-[#1C2820]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#1C2820]/15 text-white flex items-center justify-center press"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {[{ id: 'all', icon: '', label: 'All' }, ...prompts].map((p) => {
              const active = selectedPromptId === p.id;
              const count =
                p.id === 'all' ? publicMemories.length : publicMemories.filter((m) => m.promptId === p.id).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPromptId(p.id)}
                  aria-pressed={active}
                  className={`h-9 px-4 rounded-full text-[14px] font-medium whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-colors press ${
                    active ? 'bg-[#2D4A3A] text-white' : 'bg-white border border-[#1C2820]/10 text-[#1C2820]/75'
                  }`}
                >
                  {p.icon && <span>{p.icon}</span>}
                  <span>{p.label}</span>
                  <span className={active ? 'text-white/70' : 'text-[#1C2820]/40'}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Photo grid */}
      {filtered.length > 0 ? (
        <div className="px-2 md:px-8 pt-3 md:pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-4">
            {visible.map((item) => {
              const prompt = getPrompt(item.promptId);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openMemory(item.id)}
                  onKeyDown={(e) => e.key === 'Enter' && openMemory(item.id)}
                  className="group relative aspect-[4/5] rounded-[18px] md:rounded-[22px] overflow-hidden bg-[#1C2820]/[0.06] cursor-pointer press"
                >
                  {item.type === 'video' ? (
                    <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/0" />

                  <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-md text-[14px] flex items-center justify-center" title={prompt.label}>
                    {prompt.icon}
                  </span>
                  {item.type === 'video' && (
                    <span className="absolute top-2 right-2 h-7 px-2 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1">
                      <Film className="w-3.5 h-3.5" /> {item.duration || 'Video'}
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-end justify-between gap-2">
                    <div className="min-w-0 text-white">
                      <p className="text-[13px] font-semibold leading-tight truncate">{item.guestName}</p>
                      <p className="hidden md:block text-[12px] text-white/75 leading-snug line-clamp-1">{item.caption}</p>
                    </div>
                    {heartButton(item, 'tile')}
                  </div>
                </div>
              );
            })}
          </div>

          {visibleCount < filtered.length && (
            <div className="flex justify-center pt-6">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="h-11 px-6 rounded-full bg-white border border-[#1C2820]/10 text-[15px] font-semibold text-[#1C2820] press"
              >
                Show more ({filtered.length - visibleCount})
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 pt-16 pb-8 text-center flex flex-col items-center gap-3 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center">
            {searchQuery ? <Search className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
          </div>
          <p className="font-serif text-[26px] text-[#1C2820]">
            {searchQuery ? 'No matches' : 'Nothing here yet'}
          </p>
          <p className="text-[15px] text-[#1C2820]/55 max-w-xs">
            {searchQuery ? 'Try a different name or word.' : 'Be the first to share a moment in this category.'}
          </p>
          {!searchQuery && (
            <Link
              href={`/user/${currentEvent.code}/upload`}
              className="mt-2 h-12 px-6 rounded-2xl bg-[#2D4A3A] text-white text-[15px] font-semibold flex items-center gap-2 press"
            >
              <Camera className="w-5 h-5" /> Share a photo
            </Link>
          )}
        </div>
      )}

      {/* Full-Screen Photo Lightbox Modal */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <PhotoLightboxModal
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          memory={filtered[lightboxIndex]}
          onNext={() => setLightboxIndex((prev) => (prev !== null && prev < filtered.length - 1 ? prev + 1 : prev))}
          onPrev={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
          hasNext={lightboxIndex < filtered.length - 1}
          hasPrev={lightboxIndex > 0}
          currentIndex={lightboxIndex + 1}
          totalCount={filtered.length}
          categoryLabel={getPrompt(filtered[lightboxIndex].promptId).label}
          categoryIcon={getPrompt(filtered[lightboxIndex].promptId).icon}
          onToggleVote={toggleVote}
          canVote={canVoteOn}
          onDownload={downloadSingle}
        />
      )}
    </div>
  );
}

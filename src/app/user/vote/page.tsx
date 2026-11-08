'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Trophy, Clock, Lock, Camera, Check } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import confetti from 'canvas-confetti';

const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function VotePage() {
  const { currentEvent, publicMemories, votingRound, getPrompt, toggleVote } = useEvent();

  const activePrompt = getPrompt(votingRound.promptId);

  // The round's candidates: public photos in the contest category, in a fixed order
  // (not re-sorted by votes, so photos don't jump around while people vote)
  const contenders = publicMemories.filter((m) => m.promptId === votingRound.promptId);

  // Rank by votes for the badges (ties share a rank), without changing the display order
  const rankOf = (votes: number) => 1 + contenders.filter((m) => m.votes > votes).length;

  const leader = contenders.reduce<(typeof contenders)[number] | null>(
    (best, m) => (m.votes > 0 && (!best || m.votes > best.votes) ? m : best),
    null
  );

  const handleVoteClick = (id: string, alreadyVoted?: boolean) => {
    toggleVote(id);
    if (alreadyVoted) return;
    try {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#2D4A3A', '#74A886', '#E9EFEA', '#F59E0B'],
      });
    } catch (e) {}
  };

  // No round running: nothing to vote on, just let guests know
  if (!votingRound.isOpen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-up">
        <div className="w-20 h-20 rounded-full bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center">
          <Trophy className="w-9 h-9" strokeWidth={1.6} />
        </div>
        <h1 className="font-serif text-[34px] leading-tight font-medium text-[#1C2820] mt-6">No live round right now</h1>
        <p className="text-[15px] leading-relaxed text-[#1C2820]/55 mt-2 max-w-xs">
          The hosts will open a vote during the celebration. This page updates by itself when it starts.
        </p>
        <Link
          href={`/user/${currentEvent.code}/gallery`}
          className="mt-8 h-12 px-6 rounded-2xl bg-[#2D4A3A] text-white text-[15px] font-semibold flex items-center press"
        >
          Back to the gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-8 md:pb-16 space-y-6">
      {/* Header */}
      <header className="space-y-3 animate-fade-up">
        <p className="text-[12px] uppercase tracking-[0.16em] font-semibold text-[#2D4A3A]/80 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" /> Live photo contest
        </p>
        <h1 className="font-serif text-[38px] md:text-[56px] leading-[1.02] font-medium tracking-tight text-[#1C2820]">
          {activePrompt.icon} {activePrompt.label}
        </h1>
        <p className="text-[15px] text-[#1C2820]/55">
          {votingRound.isActive
            ? 'You have one vote — tap your favourite. Tap another photo to move your vote.'
            : 'Voting for this round has ended. The hosts will reveal the winner shortly.'}
        </p>
      </header>

      {/* Status pill */}
      <div className="sticky z-30 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] md:top-20 flex justify-center pointer-events-none">
        {votingRound.isActive ? (
          <div className="pointer-events-auto glass border border-[#1C2820]/[0.08] shadow-[0_6px_24px_rgba(28,40,32,0.1)] rounded-full h-11 px-4 flex items-center gap-3 text-[14px]">
            <span className="flex items-center gap-2 font-semibold text-[#2D4A3A]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D4A3A] opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2D4A3A]" />
              </span>
              Voting open
            </span>
            {votingRound.secondsLeft !== null && (
              <span className="flex items-center gap-1 font-semibold text-[#1C2820] tabular-nums">
                <Clock className="w-4 h-4 text-[#1C2820]/50" />
                {formatCountdown(votingRound.secondsLeft)}
              </span>
            )}
            <span className="text-[#1C2820]/50">{contenders.length} photos</span>
          </div>
        ) : (
          <div className="pointer-events-auto glass border border-[#1C2820]/[0.08] rounded-full h-11 px-4 flex items-center gap-2 text-[14px] font-semibold text-[#1C2820]/70">
            <Lock className="w-4 h-4" /> Time’s up
            {leader && <span className="font-normal text-[#1C2820]/50 truncate max-w-[45vw]">· {leader.guestName} leads</span>}
          </div>
        )}
      </div>

      {/* Candidates */}
      {contenders.length === 0 ? (
        <div className="py-14 text-center flex flex-col items-center gap-3">
          <p className="font-serif text-[26px] text-[#1C2820]">No photos with this tag yet</p>
          <Link
            href={`/user/${currentEvent.code}/upload`}
            className="h-12 px-6 rounded-2xl bg-[#2D4A3A] text-white text-[15px] font-semibold flex items-center gap-2 press"
          >
            <Camera className="w-5 h-5" /> Share one
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {contenders.map((item) => (
            <article
              key={item.id}
              className="rounded-[28px] overflow-hidden bg-white border border-[#1C2820]/[0.06] shadow-[0_10px_40px_rgba(28,40,32,0.06)]"
            >
              <div className="relative aspect-[4/5] sm:aspect-square bg-black/5">
                {item.type === 'video' ? (
                  <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <img src={item.url} alt={item.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {(() => {
                  const rank = rankOf(item.votes);
                  return (
                    <span
                      className={`absolute top-3.5 left-3.5 h-8 min-w-8 px-2.5 rounded-full text-[13px] font-bold flex items-center justify-center ${
                        rank === 1 && item.votes > 0 ? 'bg-[#F5C451] text-[#1C2820]' : 'bg-black/45 backdrop-blur-md text-white'
                      }`}
                    >
                      #{rank}
                    </span>
                  );
                })()}
                <span className="absolute top-3.5 right-3.5 h-8 px-3 rounded-full bg-white/90 backdrop-blur-md text-[#1C2820] text-[13px] font-semibold flex items-center gap-1 tabular-nums">
                  <Heart className="w-3.5 h-3.5 text-[#2D4A3A]" fill="currentColor" /> {item.votes}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[16px] font-medium text-[#1C2820] leading-snug line-clamp-2">{item.caption && `“${item.caption}”`}</p>
                  <p className="text-[13px] text-[#1C2820]/50 mt-1">{item.guestName}</p>
                </div>

                {votingRound.isActive ? (
                  <button
                    type="button"
                    onClick={() => handleVoteClick(item.id, item.votedByMe)}
                    aria-pressed={item.votedByMe}
                    className={`w-full h-12 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors press ${
                      item.votedByMe ? 'bg-[#2D4A3A] text-white' : 'bg-[#E9EFEA] text-[#2D4A3A]'
                    }`}
                  >
                    {item.votedByMe ? <Check className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                    {item.votedByMe ? 'Voted' : 'Vote'}
                  </button>
                ) : (
                  <div className="w-full h-12 rounded-2xl bg-[#1C2820]/[0.04] text-[#1C2820]/45 text-[15px] font-medium flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" /> {item.votedByMe ? 'You voted' : 'Voting closed'}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

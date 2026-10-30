'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Trophy, Clock, Lock, Camera } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import confetti from 'canvas-confetti';

const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function VotePage() {
  const { currentEvent, publicMemories, votingRound, getPrompt, toggleVote } = useEvent();

  const activePrompt = getPrompt(votingRound.promptId);

  // The round's candidates: public photos in the contest category, most votes first
  const contenders = publicMemories
    .filter((m) => m.promptId === votingRound.promptId)
    .sort((a, b) => b.votes - a.votes);

  const leader = contenders[0] && contenders[0].votes > 0 ? contenders[0] : null;

  const handleVoteClick = (id: string, alreadyVoted?: boolean) => {
    toggleVote(id);
    if (alreadyVoted) return;
    try {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2D4A3A', '#74A886', '#E9EFEA', '#F59E0B'],
      });
    } catch (e) {}
  };

  // No round running: nothing to vote on, just let guests know
  if (!votingRound.isOpen) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 pb-28 sm:pb-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] mx-auto flex items-center justify-center">
          <Trophy className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#1C2820]">No live round right now</h1>
        <p className="text-sm text-[#1C2820]/65 font-medium leading-relaxed">
          The hosts will open a voting round during the celebration. This page updates automatically when it starts.
        </p>
        <Link
          href={`/user/${currentEvent.id}/gallery`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold"
        >
          Back to the gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-28 sm:pb-12">
      {/* Header */}
      <div className="border-b border-[#1C2820]/10 pb-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full inline-flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" /> Live Photo Contest
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#1C2820] mt-2 leading-none">
          {activePrompt.icon} {activePrompt.label}
        </h1>
        <p className="text-sm text-[#1C2820]/65 mt-2 font-medium">
          {votingRound.isActive
            ? 'Vote for your favourite candid memory in this round. One vote per photo.'
            : 'Voting for this round has ended. The hosts will reveal the winner shortly.'}
        </p>
      </div>

      {/* Round Status Banner */}
      {votingRound.isActive ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#E9EFEA] to-[#D8E5DA] border border-[#2D4A3A]/20 flex items-center justify-between gap-3 text-xs shadow-inner">
          <span className="font-bold text-[#2D4A3A] flex items-center gap-2 text-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D4A3A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2D4A3A]"></span>
            </span>
            Live Voting Round Open
          </span>
          <span className="text-[#1C2820]/75 font-semibold flex items-center gap-3">
            {votingRound.secondsLeft !== null && (
              <span className="flex items-center gap-1 font-bold text-[#2D4A3A]">
                <Clock className="w-3.5 h-3.5" /> {formatCountdown(votingRound.secondsLeft)} left
              </span>
            )}
            <span>{contenders.length} contenders</span>
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#F4F1EA] border border-[#1C2820]/10 flex items-center justify-between gap-3 text-xs">
          <span className="font-bold text-[#1C2820]/75 flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4" />
            Time’s up! Waiting for the hosts to reveal the winner
          </span>
          {leader && (
            <span className="text-[#1C2820]/75 font-semibold">
              Leading: “{leader.caption.slice(0, 32)}” · {leader.votes} votes
            </span>
          )}
        </div>
      )}

      {/* Voting Cards Grid */}
      {contenders.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <p className="font-serif text-2xl text-[#1C2820]">No photos in this category yet</p>
          <Link
            href={`/user/${currentEvent.id}/upload`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold"
          >
            <Camera className="w-4 h-4" /> Share one for “{activePrompt.label}”
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {contenders.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#1C2820]/10 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between p-3.5 group"
            >
              <div>
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-3.5 shadow-sm bg-black/5">
                  {item.type === 'video' ? (
                    <video src={item.url} muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md text-white text-xs font-extrabold border border-white/10 shadow-md">
                    #{idx + 1}
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded-xl bg-white/90 backdrop-blur-md text-[#2D4A3A] text-xs font-bold shadow-md">
                    {item.votes} votes
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#1C2820] leading-snug line-clamp-2 px-1 mb-1">
                  “{item.caption}”
                </h3>
                <p className="text-xs text-[#1C2820]/60 px-1 mb-3 font-medium">
                  by {item.guestName} · {item.timestamp}
                </p>
              </div>

              {votingRound.isActive ? (
                <button
                  type="button"
                  onClick={() => handleVoteClick(item.id, item.votedByMe)}
                  className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm ${
                    item.votedByMe
                      ? 'bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white shadow-md'
                      : 'bg-[#FAF8F5] border border-[#1C2820]/15 text-[#1C2820] hover:bg-[#E9EFEA]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${item.votedByMe ? 'fill-white text-white' : 'text-[#2D4A3A]'}`} />
                  <span>{item.votedByMe ? 'Voted! (tap to undo)' : 'Cast Vote'}</span>
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-[#FAF8F5] border border-[#1C2820]/10 text-[#1C2820]/45">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{item.votedByMe ? 'You voted' : 'Voting closed'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

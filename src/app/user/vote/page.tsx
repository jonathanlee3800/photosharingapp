'use client';

import React from 'react';
import { Heart, Trophy, Sparkles, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEvent } from '@/context/EventContext';
import confetti from 'canvas-confetti';

export default function VotePage() {
  const {
    publicMemories,
    prompts,
    votingRound,
    setVotingRound,
    getPrompt,
    toggleVote,
  } = useEvent();

  const activePrompt = getPrompt(votingRound.promptId);

  const contenders = publicMemories
    .filter((m) => m.promptId === votingRound.promptId)
    .sort((a, b) => b.votes - a.votes);

  const displayList = contenders.length >= 2 ? contenders : publicMemories.slice(0, 6);

  const handleVoteClick = (id: string) => {
    toggleVote(id);
    try {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2D4A3A', '#74A886', '#E9EFEA', '#F59E0B'],
      });
    } catch (e) {}
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-28 sm:pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1C2820]/10 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Live Photo Contest
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#1C2820] mt-2 leading-none">
            {activePrompt.label}
          </h1>
          <p className="text-sm text-[#1C2820]/65 mt-2 font-medium">
            Vote for your favorite candid memory in this round. Winners revealed before the evening toast!
          </p>
        </div>

        {/* Category Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#1C2820]/60 shrink-0">
            Contest Round:
          </label>
          <select
            value={votingRound.promptId}
            onChange={(e) =>
              setVotingRound((v) => ({ ...v, promptId: e.target.value }))
            }
            className="px-4 py-2.5 rounded-xl border border-[#1C2820]/20 bg-white text-xs font-bold text-[#1C2820] focus:outline-none focus:border-[#2D4A3A]"
          >
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Contest Status Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#E9EFEA] to-[#D8E5DA] border border-[#2D4A3A]/20 flex items-center justify-between text-xs shadow-inner">
        <span className="font-bold text-[#2D4A3A] flex items-center gap-2 text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D4A3A] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2D4A3A]"></span>
          </span>
          Live Voting Round Open
        </span>
        <span className="text-[#1C2820]/75 font-semibold">
          {displayList.length} contenders competing
        </span>
      </div>

      {/* Responsive Voting Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayList.map((item, idx) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl overflow-hidden border border-[#1C2820]/10 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between p-3.5 group"
          >
            <div>
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-3.5 shadow-sm bg-black/5">
                <img
                  src={item.url}
                  alt={item.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
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

            <button
              type="button"
              onClick={() => handleVoteClick(item.id)}
              className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm ${
                item.votedByMe
                  ? 'bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white shadow-md'
                  : 'bg-[#FAF8F5] border border-[#1C2820]/15 text-[#1C2820] hover:bg-[#E9EFEA]'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  item.votedByMe ? 'fill-white text-white' : 'text-[#2D4A3A]'
                }`}
              />
              <span>{item.votedByMe ? 'Voted!' : 'Cast Vote'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

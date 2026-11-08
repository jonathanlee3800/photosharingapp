'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Heart, Lock, Trophy } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import HostAuthGuard from '@/components/HostAuthGuard';

const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Host's view of the live round: standings update live, no voting.
 * After the round closes it shows the final results.
 */
export default function HostRoundPage() {
  const { currentEvent, publicMemories, votingRound, getPrompt, closeVotingRound } = useEvent();
  const [closing, setClosing] = useState(false);

  const overviewHref = `/host/${currentEvent.code}`;
  const hasResults = !votingRound.isOpen && Boolean(votingRound.closedAt && votingRound.promptId);
  const prompt = getPrompt(votingRound.promptId);

  // Same fixed order guests see, so photos don't jump around as votes come in
  const contenders = publicMemories.filter((m) => m.promptId === votingRound.promptId);
  const totalVotes = contenders.reduce((sum, m) => sum + (m.votes || 0), 0);
  const rankOf = (votes: number) => 1 + contenders.filter((m) => m.votes > votes).length;

  const handleClose = async () => {
    setClosing(true);
    await closeVotingRound();
    setClosing(false);
  };

  return (
    <HostAuthGuard>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-28 sm:pb-12">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={overviewHref}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#1C2820]/15 text-xs font-bold text-[#2D4A3A] hover:bg-[#E9EFEA] transition-all shadow-sm group shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to overview</span>
          </Link>
          <span className="text-xs text-[#1C2820]/50 font-medium truncate min-w-0">
            Managing: <span className="font-bold text-[#1C2820]">{currentEvent.title}</span>
          </span>
        </div>

        {!votingRound.isOpen && !hasResults ? (
          <div className="bg-white rounded-3xl p-10 border border-[#1C2820]/10 shadow-sm text-center space-y-2">
            <Trophy className="w-8 h-8 text-[#2D4A3A] mx-auto" strokeWidth={1.6} />
            <h1 className="font-serif text-3xl text-[#1C2820]">No live round right now</h1>
            <p className="text-xs text-[#1C2820]/60 font-medium">Start a round from the overview page to see it here.</p>
          </div>
        ) : (
          <>
            <div className="bg-[#F3F0E9] rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A]/80">
                    {hasResults ? 'Final results' : 'The live round'}
                  </p>
                  <h1 className="font-serif text-3xl sm:text-4xl text-[#1C2820] mt-1">
                    {prompt.icon} {prompt.label}
                  </h1>
                </div>
                <span className="px-3 py-1 rounded-full bg-white text-xs font-bold text-[#2D4A3A] flex items-center gap-1.5 shrink-0">
                  {votingRound.isActive ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2D4A3A] animate-pulse" /> Voting open
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" /> {votingRound.isOpen ? 'Time’s up' : 'Round closed'}
                    </>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                {votingRound.isOpen && votingRound.secondsLeft !== null && (
                  <div>
                    <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C2820] tabular-nums flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#1C2820]/40" />
                      {formatCountdown(votingRound.secondsLeft)}
                    </div>
                    <div className="text-[10px] text-[#1C2820]/60 font-medium">remaining</div>
                  </div>
                )}
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C2820]">{totalVotes}</div>
                  <div className="text-[10px] text-[#1C2820]/60 font-medium">votes</div>
                </div>
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C2820]">{contenders.length}</div>
                  <div className="text-[10px] text-[#1C2820]/60 font-medium">candidates</div>
                </div>
                {votingRound.isOpen && (
                  <button
                    type="button"
                    disabled={closing}
                    onClick={handleClose}
                    className="w-full sm:w-auto sm:ml-auto px-5 py-3 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
                  >
                    <Trophy className="w-4 h-4" /> Close & Reveal Winner
                  </button>
                )}
              </div>
            </div>

            {contenders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-[#1C2820]/10 shadow-sm text-center">
                <p className="font-serif text-2xl text-[#1C2820]">No photos with this tag yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {contenders.map((item) => {
                  const rank = rankOf(item.votes);
                  const leading = rank === 1 && item.votes > 0;
                  return (
                    <article
                      key={item.id}
                      className={`rounded-3xl overflow-hidden bg-white border shadow-sm ${
                        leading ? 'border-[#F5C451] ring-1 ring-[#F5C451]' : 'border-[#1C2820]/10'
                      }`}
                    >
                      <div className="relative aspect-square bg-black/5">
                        {item.type === 'video' ? (
                          <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <img src={item.url} alt={item.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <span
                          className={`absolute top-3 left-3 h-8 min-w-8 px-2.5 rounded-full text-[13px] font-bold flex items-center justify-center ${
                            leading ? 'bg-[#F5C451] text-[#1C2820]' : 'bg-black/45 backdrop-blur-md text-white'
                          }`}
                        >
                          {leading && hasResults ? 'Winner' : `#${rank}`}
                        </span>
                        <span className="absolute top-3 right-3 h-8 px-3 rounded-full bg-white/90 backdrop-blur-md text-[#1C2820] text-[13px] font-semibold flex items-center gap-1 tabular-nums">
                          <Heart className="w-3.5 h-3.5 text-[#2D4A3A]" fill="currentColor" /> {item.votes}
                        </span>
                      </div>
                      <div className="p-4">
                        {item.caption && (
                          <p className="text-sm font-medium text-[#1C2820] leading-snug line-clamp-2">“{item.caption}”</p>
                        )}
                        <p className="text-xs text-[#1C2820]/55 font-medium mt-1">{item.guestName}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </HostAuthGuard>
  );
}

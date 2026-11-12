'use client';

import React from 'react';
import Link from 'next/link';
import {
  Heart,
  Trophy,
  Clock,
  Lock,
  Camera,
  Check,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import confetti from 'canvas-confetti';
import PhotoFrame from '@/components/PhotoFrame';

const formatCountdown = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function VotePage() {
  const { currentEvent, publicMemories, votingRound, getPrompt, toggleVote } = useEvent();

  const activePrompt = getPrompt(votingRound.promptId);

  // The round's candidates: public photos in the contest category, in a fixed order
  // (not re-sorted by votes, so photos don't jump around while people vote)
  const contenders = publicMemories.filter((m) => m.promptId === votingRound.promptId);

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

  // No round running: explanatory waiting state following Apple UI guidelines
  if (!votingRound.isOpen) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16 text-center animate-fade-up max-w-xl mx-auto">
        {/* Live status badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E9EFEA] border border-[#2D4A3A]/10 text-[12px] font-semibold text-[#2D4A3A] mb-5 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D4A3A] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2D4A3A]" />
          </span>
          <span>Live Photo Contest • Waiting to start</span>
        </div>

        {/* Apple-style hero icon container */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] bg-gradient-to-b from-[#E9EFEA] to-[#DCE8DF] text-[#2D4A3A] flex items-center justify-center shadow-[0_12px_36px_rgba(45,74,58,0.14)] ring-1 ring-black/[0.04] mb-5">
          <Trophy className="w-10 h-10 sm:w-11 sm:h-11 text-[#2D4A3A]" strokeWidth={1.75} />
        </div>

        {/* Editorial Heading & Subtitle */}
        <h1 className="font-serif text-[30px] sm:text-[40px] leading-[1.1] font-medium tracking-tight text-[#1C2820]">
          The photo contest hasn’t started yet
        </h1>
        <p className="text-[15px] sm:text-[16px] leading-relaxed text-[#1C2820]/65 mt-3 max-w-md mx-auto">
          During the celebration, the hosts will launch live photo contests where everyone votes for their favourite wedding moments in real time.
        </p>

        {/* Apple-style "What to expect" informational card */}
        <div className="w-full mt-7 p-5 sm:p-6 rounded-[24px] bg-white border border-[#1C2820]/[0.06] shadow-[0_8px_30px_rgba(28,40,32,0.05)] text-left space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C2820]/[0.06]">
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#2D4A3A] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> How it works
            </span>
            <span className="text-[12px] text-[#1C2820]/45 font-medium">3 quick steps</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 pt-0.5">
            {/* Step 1 */}
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center shrink-0 mt-0.5">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-[#1C2820] leading-snug">
                  1. Snap & share candid moments
                </h3>
                <p className="text-[13px] text-[#1C2820]/60 leading-normal mt-0.5">
                  Upload your best shots to the event gallery under the tag prompts.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#FAF0E6] text-[#A66038] flex items-center justify-center shrink-0 mt-0.5">
                <Heart className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-[#1C2820] leading-snug">
                  2. Vote live on your phone
                </h3>
                <p className="text-[13px] text-[#1C2820]/60 leading-normal mt-0.5">
                  When the hosts open voting, tap your favourite contender right here.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#FDF4E5] text-[#B47C1C] flex items-center justify-center shrink-0 mt-0.5">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-[#1C2820] leading-snug">
                  3. Watch the live big screen
                </h3>
                <p className="text-[13px] text-[#1C2820]/60 leading-normal mt-0.5">
                  Live scores light up the projector and the winning photo is crowned!
                </p>
              </div>
            </div>
          </div>

          {/* Automatic update reassurance */}
          <div className="pt-3 border-t border-[#1C2820]/[0.06] flex items-center gap-2 text-[12px] text-[#1C2820]/55">
            <span className="w-1.5 h-1.5 rounded-full bg-[#74A886] shrink-0" />
            <span>No need to refresh — this screen will automatically activate the moment voting opens.</span>
          </div>
        </div>

        {/* Clear Call-To-Action buttons */}
        <div className="w-full mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/user/${currentEvent.id}/upload`}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-[#2D4A3A] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(45,74,58,0.20)] press hover:bg-[#233a2e] transition-colors"
          >
            <Camera className="w-4 h-4" /> Share a photo now
          </Link>
          <Link
            href={`/user/${currentEvent.id}/gallery`}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-white border border-[#1C2820]/[0.10] text-[#1C2820] text-[15px] font-semibold flex items-center justify-center gap-2 press hover:bg-[#FAF8F5] transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-[#1C2820]/60" /> Browse gallery
          </Link>
        </div>
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
            : 'Voting for this contest has ended. The hosts will reveal the winner shortly.'}
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
          </div>
        )}
      </div>

      {/* Candidates */}
      {contenders.length === 0 ? (
        <div className="py-14 text-center flex flex-col items-center gap-3">
          <p className="font-serif text-[26px] text-[#1C2820]">No photos entered for this contest yet</p>
          <p className="text-[15px] text-[#1C2820]/60 max-w-sm">Share a photo under this tag to enter this round!</p>
          <Link
            href={`/user/${currentEvent.id}/upload`}
            className="mt-1 h-12 px-6 rounded-2xl bg-[#2D4A3A] text-white text-[15px] font-semibold flex items-center gap-2 press"
          >
            <Camera className="w-5 h-5" /> Share a photo
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
                  <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-contain bg-black" />
                ) : (
                  <PhotoFrame src={item.url} alt={item.caption} />
                )}
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

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Check, Clock, X, Trophy, Lock, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEvent } from '@/context/EventContext';

const DISMISSED_KEY = 'withlove_dismissed_round';

const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Pops up on every guest screen the moment the host starts a live voting round,
 * with the round's photos and vote buttons right inside (no navigation needed).
 */
export default function LiveRoundSheet() {
  const pathname = usePathname() || '';
  const { votingRound, publicMemories, getPrompt, toggleVote, isHostLoggedIn, currentEvent, eventsLoaded } = useEvent();
  const [open, setOpen] = useState(false);
  const wasActiveRef = useRef<boolean | null>(null);
  // Winner reveal: set to the round's category when the host closes the round
  const [revealPromptId, setRevealPromptId] = useState<string | null>(null);
  const wasOpenRef = useRef<boolean | null>(null);

  // Identifies one round (category + end time) so a closed sheet doesn't keep coming back
  const roundKey = `${currentEvent.id}|${votingRound.promptId}|${votingRound.endsAt ?? 'open'}`;
  const isGuestScreen = pathname.startsWith('/user') && !pathname.endsWith('/projector') && !pathname.endsWith('/vote');

  useEffect(() => {
    // Wait for real event data, otherwise the initial "no round" placeholder looks like a round starting
    if (isHostLoggedIn || !eventsLoaded) return;
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = votingRound.isActive;

    if (!votingRound.isActive) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED_KEY) === roundKey;
    } catch (e) {}

    // A round just started while the guest is here, or they arrived during a round they haven't closed
    if (wasActive === false || (wasActive === null && !dismissed)) {
      setOpen(true);
      try {
        navigator.vibrate?.(60);
      } catch (e) {}
    }
  }, [votingRound.isActive, roundKey, isHostLoggedIn, eventsLoaded]);

  // The host closed the round (Close & Reveal Winner): show the winners to everyone
  useEffect(() => {
    if (isHostLoggedIn || !eventsLoaded) return;
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = votingRound.isOpen;
    if (wasOpen === true && !votingRound.isOpen && votingRound.promptId) {
      setOpen(false);
      setRevealPromptId(votingRound.promptId);
      try {
        navigator.vibrate?.([60, 40, 60]);
      } catch (e) {}
    }
  }, [votingRound.isOpen, votingRound.promptId, isHostLoggedIn, eventsLoaded]);

  // Celebrate when the winners appear
  useEffect(() => {
    if (!revealPromptId) return;
    const colors = ['#2D4A3A', '#74A886', '#F5C451', '#FAF8F5'];
    const t1 = setTimeout(() => {
      try {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors, zIndex: 90 });
      } catch (e) {}
    }, 250);
    const t2 = setTimeout(() => {
      try {
        confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, zIndex: 90 });
        confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, zIndex: 90 });
      } catch (e) {}
    }, 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [revealPromptId]);

  const canShowReveal = Boolean(revealPromptId) && !isHostLoggedIn && pathname.startsWith('/user') && !pathname.endsWith('/projector');

  // Lock page scroll behind the sheet
  useEffect(() => {
    if (!((open && isGuestScreen) || canShowReveal)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isGuestScreen, canShowReveal]);

  const close = () => {
    setOpen(false);
    setRevealPromptId(null);
    try {
      sessionStorage.setItem(DISMISSED_KEY, roundKey);
    } catch (e) {}
  };

  // Close with Escape (desktop)
  useEffect(() => {
    if (!open && !revealPromptId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (canShowReveal && revealPromptId) {
    return <WinnerReveal promptId={revealPromptId} onClose={close} />;
  }

  if (!open || isHostLoggedIn || !isGuestScreen || !votingRound.isOpen) return null;

  const prompt = getPrompt(votingRound.promptId);
  const contenders = publicMemories
    .filter((m) => m.promptId === votingRound.promptId)
    .sort((a, b) => b.votes - a.votes);

  const vote = (id: string, alreadyVoted?: boolean) => {
    toggleVote(id);
    if (alreadyVoted) return;
    try {
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.75 }, colors: ['#2D4A3A', '#74A886', '#E9EFEA', '#F59E0B'], zIndex: 90 });
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="live-round-title">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-up" style={{ animationDuration: '200ms' }} onClick={close} />

      <div
        className="relative w-full md:max-w-2xl max-h-[90dvh] flex flex-col bg-[#FAF8F5] rounded-t-[28px] md:rounded-[28px] shadow-[0_-10px_50px_rgba(0,0,0,0.25)] animate-fade-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Grabber (phones) */}
        <div className="md:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1.5 rounded-full bg-[#1C2820]/15" />
        </div>

        {/* Header */}
        <div className="px-5 md:px-7 pt-4 md:pt-6 pb-4 flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-[#2D4A3A] text-white text-[12px] font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9BC4A8] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9BC4A8]" />
              </span>
              {votingRound.isActive ? 'Live voting round' : 'Voting closed'}
            </span>
            <h2 id="live-round-title" className="font-serif text-[32px] md:text-[40px] leading-[1.05] font-medium tracking-tight text-[#1C2820]">
              {prompt.icon} {prompt.label}
            </h2>
            <p className="text-[14px] text-[#1C2820]/55 flex items-center gap-2">
              {votingRound.isActive ? (
                <>
                  {votingRound.secondsLeft !== null && (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#1C2820] tabular-nums">
                      <Clock className="w-4 h-4 text-[#1C2820]/45" />
                      {formatCountdown(votingRound.secondsLeft)} left
                    </span>
                  )}
                  <span>Tap the photos you love.</span>
                </>
              ) : (
                <span>Time’s up — the hosts will reveal the winner soon.</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-[#1C2820]/[0.07] text-[#1C2820]/70 flex items-center justify-center shrink-0 press"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Candidates */}
        <div className="flex-1 overflow-y-auto px-4 md:px-7 pb-4 overscroll-contain">
          {contenders.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Trophy className="w-8 h-8 text-[#2D4A3A] mx-auto" />
              <p className="text-[15px] text-[#1C2820]/60">No photos in this category yet — share one to enter!</p>
              <Link
                href={`/user/${currentEvent.id}/upload`}
                onClick={close}
                className="inline-flex h-11 px-5 rounded-2xl bg-[#2D4A3A] text-white text-[15px] font-semibold items-center press"
              >
                Share a photo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
              {contenders.map((item, idx) => (
                <div key={item.id} className="rounded-[20px] overflow-hidden bg-white border border-[#1C2820]/[0.06]">
                  <div className="relative aspect-square bg-black/5">
                    {item.type === 'video' ? (
                      <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <img src={item.url} alt={item.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <span
                      className={`absolute top-2 left-2 h-6 min-w-6 px-2 rounded-full text-[12px] font-bold flex items-center justify-center ${
                        idx === 0 && item.votes > 0 ? 'bg-[#F5C451] text-[#1C2820]' : 'bg-black/45 backdrop-blur-md text-white'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="absolute top-2 right-2 h-6 px-2 rounded-full bg-white/90 text-[#1C2820] text-[12px] font-semibold flex items-center gap-1 tabular-nums">
                      <Heart className="w-3 h-3 text-[#2D4A3A]" fill="currentColor" /> {item.votes}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="px-1 pb-2 text-[13px] text-[#1C2820]/60 truncate">{item.guestName}</p>
                    {votingRound.isActive ? (
                      <button
                        type="button"
                        onClick={() => vote(item.id, item.votedByMe)}
                        aria-pressed={item.votedByMe}
                        className={`w-full h-10 rounded-[14px] text-[14px] font-semibold flex items-center justify-center gap-1.5 press ${
                          item.votedByMe ? 'bg-[#2D4A3A] text-white' : 'bg-[#E9EFEA] text-[#2D4A3A]'
                        }`}
                      >
                        {item.votedByMe ? <Check className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                        {item.votedByMe ? 'Voted' : 'Vote'}
                      </button>
                    ) : (
                      <div className="w-full h-10 rounded-[14px] bg-[#1C2820]/[0.04] text-[#1C2820]/45 text-[13px] font-medium flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> {item.votedByMe ? 'You voted' : 'Closed'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 md:px-7 pt-3 pb-4 border-t border-[#1C2820]/[0.07] flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="text-[15px] font-medium text-[#1C2820]/55 py-2 press">
            Maybe later
          </button>
          <Link
            href={`/user/${currentEvent.id}/vote`}
            onClick={close}
            className="h-11 px-4 rounded-2xl bg-[#1C2820]/[0.06] text-[#1C2820] text-[14px] font-semibold flex items-center gap-1 press"
          >
            See full contest <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

const PLACE_BADGES = ['🥈', '🥉'];

// Celebratory sheet shown to every guest when the host closes a round
function WinnerReveal({ promptId, onClose }: { promptId: string; onClose: () => void }) {
  const { publicMemories, getPrompt } = useEvent();
  const prompt = getPrompt(promptId);

  const ranked = publicMemories
    .filter((m) => m.promptId === promptId && m.votes > 0)
    .sort((a, b) => b.votes - a.votes);
  const topVotes = ranked[0]?.votes ?? 0;
  // Every photo tied on the most votes is a winner
  const winners = ranked.filter((m) => m.votes === topVotes);
  const runnersUp = ranked.filter((m) => m.votes < topVotes).slice(0, 2);
  const isTie = winners.length > 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="winner-title">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-fade-up" style={{ animationDuration: '200ms' }} onClick={onClose} />

      <div
        className="relative w-full md:max-w-lg max-h-[92dvh] flex flex-col bg-[#FAF8F5] rounded-t-[28px] md:rounded-[28px] shadow-[0_-10px_50px_rgba(0,0,0,0.3)] animate-fade-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="md:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1.5 rounded-full bg-[#1C2820]/15" />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 md:px-7 pt-4 md:pt-7 pb-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#F5C451] text-[#1C2820] text-[12px] font-bold">
                <Trophy className="w-3.5 h-3.5" /> {winners.length === 0 ? 'Round closed' : isTie ? "It's a tie!" : 'And the winner is…'}
              </span>
              <h2 id="winner-title" className="font-serif text-[32px] md:text-[38px] leading-[1.05] font-medium tracking-tight text-[#1C2820]">
                {prompt.icon} {prompt.label}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full bg-[#1C2820]/[0.07] text-[#1C2820]/70 flex items-center justify-center shrink-0 press"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>

          {winners.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="font-serif text-[24px] text-[#1C2820]">No votes this round</p>
              <p className="text-[15px] text-[#1C2820]/55">Keep sharing — there’s always the next one.</p>
            </div>
          ) : (
            <div className="pt-5 space-y-5">
              {/* Winner(s) */}
              <div className={isTie ? 'grid grid-cols-2 gap-3' : ''}>
                {winners.map((w) => (
                  <figure key={w.id} className="rounded-[24px] overflow-hidden bg-white border-2 border-[#F5C451] shadow-[0_12px_40px_rgba(245,196,81,0.25)]">
                    <div className={`relative bg-black/5 ${isTie ? 'aspect-square' : 'aspect-[4/5] max-h-[48dvh] w-full'}`}>
                      {w.type === 'video' ? (
                        <video src={w.url} muted playsInline autoPlay loop className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <img src={w.url} alt={w.caption} className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <span className="absolute top-3 left-3 h-8 px-3 rounded-full bg-[#F5C451] text-[#1C2820] text-[13px] font-bold flex items-center gap-1 shadow-md">
                        🏆 Winner
                      </span>
                    </div>
                    <figcaption className="p-4 space-y-1">
                      <p className={`font-semibold text-[#1C2820] ${isTie ? 'text-[15px]' : 'text-[18px]'} truncate`}>{w.guestName}</p>
                      {!isTie && <p className="text-[15px] text-[#1C2820]/60 leading-snug line-clamp-2">“{w.caption}”</p>}
                      <p className="text-[14px] font-semibold text-[#2D4A3A] flex items-center gap-1">
                        <Heart className="w-4 h-4" fill="currentColor" /> {w.votes} {w.votes === 1 ? 'vote' : 'votes'}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>

              {/* Runners-up */}
              {!isTie && runnersUp.length > 0 && (
                <div className="space-y-2">
                  <p className="px-1 text-[13px] font-medium uppercase tracking-[0.08em] text-[#1C2820]/45">Runners-up</p>
                  {runnersUp.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-[18px] bg-white border border-[#1C2820]/[0.06]">
                      <img src={m.url} alt="" className="w-14 h-14 rounded-[14px] object-cover bg-black/5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-[#1C2820] truncate">
                          {PLACE_BADGES[i]} {m.guestName}
                        </p>
                        <p className="text-[13px] text-[#1C2820]/55 truncate">“{m.caption}”</p>
                      </div>
                      <span className="text-[14px] font-semibold text-[#2D4A3A] tabular-nums shrink-0 pr-1">{m.votes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 md:px-7 pt-3 pb-4 border-t border-[#1C2820]/[0.07]">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-14 rounded-2xl bg-[#2D4A3A] text-white text-[16px] font-semibold press"
          >
            Back to the celebration
          </button>
        </div>
      </div>
    </div>
  );
}

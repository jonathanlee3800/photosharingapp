'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Clock, X, Trophy, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEvent } from '@/context/EventContext';

// Per event: the close time of the last winner reveal this phone has shown
const SEEN_REVEAL_KEY = 'withlove_seen_reveal';
// Don't pop up results from rounds that closed long ago
const REVEAL_WINDOW_MS = 6 * 60 * 60 * 1000;

const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Announces a live voting round on every guest screen for as long as the round is open:
 * when it starts, when the guest comes back to the app, and when they open or reload the page.
 * "Maybe later" keeps it away while they move around the app; a reload brings it back.
 */
export default function LiveRoundSheet() {
  const pathname = usePathname() || '';
  const { votingRound, publicMemories, getPrompt, isHostLoggedIn, currentEvent, eventsLoaded } = useEvent();
  const [open, setOpen] = useState(false);
  const wasActiveRef = useRef<boolean | null>(null);
  // The round this guest closed the announcement for (or already went to). In memory, so it resets on reload.
  const dismissedRoundRef = useRef<string | null>(null);
  // Winner reveal: set to the round's category when there's a result this phone hasn't seen
  const [revealPromptId, setRevealPromptId] = useState<string | null>(null);

  // Identifies one round (category + end time)
  const roundKey = `${currentEvent.id}|${votingRound.promptId}|${votingRound.endsAt ?? 'open'}`;
  const isGuestScreen = pathname.startsWith('/user') && !pathname.endsWith('/projector') && !pathname.endsWith('/vote');

  useEffect(() => {
    // Wait for real event data, otherwise the initial "no round" placeholder looks like a round ending
    if (isHostLoggedIn || !eventsLoaded) return;
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = votingRound.isActive;

    if (!votingRound.isActive) {
      setOpen(false);
      return;
    }

    // A fresh start always announces, even if the same category was dismissed in an earlier round
    if (wasActive === false) dismissedRoundRef.current = null;
    // A new round takes over from the previous round's results
    setRevealPromptId(null);

    // Already at the round: nothing to announce, now or after they leave the page
    if (pathname.endsWith('/vote')) {
      dismissedRoundRef.current = roundKey;
      setOpen(false);
      return;
    }
    if (!isGuestScreen || dismissedRoundRef.current === roundKey) return;

    setOpen(true);
    try {
      navigator.vibrate?.(60);
    } catch (e) {}
  }, [votingRound.isActive, roundKey, isHostLoggedIn, eventsLoaded, pathname, isGuestScreen]);

  // Winner reveal, once per guest per round, whenever there's a recent result this phone hasn't seen:
  // watching live, phone was locked / app in the background (re-checked on return), or opened afterwards.
  useEffect(() => {
    if (isHostLoggedIn || !eventsLoaded) return;
    // Only on guest pages where the pop-up can render, so it is never marked seen without being shown
    if (!pathname.startsWith('/user') || pathname.endsWith('/projector')) return;
    const closedAt = votingRound.closedAt;
    if (votingRound.isOpen || !closedAt || !votingRound.promptId) return;
    if (Date.now() - new Date(closedAt).getTime() > REVEAL_WINDOW_MS) return;
    const seenKey = `${SEEN_REVEAL_KEY}:${currentEvent.id}`;
    try {
      if (localStorage.getItem(seenKey) === closedAt) return;
      localStorage.setItem(seenKey, closedAt);
    } catch (e) {}
    setOpen(false);
    setRevealPromptId(votingRound.promptId);
    try {
      navigator.vibrate?.([60, 40, 60]);
    } catch (e) {}
  }, [votingRound.isOpen, votingRound.closedAt, votingRound.promptId, isHostLoggedIn, eventsLoaded, currentEvent.id, pathname]);

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

  const closeReveal = () => setRevealPromptId(null);

  const close = () => {
    setOpen(false);
    dismissedRoundRef.current = roundKey;
  };

  // Close with Escape (desktop)
  useEffect(() => {
    if (!open && !revealPromptId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (revealPromptId ? closeReveal() : close());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (canShowReveal && revealPromptId) {
    return <WinnerReveal promptId={revealPromptId} onClose={closeReveal} />;
  }

  if (!open || isHostLoggedIn || !isGuestScreen || !votingRound.isOpen) return null;

  const prompt = getPrompt(votingRound.promptId);
  const photoCount = publicMemories.filter((m) => m.promptId === votingRound.promptId).length;

  // Announcement only: voting itself happens on the contest page
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="live-round-title">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-up" style={{ animationDuration: '200ms' }} onClick={close} />

      <div
        className="relative w-full md:max-w-md bg-[#FAF8F5] rounded-t-[28px] md:rounded-[28px] shadow-[0_-10px_50px_rgba(0,0,0,0.25)] animate-fade-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="md:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1.5 rounded-full bg-[#1C2820]/15" />
        </div>

        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#1C2820]/[0.07] text-[#1C2820]/70 flex items-center justify-center press"
        >
          <X className="w-[18px] h-[18px]" />
        </button>

        <div className="px-6 pt-6 md:pt-8 pb-6 flex flex-col items-center text-center">
          <span className="relative w-16 h-16 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center">
            <Trophy className="w-8 h-8" strokeWidth={1.8} />
            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#9BC4A8] ring-4 ring-[#FAF8F5] animate-pulse" />
          </span>

          <span className="mt-4 inline-flex items-center gap-2 h-7 px-3 rounded-full bg-[#E9EFEA] text-[#2D4A3A] text-[12px] font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D4A3A] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2D4A3A]" />
            </span>
            Live voting round
          </span>

          <h2 id="live-round-title" className="mt-3 font-serif text-[34px] leading-[1.05] font-medium tracking-tight text-[#1C2820]">
            {prompt.icon} {prompt.label}
          </h2>

          <p className="mt-3 text-[15px] text-[#1C2820]/60 flex items-center justify-center gap-2 flex-wrap">
            {votingRound.secondsLeft !== null && (
              <span className="inline-flex items-center gap-1 font-semibold text-[#1C2820] tabular-nums">
                <Clock className="w-4 h-4 text-[#1C2820]/45" />
                {formatCountdown(votingRound.secondsLeft)} left
              </span>
            )}
            {votingRound.secondsLeft !== null && <span className="w-1 h-1 rounded-full bg-[#1C2820]/25" />}
            <span>
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'} to vote on
            </span>
          </p>

          <Link
            href={`/user/${currentEvent.code}/vote`}
            onClick={close}
            className="mt-6 w-full h-14 rounded-2xl bg-[#2D4A3A] text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(45,74,58,0.28)] press"
          >
            Go to live round <ChevronRight className="w-5 h-5" />
          </Link>
          <button type="button" onClick={close} className="mt-2 w-full py-3 text-[15px] font-medium text-[#1C2820]/55 press">
            Maybe later
          </button>
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
                      {!isTie && <p className="text-[15px] text-[#1C2820]/60 leading-snug line-clamp-2">{w.caption && `“${w.caption}”`}</p>}
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
                        <p className="text-[13px] text-[#1C2820]/55 truncate">{m.caption && `“${m.caption}”`}</p>
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

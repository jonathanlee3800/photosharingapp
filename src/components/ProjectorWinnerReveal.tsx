'use client';

import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Trophy } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import PhotoFrame from '@/components/PhotoFrame';

// How long after a round closes a projector that has just opened still shows the result
const LATE_OPEN_MS = 60 * 1000;
const DRUMROLL_MS = 3500;
const SHOW_MS = 20 * 1000;
const PLACE_BADGES = ['🥈', '🥉'];

type Phase = 'idle' | 'drumroll' | 'reveal';

/**
 * The winner reveal on the big screen. When the host ends a round (or its timer runs out) the
 * projector builds suspense for a few seconds while it fetches the final totals, then shows the
 * winning photo full-screen with confetti, and returns to the slideshow on its own.
 * Click, tap or Esc closes it early.
 */
export default function ProjectorWinnerReveal() {
  const { votingRound, publicMemories, getPrompt, refreshPosts, eventsLoaded } = useEvent();
  const [phase, setPhase] = useState<Phase>('idle');
  const [promptId, setPromptId] = useState('');
  const shownRef = useRef<string | null>(null);

  // Start when a round's close time appears that this screen hasn't shown yet
  useEffect(() => {
    const closedAt = votingRound.closedAt;
    if (!eventsLoaded || votingRound.isOpen || !closedAt || !votingRound.promptId) return;
    if (shownRef.current === closedAt) return;
    shownRef.current = closedAt;
    // An old result from before the projector was opened is not news
    if (Date.now() - new Date(closedAt).getTime() > LATE_OPEN_MS) return;

    let cancelled = false;
    setPromptId(votingRound.promptId);
    setPhase('drumroll');
    // Fetch the exact final votes while the suspense plays, never cutting the suspense short
    Promise.all([refreshPosts(), new Promise((r) => setTimeout(r, DRUMROLL_MS))]).then(() => {
      if (!cancelled) setPhase('reveal');
    });
    return () => {
      cancelled = true;
    };
  }, [votingRound.closedAt, votingRound.isOpen, votingRound.promptId, eventsLoaded, refreshPosts]);

  // A new round starting takes over the screen
  useEffect(() => {
    if (votingRound.isOpen) setPhase('idle');
  }, [votingRound.isOpen]);

  // Back to the slideshow on its own; click, tap or Esc closes early
  useEffect(() => {
    if (phase !== 'reveal') return;
    const timer = setTimeout(() => setPhase('idle'), SHOW_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhase('idle');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [phase]);

  const ranked = publicMemories
    .filter((m) => m.promptId === promptId && m.votes > 0)
    .sort((a, b) => b.votes - a.votes);
  const topVotes = ranked[0]?.votes ?? 0;
  const winners = ranked.filter((m) => m.votes === topVotes).slice(0, 4);
  const runnersUp = ranked.filter((m) => m.votes < topVotes).slice(0, 2);
  const isTie = winners.length > 1;

  // Confetti from both sides, twice, when the winner appears
  useEffect(() => {
    if (phase !== 'reveal' || winners.length === 0) return;
    const colors = ['#2D4A3A', '#74A886', '#F5C451', '#FFFFFF'];
    const burst = () => {
      try {
        confetti({ particleCount: 140, spread: 100, startVelocity: 55, origin: { y: 0.65 }, colors, zIndex: 200 });
        confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors, zIndex: 200 });
        confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors, zIndex: 200 });
      } catch (e) {}
    };
    const t1 = setTimeout(burst, 300);
    const t2 = setTimeout(burst, 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // Only once per reveal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'idle') return null;
  const prompt = getPrompt(promptId);
  const hero = winners[0];

  return (
    <div
      className="fixed inset-0 z-[150] overflow-hidden bg-[#FAF8F5] text-[#1C2820] cursor-pointer animate-fade-up"
      style={{ animationDuration: '600ms' }}
      onClick={() => phase === 'reveal' && setPhase('idle')}
      role="dialog"
      aria-modal="true"
      aria-label="Contest winner"
    >
      {/* Soft glow of the winning photo behind everything */}
      {phase === 'reveal' && hero && hero.type !== 'video' && (
        <img
          src={hero.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-[120px] opacity-35 scale-125 pointer-events-none"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/40 via-[#FAF8F5]/20 to-[#FAF8F5]/70 pointer-events-none" />

      {phase === 'drumroll' ? (
        <div className="relative h-full flex flex-col items-center justify-center text-center px-[6vw]">
          <span className="inline-flex items-center gap-[1vmin] h-[5.5vmin] min-h-8 px-[2.4vmin] rounded-full bg-[#F5C451] text-[#1C2820] text-[clamp(13px,2.2vmin,26px)] font-bold animate-fade-up">
            <Trophy className="w-[2.6vmin] h-[2.6vmin] min-w-4 min-h-4" /> Contest results
          </span>
          <h1
            className="mt-[4vmin] font-serif text-[clamp(36px,9vmin,128px)] leading-[1.02] font-medium tracking-tight animate-fade-up"
            style={{ animationDelay: '250ms' }}
          >
            {prompt.icon} {prompt.label}
          </h1>
          <p
            className="mt-[5vmin] text-[clamp(20px,4.4vmin,60px)] font-medium text-[#2D4A3A] animate-fade-up"
            style={{ animationDelay: '900ms' }}
          >
            And the winner is
            <span className="inline-flex w-[1.6em] justify-start">
              <span className="animate-pulse">…</span>
            </span>
          </p>
        </div>
      ) : winners.length === 0 ? (
        <div className="relative h-full flex flex-col items-center justify-center text-center px-[6vw] animate-fade-up">
          <span className="inline-flex items-center gap-[1vmin] h-[5.5vmin] min-h-8 px-[2.4vmin] rounded-full bg-[#1C2820]/[0.07] text-[clamp(13px,2.2vmin,26px)] font-semibold">
            <Trophy className="w-[2.6vmin] h-[2.6vmin] min-w-4 min-h-4" /> Round closed
          </span>
          <h1 className="mt-[4vmin] font-serif text-[clamp(32px,8vmin,110px)] leading-[1.05] font-medium tracking-tight">
            {prompt.icon} {prompt.label}
          </h1>
          <p className="mt-[3vmin] text-[clamp(18px,3.4vmin,44px)] text-[#1C2820]/55">No votes this time. Keep sharing!</p>
        </div>
      ) : isTie ? (
        <div className="relative h-full flex flex-col items-center justify-center px-[4vw] py-[4vh] gap-[3vh]">
          <div className="text-center animate-fade-up">
            <span className="inline-flex items-center gap-[1vmin] h-[5vmin] min-h-8 px-[2.4vmin] rounded-full bg-[#F5C451] text-[clamp(13px,2.2vmin,26px)] font-bold">
              🏆 It&apos;s a tie!
            </span>
            <h1 className="mt-[1.6vh] font-serif text-[clamp(28px,6vmin,84px)] leading-[1.05] font-medium tracking-tight">
              {prompt.icon} {prompt.label}
            </h1>
          </div>
          <div className="w-full flex-1 min-h-0 flex items-stretch justify-center gap-[2.5vw]">
            {winners.map((w, i) => (
              <figure
                key={w.id}
                className="flex-1 max-w-[42vw] min-w-0 flex flex-col animate-fade-up"
                style={{ animationDelay: `${200 + i * 150}ms` }}
              >
                <div className="relative flex-1 min-h-0 rounded-[3vmin] overflow-hidden border-[0.5vmin] border-[#F5C451] shadow-[0_20px_60px_rgba(245,196,81,0.3)] bg-black/5">
                  {w.type === 'video' ? (
                    <video src={w.url} muted playsInline autoPlay loop className="absolute inset-0 w-full h-full object-contain bg-black" />
                  ) : (
                    <PhotoFrame src={w.url} alt={w.caption} />
                  )}
                </div>
                <figcaption className="pt-[1.6vh] text-center">
                  <p className="font-serif text-[clamp(20px,4vmin,56px)] font-medium leading-tight truncate">{w.guestName}</p>
                  <p className="text-[clamp(14px,2.4vmin,32px)] font-semibold text-[#2D4A3A] inline-flex items-center gap-[0.8vmin]">
                    <Heart className="w-[2.4vmin] h-[2.4vmin] min-w-3.5 min-h-3.5" fill="currentColor" /> {w.votes}{' '}
                    {w.votes === 1 ? 'vote' : 'votes'}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative h-full flex flex-col landscape:flex-row items-center justify-center gap-[4vmin] px-[5vw] py-[5vh]">
          {/* The winning photo, whole */}
          <div
            className="relative shrink-0 w-[min(88vw,52vh)] landscape:w-[min(52vw,66vh)] aspect-[4/5] rounded-[3.5vmin] overflow-hidden border-[0.6vmin] border-[#F5C451] shadow-[0_30px_90px_rgba(245,196,81,0.35)] bg-black/5 animate-fade-up"
            style={{ animationDuration: '800ms' }}
          >
            {hero.type === 'video' ? (
              <video src={hero.url} muted playsInline autoPlay loop className="absolute inset-0 w-full h-full object-contain bg-black" />
            ) : (
              <PhotoFrame src={hero.url} alt={hero.caption} />
            )}
          </div>

          {/* Who won */}
          <div className="min-w-0 max-w-[88vw] landscape:max-w-[36vw] text-center landscape:text-left">
            <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
              <span className="inline-flex items-center gap-[1vmin] h-[5.5vmin] min-h-8 px-[2.4vmin] rounded-full bg-[#F5C451] text-[clamp(13px,2.2vmin,26px)] font-bold">
                🏆 Winner · {prompt.icon} {prompt.label}
              </span>
            </div>
            <h1
              className="mt-[3vmin] font-serif text-[clamp(40px,10vmin,140px)] leading-[0.98] font-medium tracking-tight break-words animate-fade-up"
              style={{ animationDelay: '500ms' }}
            >
              {hero.guestName}
            </h1>
            {hero.caption && (
              <p
                className="mt-[2.4vmin] text-[clamp(18px,3.2vmin,42px)] leading-snug text-[#1C2820]/65 line-clamp-3 animate-fade-up"
                style={{ animationDelay: '700ms' }}
              >
                “{hero.caption}”
              </p>
            )}
            <p
              className="mt-[3vmin] text-[clamp(20px,4vmin,54px)] font-semibold text-[#2D4A3A] inline-flex items-center gap-[1.2vmin] tabular-nums animate-fade-up"
              style={{ animationDelay: '900ms' }}
            >
              <Heart className="w-[4vmin] h-[4vmin] min-w-5 min-h-5" fill="currentColor" /> {hero.votes}{' '}
              {hero.votes === 1 ? 'vote' : 'votes'}
            </p>

            {runnersUp.length > 0 && (
              <div className="mt-[4vmin] space-y-[1.4vmin] animate-fade-up" style={{ animationDelay: '1300ms' }}>
                {runnersUp.map((m, i) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-[1.6vmin] p-[1.2vmin] pr-[2vmin] rounded-[2.2vmin] bg-white/80 border border-[#1C2820]/[0.06] text-left"
                  >
                    {m.type === 'video' ? (
                      <video src={m.url} muted playsInline preload="metadata" className="w-[8vmin] h-[8vmin] min-w-10 min-h-10 rounded-[1.4vmin] object-cover bg-black shrink-0" />
                    ) : (
                      <img src={m.url} alt="" className="w-[8vmin] h-[8vmin] min-w-10 min-h-10 rounded-[1.4vmin] object-cover bg-black/5 shrink-0" />
                    )}
                    <p className="flex-1 min-w-0 text-[clamp(15px,2.6vmin,34px)] font-semibold truncate">
                      {PLACE_BADGES[i]} {m.guestName}
                    </p>
                    <span className="text-[clamp(15px,2.6vmin,34px)] font-semibold text-[#2D4A3A] tabular-nums shrink-0">{m.votes}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pin } from 'lucide-react';
import { MemoryItem } from '@/lib/initialData';

const CROSSFADE_MS = 900;

interface SlideCardProps {
  memory: MemoryItem;
  isVertical: boolean;
  rounded: string;
  isHero?: boolean;
  isEntering?: boolean;
  /** Side photos: faded with a solid veil (not transparency), so overlapping photos never show through each other */
  veil?: 'near' | 'far';
  /** Size from the height and keep this photo's own shape (for the photo fading out) */
  keepShape?: boolean;
}

function SlideCard({
  memory,
  isVertical,
  rounded,
  isHero = false,
  isEntering = false,
  veil,
  keepShape = false,
}: SlideCardProps) {
  // Standardized 2-format aspect ratio: 3:4 for vertical (portrait), 4:3 for horizontal (landscape).
  const aspectClass = isVertical ? 'aspect-[3/4]' : 'aspect-[4/3]';

  return (
    <div
      className={`relative ${keepShape ? 'h-full w-auto max-w-none' : 'w-full h-full'} ${aspectClass} flex items-center justify-center overflow-hidden shrink-0 transition-all duration-700 ease-out ${rounded} ${
        isHero
          ? 'shadow-[0_16px_50px_rgba(20,35,25,0.25)] sm:shadow-[0_36px_120px_rgba(20,35,25,0.40)] ring-1 ring-black/[0.08] bg-black/5'
          : 'shadow-[0_10px_30px_rgba(20,35,25,0.15)] sm:shadow-[0_16px_50px_rgba(20,35,25,0.22)] ring-1 ring-black/[0.06] bg-black/10'
      }`}
    >
      {memory.type === 'video' ? (
        <video
          src={memory.url}
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover ${rounded}`}
        />
      ) : (
        <img
          src={memory.url}
          alt={memory.caption || `Photo by ${memory.guestName}`}
          className={`w-full h-full object-cover ${
            isHero && isEntering ? 'animate-ken-burns' : ''
          } ${rounded}`}
        />
      )}
      {veil && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none transition-colors duration-500 ${rounded} ${
            veil === 'near' ? 'bg-[#FAF8F5]/40 group-hover:bg-[#FAF8F5]/5' : 'bg-[#FAF8F5]/65 group-hover:bg-[#FAF8F5]/25'
          }`}
        />
      )}
    </div>
  );
}

/**
 * Cinematic Infinite Ribbon Carousel Stage:
 * - 2 Standardized formats (vertical 3:4 and horizontal 4:3) sharing identical height parity.
 * - Phone responsive: adapts hero bounds for narrow portrait screens and phone landscape.
 * - Flanking cards tuck BEHIND the center hero card on widescreen displays.
 * - Carousel edge mask gently dissolves flanking cards into the sides of the screen.
 * - Frame-perfect cross-dissolve with slow Ken Burns breathing on active photo.
 */
export default function SlideStage({
  active,
  memories,
  rounded = 'rounded-[20px] sm:rounded-[28px]',
  showPeeks = true,
  pinned = false,
  onPrev,
  onNext,
}: {
  active: MemoryItem;
  memories: MemoryItem[];
  rounded?: string;
  showPeeks?: boolean;
  /** The host has pinned this photo: shows a pin badge on it */
  pinned?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const shownRef = useRef<MemoryItem | null>(null);
  const [outgoing, setOutgoing] = useState<MemoryItem | null>(null);

  // Orientation cache: pre-detects whether each photo is vertical or horizontal
  const [orientationMap, setOrientationMap] = useState<Record<string, 'horizontal' | 'vertical'>>({});

  useEffect(() => {
    memories.forEach((m) => {
      if (orientationMap[m.id]) return;
      if (m.type === 'video') {
        setOrientationMap((prev) => ({ ...prev, [m.id]: 'horizontal' }));
      } else {
        const img = new Image();
        img.src = m.url;
        img.onload = () => {
          const isVert = img.naturalHeight > img.naturalWidth;
          setOrientationMap((prev) => ({
            ...prev,
            [m.id]: isVert ? 'vertical' : 'horizontal',
          }));
        };
      }
    });
  }, [memories, orientationMap]);

  useEffect(() => {
    const previous = shownRef.current;
    shownRef.current = active;
    if (!previous || previous.id === active.id) return;
    setOutgoing(previous);
    const timer = setTimeout(() => setOutgoing(null), CROSSFADE_MS);
    return () => clearTimeout(timer);
  }, [active.id]);

  // Preload next and previous images in memory so transitions are instantaneous
  useEffect(() => {
    if (memories.length < 2) return;
    const index = memories.findIndex((m) => m.id === active.id);
    const next = memories[(index + 1) % memories.length];
    const prev = memories[(index - 1 + memories.length) % memories.length];
    if (next?.type === 'photo') new Image().src = next.url;
    if (prev?.type === 'photo') new Image().src = prev.url;
  }, [active.id, memories]);

  const currentIndex = memories.findIndex((m) => m.id === active.id);
  const total = memories.length;

  const prevMemory = total > 1 ? memories[(currentIndex - 1 + total) % total] : null;
  const nextMemory = total > 1 ? memories[(currentIndex + 1) % total] : null;

  // Far peek cards: populated when at least 4 memories are available for infinite ribbon depth
  const prevPrevMemory = total >= 4 ? memories[(currentIndex - 2 + total) % total] : null;
  const nextNextMemory = total >= 4 ? memories[(currentIndex + 2) % total] : null;

  const isHeroVertical = orientationMap[active.id] === 'vertical';
  const heroAspectClass = isHeroVertical ? 'aspect-[3/4]' : 'aspect-[4/3]';

  // Responsive hero sizing:
  // On mobile portrait, clamp width so 4:3 landscape photos don't bleed horizontally off-screen,
  // and clamp height for 3:4 portrait photos so they don't push the bottom section off.
  // On desktop/tablet (sm:) and mobile landscape, size strictly by stage height.
  const heroSizeClass = isHeroVertical
    ? 'w-auto h-full max-h-[50vh] sm:max-h-full max-w-[calc(100vw-2rem)] sm:max-w-none'
    : 'w-[calc(100vw-2rem)] max-w-lg sm:max-w-none sm:w-auto h-auto sm:h-full landscape:h-full landscape:w-auto';

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none overflow-visible ${
        showPeeks ? 'sm:carousel-edge-mask' : ''
      }`}
    >
      {/* 
        Hero Stage Anchor:
        Anchored dead-center. The flanking side cards are anchored relative to this container's
        dynamic edges, ensuring they tuck BEHIND the hero's left and right sides regardless of whether
        the active photo is vertical (3:4) or horizontal (4:3).
      */}
      <div className={`relative ${heroAspectClass} ${heroSizeClass} flex items-center justify-center shrink-0`}>
        {/* 1. Far Left Peek Card (Layer 0: Deepest behind, stretches towards screen edge) */}
        {showPeeks && prevPrevMemory && (
          <div
            onClick={onPrev}
            className="hidden lg:flex absolute right-full top-1/2 -translate-y-1/2 h-[74%] max-h-[74%] items-center justify-center cursor-pointer transition-all duration-700 ease-out z-0 -translate-x-[36%] xl:-translate-x-[44%] scale-[0.82] hover:scale-[0.85] blur-[0.5px] hover:blur-none brightness-85 hover:brightness-100 select-none group"
            title="Earlier photo (Left arrow)"
          >
            <SlideCard
              memory={prevPrevMemory}
              veil="far"
              isVertical={orientationMap[prevPrevMemory.id] === 'vertical'}
              rounded={rounded}
              isHero={false}
            />
          </div>
        )}

        {/* 2. Near Left Peek Card (Layer 1: Behind main hero, overlaps behind left edge) */}
        {showPeeks && prevMemory && (
          <div
            onClick={onPrev}
            className="hidden sm:flex absolute right-full top-1/2 -translate-y-1/2 h-[86%] max-h-[86%] items-center justify-center cursor-pointer transition-all duration-700 ease-out z-10 translate-x-[26%] md:translate-x-[32%] lg:translate-x-[36%] scale-[0.92] hover:scale-[0.94] brightness-95 hover:brightness-100 select-none group"
            title="Previous photo (Left arrow)"
          >
            <SlideCard
              memory={prevMemory}
              veil="near"
              isVertical={orientationMap[prevMemory.id] === 'vertical'}
              rounded={rounded}
              isHero={false}
            />
          </div>
        )}

        {/* 3. Center Hero Card (Layer 2: Outgoing Fading Out) */}
        {outgoing && outgoing.id !== active.id && (
          // Keeps its own shape while fading, instead of being squeezed into the next photo's frame
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center justify-center animate-[fadeOut_900ms_ease-out_both] pointer-events-none z-20">
            <SlideCard
              memory={outgoing}
              isVertical={orientationMap[outgoing.id] === 'vertical'}
              rounded={rounded}
              isHero={true}
              isEntering={false}
              keepShape
            />
          </div>
        )}

        {/* 4. Center Hero Card (Layer 2: Active Fading In with Ken Burns) */}
        <div
          key={active.id}
          className="relative w-full h-full flex items-center justify-center animate-[fadeIn_900ms_ease-out_both] z-20"
        >
          <SlideCard
            memory={active}
            isVertical={isHeroVertical}
            rounded={rounded}
            isHero={true}
            isEntering={true}
          />
          {pinned && (
            <span
              className="absolute top-[clamp(8px,1.8vmin,22px)] left-[clamp(8px,1.8vmin,22px)] z-30 inline-flex items-center gap-[clamp(4px,0.7vmin,9px)] h-[clamp(26px,4.2vmin,48px)] pl-[clamp(8px,1.2vmin,16px)] pr-[clamp(10px,1.6vmin,20px)] rounded-full bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.06] shadow-[0_6px_20px_rgba(20,35,25,0.18)] text-[#2D4A3A] text-[clamp(12px,1.7vmin,20px)] font-semibold animate-fade-up"
              role="status"
              aria-label="Pinned by the hosts"
            >
              <Pin className="w-[1.1em] h-[1.1em] animate-pin-press" fill="currentColor" strokeWidth={2} />
              Pinned
            </span>
          )}
        </div>

        {/* 5. Near Right Peek Card (Layer 1: Behind main hero, overlaps behind right edge) */}
        {showPeeks && nextMemory && (
          <div
            onClick={onNext}
            className="hidden sm:flex absolute left-full top-1/2 -translate-y-1/2 h-[86%] max-h-[86%] items-center justify-center cursor-pointer transition-all duration-700 ease-out z-10 -translate-x-[26%] md:-translate-x-[32%] lg:-translate-x-[36%] scale-[0.92] hover:scale-[0.94] brightness-95 hover:brightness-100 select-none group"
            title="Next photo (Right arrow)"
          >
            <SlideCard
              memory={nextMemory}
              veil="near"
              isVertical={orientationMap[nextMemory.id] === 'vertical'}
              rounded={rounded}
              isHero={false}
            />
          </div>
        )}

        {/* 6. Far Right Peek Card (Layer 0: Deepest behind, stretches towards screen edge) */}
        {showPeeks && nextNextMemory && (
          <div
            onClick={onNext}
            className="hidden lg:flex absolute left-full top-1/2 -translate-y-1/2 h-[74%] max-h-[74%] items-center justify-center cursor-pointer transition-all duration-700 ease-out z-0 translate-x-[36%] xl:translate-x-[44%] scale-[0.82] hover:scale-[0.85] blur-[0.5px] hover:blur-none brightness-85 hover:brightness-100 select-none group"
            title="Upcoming photo (Right arrow)"
          >
            <SlideCard
              memory={nextNextMemory}
              veil="far"
              isVertical={orientationMap[nextNextMemory.id] === 'vertical'}
              rounded={rounded}
              isHero={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

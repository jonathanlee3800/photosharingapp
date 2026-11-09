'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MemoryItem } from '@/lib/initialData';

const CROSSFADE_MS = 900;

function SlideMedia({ memory, entering, rounded }: { memory: MemoryItem; entering: boolean; rounded: string }) {
  const mediaClass = `relative max-w-full max-h-full object-contain shadow-[0_24px_70px_rgba(45,74,58,0.22)] ${rounded}`;
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${entering ? 'animate-[slideFade_900ms_ease-out_both]' : ''}`}>
      {memory.type === 'video' ? (
        <video src={memory.url} autoPlay loop muted playsInline className={mediaClass} />
      ) : (
        <img src={memory.url} alt={memory.caption} className={mediaClass} />
      )}
    </div>
  );
}

/**
 * The current slide, shown whole. New photos crossfade over the previous one, and the next photo
 * is loaded ahead of time so it never appears half-drawn. Fills its positioned parent.
 */
export default function SlideStage({
  active,
  memories,
  rounded = 'rounded-[28px]',
}: {
  active: MemoryItem;
  memories: MemoryItem[];
  rounded?: string;
}) {
  const shownRef = useRef<MemoryItem | null>(null);
  const [outgoing, setOutgoing] = useState<MemoryItem | null>(null);

  useEffect(() => {
    const previous = shownRef.current;
    shownRef.current = active;
    if (!previous || previous.id === active.id) return;
    setOutgoing(previous);
    const timer = setTimeout(() => setOutgoing(null), CROSSFADE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id]);

  useEffect(() => {
    if (memories.length < 2) return;
    const index = memories.findIndex((m) => m.id === active.id);
    const next = memories[(index + 1) % memories.length];
    if (next?.type === 'photo') new Image().src = next.url;
  }, [active.id, memories]);

  return (
    <>
      {outgoing && outgoing.id !== active.id && <SlideMedia memory={outgoing} entering={false} rounded={rounded} />}
      <SlideMedia key={active.id} memory={active} entering rounded={rounded} />
    </>
  );
}

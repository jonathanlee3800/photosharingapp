'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A row of chips that scrolls sideways on every device:
 * - Phones: swipe (native), with a soft fade at an edge when more chips are hidden there.
 * - Mouse: the wheel scrolls the row while the pointer is over it, click-and-drag works,
 *   and ‹ › buttons appear when there is more to see.
 * - The chip marked aria-pressed="true" is brought into view when `activeKey` changes.
 */
export default function ScrollRow({
  children,
  className = '',
  activeKey,
  fadeColor = '#FAF8F5',
  label,
}: {
  children: React.ReactNode;
  /** Classes for the inner flex row (gaps, padding) */
  className?: string;
  activeKey?: string;
  fadeColor?: string;
  label?: string;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    setCanLeft(row.scrollLeft > 2);
    setCanRight(row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    update();
    row.addEventListener('scroll', update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(row);
    Array.from(row.children).forEach((c) => resize.observe(c));
    return () => {
      row.removeEventListener('scroll', update);
      resize.disconnect();
    };
  }, [update, children]);

  // Mouse wheel scrolls the row sideways; at either end the page scrolls as normal
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onWheel = (e: WheelEvent) => {
      if (row.scrollWidth <= row.clientWidth) return;
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // trackpad sideways swipe: already native
      const atStart = row.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      row.scrollLeft += e.deltaY;
    };
    row.addEventListener('wheel', onWheel, { passive: false });
    return () => row.removeEventListener('wheel', onWheel);
  }, []);

  // Click-and-drag with a mouse (touch already swipes natively)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !rowRef.current) return;
    drag.current = { x: e.clientX, left: rowRef.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const row = rowRef.current;
    if (!d || !row) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 5) return;
    d.moved = true;
    row.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    // Keep `moved` until the click that follows, so a drag doesn't also select a chip
    setTimeout(() => (drag.current = null), 0);
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Bring the selected chip into view (sideways only, never moving the page)
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.offsetLeft;
    const right = left + chip.offsetWidth;
    if (left < row.scrollLeft + 16) row.scrollTo({ left: Math.max(0, left - 16), behavior: 'smooth' });
    else if (right > row.scrollLeft + row.clientWidth - 16) row.scrollTo({ left: right - row.clientWidth + 16, behavior: 'smooth' });
  }, [activeKey]);

  const page = (dir: -1 | 1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: dir * row.clientWidth * 0.7, behavior: 'smooth' });
  };

  const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 hidden md:flex w-8 h-8 rounded-full bg-white border border-[#1C2820]/10 shadow-sm items-center justify-center text-[#1C2820]/70 hover:text-[#1C2820] hover:shadow transition';

  return (
    <div className="relative" role="group" aria-label={label}>
      <div
        ref={rowRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        className={`flex overflow-x-auto no-scrollbar overscroll-x-contain select-none ${className}`}
      >
        {children}
      </div>

      {/* Fades hint that more chips are hidden on that side */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 md:w-12 transition-opacity duration-200 ${canLeft ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: `linear-gradient(to right, ${fadeColor}, ${fadeColor}00)` }}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 md:w-12 transition-opacity duration-200 ${canRight ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: `linear-gradient(to left, ${fadeColor}, ${fadeColor}00)` }}
      />

      {canLeft && (
        <button type="button" onClick={() => page(-1)} aria-label="Show earlier tags" className={`${arrow} left-0`}>
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => page(1)} aria-label="Show more tags" className={`${arrow} right-0`}>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

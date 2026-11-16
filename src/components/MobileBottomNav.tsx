'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Image as ImageIcon, Trophy, Camera } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

/**
 * Apple HIG-inspired Guest Bottom Navigation Bar (Mobile / Phone resolutions only)
 * - 100% Solid Opaque background (#FAF8F5): zero transparency, photos never bleed through.
 * - Option 1 "Floating Segmented Card" Active Highlight:
 *    Active tab physically elevates into a crisp white rounded card (bg-white, subtle drop shadow,
 *    and delicate border) against the cream bar.
 * - Center "Hero" Shutter Button: Elevated, high-contrast, tactile camera button for instant photo uploads.
 */
export default function MobileBottomNav() {
  const pathname = usePathname() || '';
  const { currentEvent, isHostLoggedIn, votingRound } = useEvent();

  const cleanPath = decodeURIComponent(pathname || '').toLowerCase().replace(/\/$/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);
  const isJoinPage =
    cleanPath === '/join' ||
    cleanPath === '/user/join' ||
    (pathParts.length === 2 && pathParts[0] === 'user' && !['gallery', 'slideshow', 'vote', 'upload', 'projector'].includes(pathParts[1]));

  // Guest-only, and not on: full-screen projector, the upload flow (has its own bottom button),
  // or the join / welcome screen
  if (
    isHostLoggedIn ||
    !pathname.startsWith('/user') ||
    pathname.endsWith('/projector') ||
    pathname.endsWith('/upload') ||
    isJoinPage
  ) {
    return null;
  }

  const base =
    pathParts[0] === 'user' && pathParts[1]
      ? `/user/${pathParts[1]}`
      : `/user/${currentEvent.id}`;

  const isGalleryActive = pathname.endsWith('/gallery');
  const isVoteActive = pathname.endsWith('/vote');

  const handleHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  return (
    <nav
      aria-label="Guest navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FAF8F5] border-t border-[#1C2820]/12 shadow-[0_-4px_24px_rgba(28,40,32,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-[68px] px-3 max-w-md mx-auto relative">
        {/* Left Tab: Gallery Feed */}
        <div className="flex-1 flex justify-center items-center h-full">
          <Link
            href={`${base}/gallery`}
            aria-current={isGalleryActive ? 'page' : undefined}
            onClick={handleHaptic}
            className={`w-full max-w-[120px] h-[52px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 press ${
              isGalleryActive
                ? 'bg-white shadow-[0_2px_12px_rgba(28,40,32,0.12)] border border-[#1C2820]/10 text-[#2D4A3A]'
                : 'text-[#1C2820]/45 hover:text-[#1C2820]/75 hover:bg-black/[0.02]'
            }`}
          >
            <span className="relative flex items-center justify-center">
              <ImageIcon
                className="w-[22px] h-[22px]"
                strokeWidth={isGalleryActive ? 2.5 : 1.8}
              />
            </span>
            <span
              className={`text-[11.5px] leading-none tracking-tight ${
                isGalleryActive ? 'font-bold text-[#1C2820]' : 'font-medium'
              }`}
            >
              Gallery
            </span>
          </Link>
        </div>

        {/* Center Hero CTA: Elevated Camera Shutter Button */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <Link
            href={`${base}/upload`}
            aria-label="Take or upload a photo"
            onClick={handleHaptic}
            className="group relative -top-3.5 flex flex-col items-center focus:outline-none"
          >
            <span className="relative w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#2D4A3A] via-[#233A2E] to-[#17271F] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(45,74,58,0.35)] ring-4 ring-[#FAF8F5] transition-transform duration-150 active:scale-90 group-hover:scale-105">
              <Camera className="w-[25px] h-[25px] text-white stroke-[2.2]" />
            </span>
            <span className="text-[11px] font-bold text-[#2D4A3A] leading-none mt-1 tracking-tight">
              Add Photo
            </span>
          </Link>
        </div>

        {/* Right Tab: Photo Contest & Voting */}
        <div className="flex-1 flex justify-center items-center h-full">
          <Link
            href={`${base}/vote`}
            aria-current={isVoteActive ? 'page' : undefined}
            onClick={handleHaptic}
            className={`w-full max-w-[120px] h-[52px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 press ${
              isVoteActive
                ? 'bg-white shadow-[0_2px_12px_rgba(28,40,32,0.12)] border border-[#1C2820]/10 text-[#2D4A3A]'
                : 'text-[#1C2820]/45 hover:text-[#1C2820]/75 hover:bg-black/[0.02]'
            }`}
          >
            <span className="relative flex items-center justify-center">
              <Trophy
                className="w-[22px] h-[22px]"
                strokeWidth={isVoteActive ? 2.5 : 1.8}
              />
              {votingRound.isActive && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#74A886] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4A7C59] ring-2 ring-[#FAF8F5]" />
                </span>
              )}
            </span>
            <span
              className={`text-[11.5px] leading-none tracking-tight flex items-center gap-1 ${
                isVoteActive ? 'font-bold text-[#1C2820]' : 'font-medium'
              }`}
            >
              <span>Contest</span>
              {votingRound.isActive && (
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[#74A886]/20 text-[#2D4A3A] font-extrabold tracking-wider">
                  Live
                </span>
              )}
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

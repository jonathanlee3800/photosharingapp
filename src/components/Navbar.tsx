'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Image as ImageIcon, Play, Heart, Plus, Download, LogOut } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { INITIAL_EVENTS } from '@/lib/initialData';

export default function Navbar() {
  const pathname = usePathname();
  const { currentEvent, hostEvents, memories, setIsZipModalOpen, isHostLoggedIn, logoutHost, hasJoined, guestName } =
    useEvent();
  // Anyone not signed in as a host only sees guest navigation; the host login link lives in the footer
  const isGuest = !isHostLoggedIn;
  // A host only ever sees their own event named here, never the built-in sample or one opened by PIN
  const hasRealEvent = isGuest
    ? currentEvent.id !== INITIAL_EVENTS[0].id
    : hostEvents.some((e) => e.id === currentEvent.id);

  // If on full projector screen, we don't show the standard site navbar
  // Full-screen pages with their own chrome: projector and the Kahoot-style PIN screen
  if (pathname === '/projector' || pathname === '/display' || pathname === '/join' || pathname?.endsWith('/projector') || pathname?.endsWith('/qr')) {
    return null;
  }

  const base = `/user/${currentEvent.id}`;

  // The join screen has a full-bleed cover photo, so it runs edge to edge with no bar
  if (isGuest && !hasJoined && decodeURIComponent(pathname || '').toLowerCase() === base.toLowerCase()) {
    return null;
  }

  // Event-specific guest items (event name, guest links, Share Moment, avatar) only belong on guest
  // pages. On host pages a visitor who is not signed in (e.g. /host/login) just sees the brand.
  const inGuestArea = Boolean(pathname?.startsWith("/user"));
  // Under the logo: hosts always see 'Host portal' (their event pages name the event), guests see their event
  const brandSubtitle = !isGuest ? 'Host portal' : inGuestArea && hasRealEvent ? currentEvent.title : '';

  // Guest links only (desktop); on phones the bottom tab bar handles navigation
  const navLinks = isGuest && inGuestArea
    ? [
        { label: 'Gallery', href: `${base}/gallery`, matchSuffix: '/gallery', icon: ImageIcon },
        { label: 'Live Slideshow', href: `${base}/slideshow`, matchSuffix: '/slideshow', icon: Play },
        { label: 'Live Voting', href: `${base}/vote`, matchSuffix: '/vote', icon: Heart },
      ]
    : [];

  const initials =
    (guestName || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  return (
    <nav className="sticky top-0 z-40 glass border-b border-[#1C2820]/[0.08] pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Left: Brand & Active Event Title */}
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href={!isGuest ? '/host/events' : !inGuestArea ? '/host/login' : hasJoined ? `${base}/gallery` : base}
              className="flex items-center gap-2.5 min-w-0 press"
            >
              <span className="w-8 h-8 rounded-[10px] bg-[#2D4A3A] text-white flex items-center justify-center font-serif text-lg font-bold shrink-0">
                m
              </span>
              <div className="flex flex-col min-w-0">
                {/* One style everywhere; only the size changes on larger screens */}
                <span className="font-serif text-[20px] md:text-2xl font-medium tracking-tight text-[#1C2820] leading-none truncate">
                  memorie aisle
                </span>
                {brandSubtitle && (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#2D4A3A] font-bold leading-tight mt-0.5 truncate max-w-xs">
                    {brandSubtitle}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname?.endsWith(link.matchSuffix);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active ? 'bg-[#2D4A3A] text-white shadow-sm' : 'text-[#1C2820]/75 hover:text-[#1C2820] hover:bg-black/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Upload Button (guests, desktop/tablet; phones use the tab bar camera) */}
            {isGuest && inGuestArea && (
              <Link
                href={`${base}/upload`}
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Share Moment</span>
              </Link>
            )}

            {/* Guest avatar: opens the page where they can change their name or leave */}
            {isGuest && hasJoined && inGuestArea && (
              <Link
                href={base}
                aria-label={`Signed in as ${guestName}. Change name`}
                className="w-9 h-9 rounded-full bg-[#E9EFEA] text-[#2D4A3A] text-[13px] font-bold flex items-center justify-center border border-[#2D4A3A]/15 press"
              >
                {initials}
              </Link>
            )}

            {/* Host actions (the logo links back to the events list) */}
            {isHostLoggedIn && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/host/events/new"
                  className="hidden xl:flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[#1C2820]/15 text-xs font-semibold text-[#2D4A3A] bg-[#E9EFEA] hover:bg-[#D8E5DA]"
                  title="Create a new event"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Event</span>
                </Link>

                <button
                  onClick={logoutHost}
                  className="p-2 rounded-xl text-[#1C2820]/60 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Host Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </div>
            )}

            {/* Export ZIP Trigger (Host Only) */}
            {isHostLoggedIn && hasRealEvent && (
              <button
                onClick={() => setIsZipModalOpen(true)}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1C2820]/75 hover:text-[#1C2820] hover:bg-black/5 transition-all"
                title="Download all memories as ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ZIP ({memories.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Image as ImageIcon,
  Play,
  Heart,
  Plus,
  Download,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function Navbar() {
  const pathname = usePathname();
  const {
    currentEvent,
    memories,
    setIsZipModalOpen,
    isHostLoggedIn,
    logoutHost,
    hasJoined,
    guestName,
    leaveAsGuest,
  } = useEvent();
  // Anyone not signed in as a host only sees guest navigation; the host login link lives in the footer
  const isGuest = !isHostLoggedIn;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // If on full projector screen, we don't show the standard site navbar
  if (
    pathname === '/projector' ||
    pathname === '/display' ||
    pathname?.endsWith('/projector')
  ) {
    return null;
  }

  // Guest links only; hosts manage everything from the host portal
  const navLinks = isGuest
    ? [
        { label: 'Gallery', href: `/user/${currentEvent.id}/gallery`, matchSuffix: '/gallery', icon: ImageIcon },
        { label: 'Live Slideshow', href: `/user/${currentEvent.id}/slideshow`, matchSuffix: '/slideshow', icon: Play },
        { label: 'Live Voting', href: `/user/${currentEvent.id}/vote`, matchSuffix: '/vote', icon: Heart },
      ]
    : [];


  return (
    <nav className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#1C2820]/10 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Active Event Title */}
          <div className="flex items-center gap-6">
            <Link
              href={
                !isGuest
                  ? '/host/events'
                  : hasJoined
                    ? `/user/${currentEvent.id}/gallery`
                    : `/user/${currentEvent.id}`
              }
              className="flex items-center gap-2.5 group"
            >
              <span className="w-8 h-8 rounded-lg bg-[#2D4A3A] text-white flex items-center justify-center font-serif text-lg font-bold shadow-sm group-hover:scale-105 transition-transform">
                m
              </span>
              <div className="flex flex-col">
                <span className="font-serif text-2xl tracking-tight text-[#1C2820] leading-none">
                  memory aisle
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#2D4A3A] font-bold mt-0.5 truncate max-w-[125px] sm:max-w-xs">
                  {currentEvent.title}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active =
                  pathname === link.href ||
                  pathname?.endsWith(link.matchSuffix);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[#2D4A3A] text-white shadow-sm'
                        : 'text-[#1C2820]/75 hover:text-[#1C2820] hover:bg-black/5'
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
          <div className="flex items-center gap-2.5">
            {/* Upload Button (guests only) */}
            {isGuest && (
              <Link
                href={`/user/${currentEvent.id}/upload`}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Share Moment</span>
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
                  className="p-1.5 sm:p-2 rounded-xl text-[#1C2820]/60 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Host Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Export ZIP Trigger (Host Only) */}
            {isHostLoggedIn && (
              <button
                onClick={() => setIsZipModalOpen(true)}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1C2820]/75 hover:text-[#1C2820] hover:bg-black/5 transition-all"
                title="Download all memories as ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ZIP ({memories.length})</span>
              </button>
            )}

            {/* Mobile Menu Toggle Button (guest links only) */}
            {isGuest && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-[#1C2820] hover:bg-black/5"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1C2820]/10 bg-[#FAF8F5] px-4 pt-3 pb-4 space-y-1 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname?.endsWith(link.matchSuffix);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                  active
                    ? 'bg-[#2D4A3A] text-white'
                    : 'text-[#1C2820]/80 hover:bg-black/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className={`flex flex-col gap-2 ${isGuest ? 'pt-2 border-t border-[#1C2820]/10' : ''}`}>
            {isGuest && (
              <Link
                href={`/user/${currentEvent.id}/upload`}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Share a Moment or Photo</span>
              </Link>
            )}
            {isGuest && hasJoined && (
              <button
                type="button"
                onClick={() => {
                  leaveAsGuest();
                  setMobileMenuOpen(false);
                }}
                className="pt-1 text-left text-[11px] font-semibold text-[#1C2820]/60 hover:text-[#1C2820] hover:underline"
              >
                Not {guestName}? Leave event
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

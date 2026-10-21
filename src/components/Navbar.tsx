'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Image as ImageIcon,
  Play,
  Heart,
  Plus,
  Shield,
  Tv,
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
  } = useEvent();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // If on full projector screen, we don't show the standard site navbar
  if (
    pathname === '/projector' ||
    pathname === '/display' ||
    pathname?.endsWith('/projector')
  ) {
    return null;
  }

  const navLinks = [
    { label: 'Gallery', href: `/user/${currentEvent.id}/gallery`, matchSuffix: '/gallery', icon: ImageIcon },
    { label: 'Live Slideshow', href: `/user/${currentEvent.id}/slideshow`, matchSuffix: '/slideshow', icon: Play },
    { label: 'Live Voting', href: `/user/${currentEvent.id}/vote`, matchSuffix: '/vote', icon: Heart },
  ];

  const isHostPage = pathname?.startsWith('/host');

  return (
    <nav className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#1C2820]/10 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Active Event Title */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="w-8 h-8 rounded-lg bg-[#2D4A3A] text-white flex items-center justify-center font-serif text-lg font-bold shadow-sm group-hover:scale-105 transition-transform">
                w
              </span>
              <div className="flex flex-col">
                <span className="font-serif text-2xl tracking-tight text-[#1C2820] leading-none">
                  withlove
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
            {/* Upload Button */}
            <Link
              href={`/user/${currentEvent.id}/upload`}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Share Moment</span>
            </Link>

            {/* Projector Screen Shortcut */}
            <Link
              href={`/user/${currentEvent.id}/projector`}
              target="_blank"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#1C2820]/15 text-[#1C2820] hover:bg-black/5 transition-all"
              title="Open full-screen 16:9 venue screen"
            >
              <Tv className="w-3.5 h-3.5 text-[#2D4A3A]" />
              <span>Projector</span>
            </Link>

            {/* Host Navigation / Auth Status */}
            {isHostLoggedIn ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/host/events"
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all ${
                    isHostPage
                      ? 'bg-[#2D4A3A] text-white border-[#2D4A3A]'
                      : 'border-[#1C2820]/15 text-[#1C2820] hover:bg-black/5'
                  }`}
                  title="Host Events"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Host Events</span>
                </Link>

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
            ) : (
              <Link
                href="/host/login"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border border-[#1C2820]/15 text-[#1C2820] hover:bg-black/5 transition-all"
                title="Host Login"
              >
                <Shield className="w-3.5 h-3.5 text-[#2D4A3A]" />
                <span className="hidden sm:inline">Host Login</span>
              </Link>
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

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#1C2820] hover:bg-black/5"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
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
          <div className="pt-2 border-t border-[#1C2820]/10 flex flex-col gap-2">
            <Link
              href={`/user/${currentEvent.id}/upload`}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Share a Moment or Photo</span>
            </Link>
            <div className="flex gap-2">
              <Link
                href={isHostLoggedIn ? "/host/events" : "/host/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center text-xs font-semibold rounded-xl border border-[#1C2820]/15"
              >
                {isHostLoggedIn ? "Host Events" : "Host Login"}
              </Link>
              <Link
                href={`/user/${currentEvent.id}/projector`}
                target="_blank"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center text-xs font-semibold rounded-xl border border-[#1C2820]/15"
              >
                Projector Screen
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

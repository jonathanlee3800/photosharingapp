'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Image as ImageIcon, Play, Trophy, Camera } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

// iOS-style guest tab bar (phones only)
export default function MobileBottomNav() {
  const pathname = usePathname() || '';
  const { currentEvent, isHostLoggedIn, hasJoined, votingRound } = useEvent();

  const base = `/user/${currentEvent.id}`;
  const onJoinPage = pathname === base;

  // Guest-only, and not on: full-screen projector, the upload flow (has its own bottom button),
  // or the join screen before the guest has entered their name
  if (
    isHostLoggedIn ||
    !pathname.startsWith('/user') ||
    pathname.endsWith('/projector') ||
    pathname.endsWith('/upload') ||
    (onJoinPage && !hasJoined)
  ) {
    return null;
  }

  const tabs = [
    { label: 'Home', href: base, icon: Home, active: onJoinPage },
    { label: 'Gallery', href: `${base}/gallery`, icon: ImageIcon, active: pathname.endsWith('/gallery') },
    { label: 'Slideshow', href: `${base}/slideshow`, icon: Play, active: pathname.endsWith('/slideshow') },
    {
      label: 'Contest',
      href: `${base}/vote`,
      icon: Trophy,
      active: pathname.endsWith('/vote'),
      live: votingRound.isActive,
    },
  ];

  const renderTab = (tab: (typeof tabs)[number]) => {
    const Icon = tab.icon;
    return (
      <Link
        key={tab.label}
        href={tab.href}
        aria-current={tab.active ? 'page' : undefined}
        className={`relative flex-1 flex flex-col items-center justify-center gap-1 h-full press ${
          tab.active ? 'text-[#2D4A3A]' : 'text-[#1C2820]/45'
        }`}
      >
        <span className="relative">
          <Icon className="w-[22px] h-[22px]" strokeWidth={tab.active ? 2.4 : 1.8} />
          {tab.live && (
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#74A886] ring-2 ring-[#FAF8F5]" />
          )}
        </span>
        <span className={`text-[10.5px] leading-none ${tab.active ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Guest navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-[#1C2820]/[0.08]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-[var(--tabbar-h)] px-2">
        {tabs.slice(0, 2).map(renderTab)}

        {/* Primary action: share a photo */}
        <div className="flex-1 flex items-center justify-center">
          <Link
            href={`${base}/upload`}
            aria-label="Share a photo"
            className="w-14 h-14 -mt-6 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(45,74,58,0.35)] ring-4 ring-[#FAF8F5] press"
          >
            <Camera className="w-6 h-6" />
          </Link>
        </div>

        {tabs.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}

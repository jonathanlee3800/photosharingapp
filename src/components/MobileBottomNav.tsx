'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Image as ImageIcon,
  Play,
  Trophy,
  Camera,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { currentEvent } = useEvent();

  // Hide on full projector screen or display screen
  if (
    pathname === '/projector' ||
    pathname === '/display' ||
    pathname?.endsWith('/projector')
  ) {
    return null;
  }

  const navItems = [
    { label: 'Home', href: `/user/${currentEvent.id}`, matchSuffix: `/user/${currentEvent.id}`, icon: Home },
    { label: 'Gallery', href: `/user/${currentEvent.id}/gallery`, matchSuffix: '/gallery', icon: ImageIcon },
    { label: 'Slideshow', href: `/user/${currentEvent.id}/slideshow`, matchSuffix: '/slideshow', icon: Play },
    { label: 'Contest', href: `/user/${currentEvent.id}/vote`, matchSuffix: '/vote', icon: Trophy },
  ];

  const isUploadActive = pathname?.endsWith('/upload');

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-lg border-t border-[#1C2820]/10 px-3 py-1.5 flex items-center justify-around pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {/* Home & Gallery */}
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.label === 'Home' ? pathname === '/' : pathname?.endsWith(item.matchSuffix));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-semibold transition-all ${
              active
                ? 'text-[#2D4A3A] font-bold scale-105'
                : 'text-[#1C2820]/60 hover:text-[#1C2820]'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="mt-0.5">{item.label}</span>
          </Link>
        );
      })}

      {/* Center Floating Action Button: Snap / Upload */}
      <Link
        href={`/user/${currentEvent.id}/upload`}
        className={`-mt-4 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform ${
          isUploadActive
            ? 'bg-[#182B24] ring-4 ring-[#2D4A3A]/30'
            : 'bg-gradient-to-tr from-[#2D4A3A] to-[#1F3628] hover:scale-105 shadow-md'
        }`}
        title="Snap / Share Moment"
      >
        <Camera className="w-5 h-5" />
      </Link>

      {/* Slideshow & Contest */}
      {navItems.slice(2, 4).map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          pathname?.endsWith(item.matchSuffix);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-semibold transition-all ${
              active
                ? 'text-[#2D4A3A] font-bold scale-105'
                : 'text-[#1C2820]/60 hover:text-[#1C2820]'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEvent } from '@/context/EventContext';

// Small footer for guests: the only entry point to the host login
export default function GuestFooter() {
  const pathname = usePathname();
  const { isHostLoggedIn } = useEvent();

  const cleanPath = decodeURIComponent(pathname || '').toLowerCase().replace(/\/$/, '');
  const pathParts = cleanPath.split('/').filter(Boolean);
  const isJoinPage =
    cleanPath === '/join' ||
    cleanPath === '/user/join' ||
    (pathParts.length === 2 && pathParts[0] === 'user' && !['gallery', 'slideshow', 'vote', 'upload', 'projector'].includes(pathParts[1]));

  // Hosts already have host navigation; the host portal, projector, and join screens have their own chrome
  if (
    pathname === '/' ||
    isHostLoggedIn ||
    pathname?.startsWith('/host') ||
    pathname === '/projector' ||
    pathname === '/display' ||
    pathname === '/join' ||
    pathname?.endsWith('/projector') || pathname?.endsWith('/qr') ||
    pathname?.endsWith('/slideshow') ||
    pathname?.endsWith('/upload') ||
    isJoinPage
  ) {
    return null;
  }

  return (
    // On phones, leave room for the fixed bottom tab bar and home indicator
    <footer className="border-t border-[#1C2820]/[0.08] pt-5 px-4 text-center text-[12px] text-[#1C2820]/45 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.25rem)] md:pb-5">
      <span>Memorie Aisle · </span>
      <Link href="/host/login" className="font-semibold hover:text-[#1C2820] hover:underline">
        Sign in as host
      </Link>
    </footer>
  );
}

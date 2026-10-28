'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEvent } from '@/context/EventContext';

// Small footer for guests: the only entry point to the host login
export default function GuestFooter() {
  const pathname = usePathname();
  const { isHostLoggedIn } = useEvent();

  // Hosts already have host navigation; the host portal and projector screens have their own chrome
  if (
    isHostLoggedIn ||
    pathname?.startsWith('/host') ||
    pathname === '/projector' ||
    pathname === '/display' ||
    pathname?.endsWith('/projector')
  ) {
    return null;
  }

  return (
    <footer className="border-t border-[#1C2820]/10 py-5 px-4 text-center text-[11px] text-[#1C2820]/50">
      <span>Memory Aisle · </span>
      <Link href="/host/login" className="font-semibold hover:text-[#1C2820] hover:underline">
        Sign in as host
      </Link>
    </footer>
  );
}

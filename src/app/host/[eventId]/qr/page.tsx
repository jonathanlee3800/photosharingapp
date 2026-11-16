'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Maximize2 } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import HostAuthGuard from '@/components/HostAuthGuard';
import { generateQrDataUrl } from '@/lib/qrHelper';
import { formatPin } from '@/lib/pin';

/**
 * A screen to show guests how to join: a large QR code, plus the address and PIN for typing.
 * Opened from the QR code on the host overview, ready to put on a screen or second monitor.
 */
export default function JoinQrPage() {
  const { currentEvent } = useEvent();
  const [qr, setQr] = useState('');

  useEffect(() => {
    generateQrDataUrl(`${window.location.origin}/user/${currentEvent.id}`, {
      width: 1400,
      margin: 1,
      color: { dark: '#1C2820', light: '#FFFFFF' },
    }).then(setQr);
  }, [currentEvent.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <HostAuthGuard>
      <div className="fixed inset-0 z-50 bg-[#FAF8F5] text-[#1C2820] flex flex-col items-center justify-center overflow-hidden px-6 py-8">
        {/* Discreet controls for the host */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-40 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Full screen"
            className="w-10 h-10 rounded-full bg-white border border-[#1C2820]/10 flex items-center justify-center text-[#2D4A3A]"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <Link
            href={`/host/${currentEvent.id}`}
            aria-label="Back to overview"
            className="w-10 h-10 rounded-full bg-white border border-[#1C2820]/10 flex items-center justify-center text-[#2D4A3A]"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>

        {/* Wide screens: QR code beside the instructions. Phones: instructions underneath. */}
        <div className="flex flex-col landscape:flex-row items-center justify-center gap-[4vmin] max-w-full">
          <div
            className="bg-white rounded-[4vmin] p-[2.5vmin] shadow-[0_24px_70px_rgba(45,74,58,0.14)] border border-[#1C2820]/[0.06] shrink-0"
            style={{ width: '70vmin', height: '70vmin' }}
          >
            {qr && <img src={qr} alt={`QR code to join ${currentEvent.title}`} className="w-full h-full object-contain" />}
          </div>

          <div className="text-center landscape:text-left max-w-[34rem]">
            <p className="font-serif text-[clamp(28px,4.5vmin,56px)] font-medium tracking-tight leading-[1.05]">
              {currentEvent.title}
            </p>
            <p className="mt-[2vmin] text-[clamp(18px,2.6vmin,30px)] font-semibold text-[#2D4A3A]">Scan to join</p>
            <div className="mt-[3vmin] h-px w-16 bg-[#1C2820]/15 mx-auto landscape:mx-0" />
            <p className="mt-[3vmin] text-[clamp(15px,2vmin,22px)] text-[#1C2820]/60">or go to</p>
            <p className="text-[clamp(18px,2.6vmin,30px)] font-semibold">www.memorieaisle.com/join</p>
            <p className="mt-[2vmin] text-[clamp(15px,2vmin,22px)] text-[#1C2820]/60">and enter PIN</p>
            <p className="text-[clamp(40px,7vmin,92px)] font-semibold tracking-tight tabular-nums leading-none text-[#2D4A3A]">
              {formatPin(currentEvent.code)}
            </p>
          </div>
        </div>
      </div>
    </HostAuthGuard>
  );
}

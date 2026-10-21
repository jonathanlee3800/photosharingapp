'use client';

import React from 'react';
import { useEvent } from '@/context/EventContext';

export default function ToastNotification() {
  const { toast } = useEvent();

  if (!toast) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 bg-[#182B24]/95 backdrop-blur-xl text-[#FAF8F5] border border-[#4E6E58]/50 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 max-w-md animate-in fade-in slide-in-from-bottom-5">
      <div className="w-2.5 h-2.5 rounded-full bg-[#74A886] animate-ping shrink-0 shadow-[0_0_8px_#74A886]" />
      <div>
        <div className="text-xs font-semibold text-white tracking-wide">{toast.title}</div>
        <div className="text-[11px] text-white/70 mt-0.5">{toast.subtitle}</div>
      </div>
    </div>
  );
}


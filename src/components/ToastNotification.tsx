'use client';

import React from 'react';
import { useEvent } from '@/context/EventContext';

export default function ToastNotification() {
  const { toast } = useEvent();

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      // Phones: float above the tab bar and home indicator; desktop: bottom-right
      className="fixed left-3 right-3 md:left-auto md:right-6 md:!bottom-6 z-[60] flex justify-center md:block pointer-events-none"
      style={{ bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px)' }}
    >
      <div
        key={toast.id}
        className="animate-fade-up pointer-events-auto w-full max-w-md bg-[#182B24]/95 backdrop-blur-xl text-[#FAF8F5] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.25)] rounded-[20px] px-4 py-3.5 flex items-center gap-3"
      >
        <div className="w-2 h-2 rounded-full bg-[#74A886] shrink-0 shadow-[0_0_10px_#74A886]" />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-white leading-snug">{toast.title}</div>
          {toast.subtitle && <div className="text-[12.5px] text-white/70 mt-0.5 leading-snug">{toast.subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

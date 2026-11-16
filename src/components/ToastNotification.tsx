'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AlertCircle, Check, Info } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

const STYLES = {
  success: { icon: Check, badge: 'bg-[#2D4A3A] text-white' },
  error: { icon: AlertCircle, badge: 'bg-[#B4533A]/[0.12] text-[#B4533A]' },
  info: { icon: Info, badge: 'bg-[#2D4A3A]/10 text-[#2D4A3A]' },
} as const;

/**
 * One short message at a time, in the app's own ivory style.
 * - Success: green tick. Error: warm red alert, stays 6 s. Info: neutral.
 * - Tap to dismiss.
 * - On the projector the room is watching, so only errors show, small, at the top.
 */
export default function ToastNotification() {
  const { toast, dismissToast } = useEvent();
  const pathname = usePathname() || '';
  const onProjector = pathname.endsWith('/projector');

  if (!toast) return null;
  if (onProjector && toast.kind !== 'error') return null;

  const { icon: Icon, badge } = STYLES[toast.kind];
  const isError = toast.kind === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`fixed left-3 right-3 z-[160] flex justify-center pointer-events-none ${
        onProjector ? 'top-4' : 'md:left-auto md:right-6 md:!bottom-6 md:block'
      }`}
      // Phones: float above the tab bar and home indicator
      style={onProjector ? undefined : { bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px)' }}
    >
      <button
        type="button"
        key={toast.id}
        onClick={dismissToast}
        aria-label={`${toast.title}. Tap to dismiss`}
        className="animate-fade-up pointer-events-auto w-full max-w-sm text-left bg-[#FFFDF9]/95 backdrop-blur-xl border border-[#1C2820]/[0.08] shadow-[0_12px_32px_rgba(28,40,32,0.14)] rounded-[18px] pl-3 pr-4 py-3 flex items-start gap-3"
      >
        <span className={`mt-px w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${badge}`}>
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </span>
        <span className="min-w-0 pt-[3px]">
          <span className="block text-[14px] font-semibold text-[#1C2820] leading-snug">{toast.title}</span>
          {toast.subtitle && <span className="block text-[13px] text-[#1C2820]/60 mt-0.5 leading-snug">{toast.subtitle}</span>}
        </span>
      </button>
    </div>
  );
}

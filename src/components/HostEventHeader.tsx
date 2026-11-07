'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Download } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { formatPin } from '@/lib/pin';

/**
 * Shared top bar for a host's event pages (Overview, Photos & Videos):
 * back to All Events, tabs, event switcher, Projector and Export ZIP.
 */
export default function HostEventHeader({ active }: { active: 'overview' | 'photos' }) {
  const router = useRouter();
  const { hostEvents: events, currentEvent, memories, setCurrentEventId, setIsZipModalOpen } = useEvent();

  const tabClass = (isActive: boolean) =>
    isActive
      ? 'px-4 py-2 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold shadow-sm'
      : 'px-4 py-2 rounded-xl text-[#1C2820]/70 hover:text-[#1C2820] hover:bg-black/5 text-xs font-semibold transition-colors';

  return (
    <div className="space-y-4">
      {/* Back to All Events */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/host/events"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#1C2820]/15 text-xs font-bold text-[#2D4A3A] hover:bg-[#E9EFEA] transition-all shadow-sm group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>All Events ({events.length})</span>
        </Link>
        <span className="text-xs text-[#1C2820]/50 font-medium truncate min-w-0">
          Managing: <span className="font-bold text-[#1C2820]">{currentEvent.title}</span>
        </span>
      </div>

      {/* Tabs + actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1C2820]/10 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/host/${currentEvent.code}`} className={tabClass(active === 'overview')}>
            Overview
          </Link>
          <Link href={`/host/${currentEvent.code}/photos`} className={tabClass(active === 'photos')}>
            Photos & Videos ({memories.length})
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Event switcher (stays on the same tab) */}
          {events.length > 1 && (
            <select
              value={currentEvent.id}
              onChange={(e) => {
                const next = events.find((ev) => ev.id === e.target.value);
                if (!next) return;
                setCurrentEventId(next.id, true);
                router.push(`/host/${next.code}${active === 'photos' ? '/photos' : ''}`);
              }}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-[#1C2820]/20 bg-white text-xs font-bold text-[#1C2820] focus:outline-none"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} (PIN {formatPin(ev.code)})
                </option>
              ))}
            </select>
          )}

          <Link
            href={`/user/${currentEvent.code}/projector`}
            target="_blank"
            className="px-4 py-2 rounded-xl border border-[#1C2820]/20 text-xs font-bold text-[#1C2820] hover:bg-[#E9EFEA] flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#2D4A3A]" />
            <span>Projector</span>
          </Link>
          <button
            onClick={() => setIsZipModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ZIP</span>
          </button>
        </div>
      </div>
    </div>
  );
}

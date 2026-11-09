'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Download,
  ChevronDown,
  Check,
  Plus,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { formatPin } from '@/lib/pin';

/**
 * Shared top bar for a host's event pages (Overview, Photos & Videos):
 * back to All Events, tabs, event switcher, Projector and Export ZIP.
 */
export default function HostEventHeader({ active }: { active: 'overview' | 'photos' }) {
  const router = useRouter();
  const { hostEvents: events, currentEvent, memories, setCurrentEventId, setIsZipModalOpen } = useEvent();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setIsSwitcherOpen(false);
      }
    }
    if (isSwitcherOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSwitcherOpen]);

  const handleSelectEvent = (ev: (typeof events)[number]) => {
    setIsSwitcherOpen(false);
    setCurrentEventId(ev.id, true);
    router.push(`/host/${ev.code}${active === 'photos' ? '/photos' : ''}`);
  };

  const tabClass = (isActive: boolean) =>
    isActive
      ? 'h-[38px] px-4 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold shadow-sm flex items-center justify-center'
      : 'h-[38px] px-4 rounded-xl text-[#1C2820]/70 hover:text-[#1C2820] hover:bg-black/5 text-xs font-semibold transition-colors flex items-center justify-center';

  return (
    <div className="space-y-4">
      {/* Back to All Events */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/host/events"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#1C2820]/15 text-xs font-bold text-[#2D4A3A] hover:bg-[#E9EFEA] transition-all shadow-sm group shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>All Events ({events.length})</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-[#1C2820]/55 font-medium truncate min-w-0 max-w-[160px] sm:max-w-none">
          <span className="shrink-0">Current event:</span>
          <span className="font-bold text-[#1C2820] truncate">{currentEvent.title}</span>
        </div>
      </div>

      {/* Tabs + actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1C2820]/10 pb-5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link href={`/host/${currentEvent.code}`} className={tabClass(active === 'overview')}>
            Overview
          </Link>
          <Link href={`/host/${currentEvent.code}/photos`} className={tabClass(active === 'photos')}>
            <span className="hidden sm:inline">Photos & Videos</span>
            <span className="sm:hidden">Photos</span>
            <span> ({memories.length})</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Custom Event Switcher Dropdown */}
          {events.length > 0 && (
            <div ref={switcherRef} className="relative w-full sm:w-[280px] md:w-[310px]">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isSwitcherOpen}
                onClick={() => setIsSwitcherOpen((prev) => !prev)}
                className={`min-h-[38px] sm:h-[38px] w-full px-3 py-1.5 sm:py-0 rounded-xl border bg-white text-left flex items-center justify-between gap-2 shadow-sm transition-all focus:outline-none ${
                  isSwitcherOpen
                    ? 'border-[#2D4A3A] ring-2 ring-[#2D4A3A]/10'
                    : 'border-[#1C2820]/15 hover:border-[#2D4A3A]/40'
                }`}
                title="Switch active celebration"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#2D4A3A] shrink-0" />
                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5">
                    <span className="text-xs font-bold text-[#1C2820] break-words sm:truncate leading-tight">
                      {currentEvent.title}
                    </span>
                    <span className="inline-flex self-start sm:self-auto px-1.5 py-0.5 rounded-md bg-[#2D4A3A]/10 text-[#2D4A3A] text-[10px] font-bold tabular-nums tracking-wider shrink-0 whitespace-nowrap">
                      PIN {formatPin(currentEvent.code)}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#1C2820]/50 transition-transform duration-200 shrink-0 self-center ${
                    isSwitcherOpen ? 'rotate-180 text-[#2D4A3A]' : ''
                  }`}
                />
              </button>

              {isSwitcherOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 top-full mt-1 w-full max-h-80 overflow-y-auto bg-white rounded-2xl border border-[#1C2820]/15 shadow-xl z-50 p-1.5 space-y-1 overscroll-contain animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1C2820]/50 flex items-center justify-between">
                    <span>Switch Celebration</span>
                    <span>{events.length} total</span>
                  </div>

                  <div className="space-y-1">
                    {events.map((ev) => {
                      const isSelected = ev.id === currentEvent.id;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectEvent(ev)}
                          className={`w-full min-w-0 px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-colors ${
                            isSelected
                              ? 'bg-[#2D4A3A]/8 border border-[#2D4A3A]/20'
                              : 'hover:bg-[#1C2820]/5 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-bold text-[#1C2820] leading-snug break-words">
                              {ev.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[10px] font-bold tabular-nums tracking-wider px-1.5 py-0.5 rounded-md shrink-0 ${
                                  isSelected
                                    ? 'bg-white text-[#2D4A3A] border border-[#2D4A3A]/30 shadow-2xs'
                                    : 'bg-[#1C2820]/5 text-[#1C2820]/70 border border-[#1C2820]/10'
                                }`}
                              >
                                PIN {formatPin(ev.code)}
                              </span>
                              {ev.date && (
                                <span className="text-[10px] text-[#1C2820]/50 font-medium truncate">
                                  {ev.date}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#2D4A3A] shrink-0 self-center" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#1C2820]/10 pt-1 mt-1 space-y-0.5">
                    <Link
                      href="/host/events/new"
                      onClick={() => setIsSwitcherOpen(false)}
                      className="w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2 text-xs font-bold text-[#2D4A3A] hover:bg-[#2D4A3A]/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Celebration</span>
                    </Link>
                    <Link
                      href="/host/events"
                      onClick={() => setIsSwitcherOpen(false)}
                      className="w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2 text-xs font-bold text-[#2D4A3A] hover:bg-[#2D4A3A]/10 transition-colors"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>View All Celebrations</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Symmetrical 2-column action bar on mobile; inline on desktop */}
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center sm:gap-2">
            <Link
              href={`/host/${currentEvent.code}/projector`}
              target="_blank"
              className="h-[38px] px-3.5 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] flex items-center justify-center gap-1.5 transition-colors shadow-2xs w-full sm:w-auto"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#2D4A3A]" />
              <span>Projector</span>
            </Link>
            <button
              onClick={() => setIsZipModalOpen(true)}
              className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95 w-full sm:w-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export ZIP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

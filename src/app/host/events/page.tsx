'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  QrCode,
  Calendar,
  MapPin,
  Check,
  ArrowRight,
  Trash2,
  Tag,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import HostAuthGuard from '@/components/HostAuthGuard';

export default function HostEventsPage() {
  const router = useRouter();
  const { hostEvents: events, currentEvent, setCurrentEventId, deleteEvent, memories, hostUser } = useEvent();

  const handleOpenEvent = (id: string) => {
    setCurrentEventId(id, true);
    router.push(`/host/${id}`);
  };

  return (
    <HostAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2820]/10 pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full">
              Host Portal · Celebrations
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-medium text-[#1C2820] mt-1.5">
              Select an Event
            </h1>
            <p className="text-xs sm:text-sm text-[#1C2820]/65 mt-1 font-medium">
              Choose an event below to access its live table QR codes, mini-categories, and moderation vault.
            </p>
          </div>

          <Link
            href="/host/events/new"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Add New Event CTA Card */}
          <Link
            href="/host/events/new"
            className="rounded-3xl border-2 border-dashed border-[#2D4A3A]/30 hover:border-[#2D4A3A] bg-[#E9EFEA]/30 hover:bg-[#E9EFEA]/60 p-8 flex flex-col items-center justify-center text-center gap-3 transition-all min-h-[340px] group shadow-sm hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#2D4A3A] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Plus className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-[#1C2820]">
                Create New Celebration
              </h3>
              <p className="text-xs text-[#1C2820]/65 font-medium mt-1 max-w-xs leading-relaxed">
                Set up a new wedding or reception, generate fresh table QR codes, and customize guest categories.
              </p>
            </div>
            <span className="mt-2 text-xs font-bold text-[#2D4A3A] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Start Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* Event Cards */}
          {events.map((ev) => {
            const isCurrent = ev.id === currentEvent.id;
            const eventMemoriesCount = memories.filter(
              (m) => m.eventId === ev.id || (!m.eventId && ev.id === 'event-1')
            ).length;

            return (
              <div
                key={ev.id}
                onClick={() => handleOpenEvent(ev.id)}
                className={`bg-white rounded-3xl overflow-hidden border transition-all flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer group ${
                  isCurrent
                    ? 'border-[#2D4A3A] ring-2 ring-[#2D4A3A]/20'
                    : 'border-[#1C2820]/10 hover:border-[#2D4A3A]/50'
                }`}
              >
                <div>
                  {/* Cover Header */}
                  <div className="relative h-48 overflow-hidden bg-black/10">
                    <img
                      src={ev.coverUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-xs font-mono font-bold flex items-center gap-1.5 border border-white/10">
                        <QrCode className="w-3.5 h-3.5 text-[#9BC4A8]" />
                        <span>ID: {ev.id}</span>
                      </span>
                    </div>

                    {isCurrent && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#2D4A3A] text-white text-xs font-bold shadow-md flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Current</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <h3 className="font-serif text-2xl font-bold leading-tight group-hover:text-[#FAF8F5] transition-colors">
                        {ev.title}
                      </h3>
                      <div className="text-xs text-white/80 flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#9BC4A8]" />
                          {ev.date}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                          <MapPin className="w-3 h-3 text-[#9BC4A8]" />
                          {ev.venue}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    {/* Mini-Categories badge pills */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-[#1C2820]/60 uppercase tracking-wide flex items-center justify-between">
                        <span>Mini-Categories ({ev.prompts?.length || 0})</span>
                        <Tag className="w-3 h-3 text-[#2D4A3A]" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(ev.prompts || []).slice(0, 3).map((p) => (
                          <span
                            key={p.id}
                            className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#1C2820]/10 text-xs font-semibold text-[#1C2820] flex items-center gap-1"
                          >
                            <span>{p.icon}</span>
                            <span className="truncate max-w-[120px]">{p.label}</span>
                          </span>
                        ))}
                        {(ev.prompts?.length || 0) > 3 && (
                          <span className="px-2 py-1 rounded-lg bg-[#FAF8F5] text-xs font-semibold text-[#1C2820]/60">
                            +{(ev.prompts?.length || 0) - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-[#1C2820]/75 flex items-center justify-between pt-2 border-t border-[#1C2820]/10">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#2D4A3A]" />
                        <span>Shared Photos:</span>
                      </span>
                      <span className="font-bold text-[#2D4A3A] bg-[#E9EFEA] px-2.5 py-0.5 rounded-full">
                        {eventMemoriesCount} memories
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="p-5 pt-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEvent(ev.id);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>Manage Event & QR Code</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {events.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete celebration "${ev.title}"?`)) {
                          deleteEvent(ev.id);
                        }
                      }}
                      className="p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </HostAuthGuard>
  );
}

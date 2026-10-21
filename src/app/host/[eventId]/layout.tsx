'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Plus } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import HostAuthGuard from '@/components/HostAuthGuard';

export default function HostEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const rawEventId = typeof params?.eventId === 'string' ? decodeURIComponent(params.eventId) : '';
  const { getEventById, currentEvent, setCurrentEventId } = useEvent();

  const matchedEvent = rawEventId ? getEventById(rawEventId) : undefined;

  useEffect(() => {
    if (matchedEvent && currentEvent.id !== matchedEvent.id) {
      setCurrentEventId(matchedEvent.id, true);
    }
  }, [matchedEvent, currentEvent.id, setCurrentEventId]);

  if (!matchedEvent) {
    return (
      <HostAuthGuard>
        <div className="max-w-lg mx-auto px-4 py-20">
          <div className="bg-white rounded-3xl p-8 border border-[#1C2820]/10 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-serif text-3xl font-bold text-[#1C2820]">
                Event Not Found
              </h1>
              <p className="text-xs text-[#1C2820]/65 leading-relaxed">
                No celebration matches the event ID{' '}
                <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  {rawEventId}
                </span>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/host/events"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#1F3628] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Events</span>
              </Link>
              <Link
                href="/host/events/new"
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#1C2820]/15 text-[#1C2820] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#FAF8F5] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Event</span>
              </Link>
            </div>
          </div>
        </div>
      </HostAuthGuard>
    );
  }

  return <>{children}</>;
}


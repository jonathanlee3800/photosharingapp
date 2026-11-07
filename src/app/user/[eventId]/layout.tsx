'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function UserEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const rawEventId =
    typeof params?.eventId === 'string' ? decodeURIComponent(params.eventId) : '';
  const { getEventById, currentEvent, setCurrentEventId, eventsLoaded } = useEvent();

  const matchedEvent = rawEventId ? getEventById(rawEventId) : undefined;

  useEffect(() => {
    if (matchedEvent && currentEvent.id !== matchedEvent.id) {
      setCurrentEventId(matchedEvent.id, true);
    }
  }, [matchedEvent, currentEvent.id, setCurrentEventId]);

  // A fresh phone (e.g. scanning the QR code) has no cached events yet, so wait for the database
  if (!matchedEvent && !eventsLoaded) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2D4A3A]" />
      </div>
    );
  }

  if (!matchedEvent) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12 px-4 sm:px-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#1C2820]/10 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-serif text-3xl font-bold text-[#1C2820]">
              Event Not Found
            </h1>
            <p className="text-xs text-[#1C2820]/65 leading-relaxed">
              We couldn’t find an active celebration with the code{' '}
              <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                {rawEventId}
              </span>
              . Please check your table QR code or ask the hosts for the right link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function UserEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const rawEventId =
    typeof params?.eventId === 'string' ? decodeURIComponent(params.eventId) : '';
  const { getEventById, currentEvent, setCurrentEventId } = useEvent();

  const matchedEvent = rawEventId ? getEventById(rawEventId) : undefined;

  useEffect(() => {
    if (matchedEvent && currentEvent.id !== matchedEvent.id) {
      setCurrentEventId(matchedEvent.id, true);
    }
  }, [matchedEvent, currentEvent.id, setCurrentEventId]);

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
          <Link
            href="/"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


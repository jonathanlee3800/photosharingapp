'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { PIN_LENGTH, cleanPinInput, formatPin } from '@/lib/pin';

export default function EnterPinPage() {
  return (
    <Suspense fallback={null}>
      <EnterPin />
    </Suspense>
  );
}

// Kahoot-style "Enter PIN" screen: guests type the event's 6-digit PIN to join
function EnterPin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lookupEvent } = useEvent();
  const [pin, setPin] = useState(() => cleanPinInput(searchParams.get('pin') || ''));
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const complete = pin.length === PIN_LENGTH;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete) {
      setError(`The PIN has ${PIN_LENGTH} digits.`);
      return;
    }
    setError('');
    setChecking(true);
    const event = await lookupEvent(pin);
    if (event) {
      router.push(`/user/${event.id}`);
      return;
    }
    setChecking(false);
    setError(`We couldn’t find an event with that code. Double-check the 6 digits and try again.`);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1 min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#182B24] via-[#22392D] to-[#2D4A3A] text-white overflow-hidden">
      {/* Soft glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-[#74A886]/20 blur-3xl pointer-events-none" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top))' }}>
        <Link
          href="/"
          className="flex items-center gap-2.5 mb-10 animate-fade-up hover:opacity-90 transition-opacity"
        >
          <span className="w-10 h-10 rounded-[12px] bg-white text-[#2D4A3A] flex items-center justify-center font-serif text-2xl font-bold">M</span>
          <span className="font-serif text-[30px] tracking-tight">Memory Aisle</span>
        </Link>

        <form
          onSubmit={submit}
          className="w-full max-w-sm bg-white rounded-[28px] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] space-y-3 animate-fade-up"
          style={{ animationDelay: '60ms' }}
        >
          <label htmlFor="event-pin" className="sr-only">
            Event PIN
          </label>
          <input
            ref={inputRef}
            id="event-pin"
            type="text"
            inputMode="numeric"
            pattern="[0-9 ]*"
            autoComplete="off"
            autoFocus
            enterKeyHint="go"
            placeholder="6-digit code"
            value={formatPin(pin)}
            onChange={(e) => {
              setPin(cleanPinInput(e.target.value));
              if (error) setError('');
            }}
            aria-invalid={Boolean(error)}
            className={`w-full h-16 rounded-2xl border-2 text-center text-[30px] font-bold tracking-[0.12em] text-[#1C2820] placeholder:text-[22px] placeholder:font-semibold placeholder:tracking-normal placeholder:text-[#1C2820]/30 focus:outline-none transition-colors ${
              error ? 'border-red-400 bg-red-50/40' : 'border-[#1C2820]/12 focus:border-[#2D4A3A]'
            }`}
          />
          <button
            type="submit"
            disabled={checking}
            className={`w-full h-14 rounded-2xl text-[17px] font-bold flex items-center justify-center gap-2 transition-colors press ${
              complete ? 'bg-[#2D4A3A] text-white' : 'bg-[#1C2820]/10 text-[#1C2820]/45'
            }`}
          >
            {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Enter <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          {error && (
            <p role="alert" className="text-[14px] text-red-600 font-medium text-center leading-snug px-1">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-[14px] text-white/65 text-center max-w-xs animate-fade-up" style={{ animationDelay: '120ms' }}>
          Find your 6-digit code on the screen, or ask your hosts for the 6-digit code.
        </p>
      </div>

      <div className="relative pb-6 text-center text-[13px] text-white/50" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        Hosting a celebration?{' '}
        <Link href="/host/login" className="font-semibold text-white/80 hover:text-white">
          Sign in
        </Link>
      </div>
    </div>
  );
}

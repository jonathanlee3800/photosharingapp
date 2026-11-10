'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Images, Heart } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function JoinPage() {
  const router = useRouter();
  const { currentEvent, guestName, setGuestName, triggerToast, joinCelebration, hostUser, hasJoined, leaveAsGuest } = useEvent();
  const [nameInput, setNameInput] = useState(guestName || '');
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (guestName) setNameInput(guestName);
  }, [guestName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setNameError('Add your name so the couple knows who’s sharing.');
      return;
    }
    setNameError('');
    setSubmitting(true);
    await joinCelebration(nameInput.trim());
    router.push(`/user/${currentEvent.id}/gallery`);
  };

  const meta = currentEvent.date;

  // Home for a guest who has already joined: just their name, ready to change
  if (hasJoined && !hostUser && !submitting) {
    const trimmed = nameInput.trim();
    const changed = trimmed.length > 0 && trimmed !== guestName;
    const saveName = (e: React.FormEvent) => {
      e.preventDefault();
      if (!trimmed) {
        setNameError('Add your name so the couple knows who’s sharing.');
        return;
      }
      if (!changed) return;
      setNameError('');
      setGuestName(trimmed);
      triggerToast('Name updated', 'New photos will show this name');
      router.push(`/user/${currentEvent.id}/gallery`);
    };
    return (
      <div className="flex-1 w-full max-w-md mx-auto px-6 pt-10 md:pt-16 pb-28 animate-fade-up">
        <p className="text-[13px] font-medium text-[#1C2820]/55">{currentEvent.title}</p>
        <h1 className="font-serif text-[40px] leading-[1.05] font-medium tracking-tight text-[#1C2820] mt-1 break-words">
          Hi, {guestName}
        </h1>

        <form onSubmit={saveName} className="mt-8 space-y-3">
          <label htmlFor="guest-name" className="block text-[13px] font-semibold text-[#1C2820]">
            Your name
          </label>
          <input
            id="guest-name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="done"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (nameError) setNameError('');
            }}
            placeholder="Your name"
            className={`w-full h-14 px-5 rounded-2xl bg-white border text-[17px] font-medium text-[#1C2820] placeholder:text-[#1C2820]/35 focus:outline-none focus:ring-4 transition-all ${
              nameError ? 'border-red-400 focus:ring-red-100' : 'border-[#1C2820]/12 focus:border-[#2D4A3A] focus:ring-[#2D4A3A]/12'
            }`}
          />
          <p className={`px-1 text-[13px] ${nameError ? 'text-red-600 font-medium' : 'text-[#1C2820]/45'}`}>
            {nameError || 'Shown next to the photos you share.'}
          </p>
          <button
            type="submit"
            disabled={!changed}
            className="w-full h-14 rounded-2xl bg-[#2D4A3A] text-white text-[16px] font-semibold flex items-center justify-center shadow-[0_10px_30px_rgba(45,74,58,0.28)] disabled:opacity-40 disabled:shadow-none press"
          >
            Save name
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-5 text-[14px]">
          <Link href={`/user/${currentEvent.id}/gallery`} className="font-medium text-[#2D4A3A] py-2 press">
            Back to the gallery
          </Link>
          <span className="w-1 h-1 rounded-full bg-[#1C2820]/25" />
          <button type="button" onClick={leaveAsGuest} className="font-medium text-[#1C2820]/55 py-2 press">
            Not {guestName}? Leave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:items-center md:justify-center md:py-12 md:px-6">
      <div className="w-full md:max-w-md md:rounded-[32px] md:overflow-hidden md:shadow-2xl md:border md:border-[#1C2820]/10 bg-[#FAF8F5] flex flex-col flex-1 md:flex-none">
        {/* Cover: full-bleed on phones */}
        <div className="relative h-[46vh] min-h-[300px] max-h-[460px] md:h-72 md:min-h-0 bg-[#182B24] overflow-hidden">
          <img src={currentEvent.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          {/* Darker at the top too, so the iPhone status bar stays readable over the photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/35" />
          <span
            className="absolute left-5 flex items-center gap-2 text-white/90"
            style={{ top: 'calc(env(safe-area-inset-top) + 0.9rem)' }}
          >
            <span className="w-7 h-7 rounded-[9px] bg-white/15 backdrop-blur-md flex items-center justify-center font-serif text-base font-bold">
              m
            </span>
            <span className="font-serif text-[17px] tracking-tight">memorie aisle</span>
          </span>
          <div className="absolute inset-x-0 bottom-0 px-6 pb-12 md:pb-10 text-white animate-fade-up">
            {meta && (
              <p className="text-[12px] uppercase tracking-[0.16em] font-semibold text-white/80">{meta}</p>
            )}
            <h1 className="font-serif text-[44px] leading-[1.02] font-medium mt-2 tracking-tight">{currentEvent.title}</h1>
          </div>
        </div>

        {/* Sheet */}
        <div className="relative -mt-7 flex-1 rounded-t-[28px] md:rounded-none bg-[#FAF8F5] px-6 pt-8 pb-10 space-y-7">
          <div className="space-y-2 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <h2 className="font-serif text-[30px] leading-tight font-medium text-[#1C2820]">
              Our day. Your eyes.
            </h2>
            <p className="text-[15px] leading-relaxed text-[#1C2820]/65">
              Share your photos straight from your phone. No app, no sign-up.
            </p>
          </div>

                      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
              {hostUser && (
                <div className="p-4 rounded-2xl bg-[#E9EFEA] text-[13px] text-[#1C2820]/75 leading-relaxed">
                  You’re signed in as host <span className="font-semibold">{hostUser.email}</span>. Joining as a guest
                  will sign you out of the host portal.
                </div>
              )}

              <div>
                <label htmlFor="guest-name" className="sr-only">
                  Your name
                </label>
                <input
                  id="guest-name"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="go"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder="Your name"
                  className={`w-full h-14 px-5 rounded-2xl bg-white border text-[17px] font-medium text-[#1C2820] placeholder:text-[#1C2820]/35 focus:outline-none focus:ring-4 transition-all ${
                    nameError
                      ? 'border-red-400 focus:ring-red-100'
                      : 'border-[#1C2820]/12 focus:border-[#2D4A3A] focus:ring-[#2D4A3A]/12'
                  }`}
                />
                <p className={`mt-2 px-1 text-[13px] ${nameError ? 'text-red-600 font-medium' : 'text-[#1C2820]/45'}`}>
                  {nameError || 'Shown next to the photos you share.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 rounded-2xl bg-[#2D4A3A] text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(45,74,58,0.28)] disabled:opacity-60 press"
              >
                <span>Join the celebration</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

          {/* What you can do */}
                      <ul className="grid grid-cols-3 gap-2 pt-2 animate-fade-up" style={{ animationDelay: '180ms' }}>
              {[
                { icon: Camera, label: 'Share photos' },
                { icon: Images, label: 'Live gallery' },
                { icon: Heart, label: 'Vote & react' },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white border border-[#1C2820]/[0.06]">
                  <Icon className="w-5 h-5 text-[#2D4A3A]" strokeWidth={1.8} />
                  <span className="text-[12px] font-medium text-[#1C2820]/70">{label}</span>
                </li>
              ))}
            </ul>
        </div>
      </div>
    </div>
  );
}

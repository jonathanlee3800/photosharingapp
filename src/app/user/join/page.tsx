'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Sparkles, ArrowLeft } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function JoinPage() {
  const router = useRouter();
  const { currentEvent, guestName, joinCelebration } = useEvent();
  const [nameInput, setNameInput] = useState(guestName || '');
  const [nameError, setNameError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setNameError('Please enter your name so the couple knows who is sharing.');
      return;
    }
    setNameError('');
    joinCelebration(nameInput.trim());
    router.push(`/user/${currentEvent.id}/gallery`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 pb-28 sm:pb-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-xl space-y-6">
        <div className="relative h-56 rounded-2xl overflow-hidden shadow-inner bg-black/10">
          <img
            src={currentEvent.coverUrl}
            alt={currentEvent.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/80">
              {currentEvent.date} · {currentEvent.venue}
            </span>
            <h1 className="font-serif text-3xl font-medium mt-0.5">
              {currentEvent.title}
            </h1>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-[#1C2820]">
            Our day. Your eyes.
          </h2>
          <p className="text-xs text-[#1C2820]/70 font-medium leading-relaxed">
            Share your candid photos, video toasts, and well-wishes directly from your mobile browser. No app download needed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1C2820]/80 uppercase tracking-wide mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="e.g. Clara Vance"
              className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 transition-all shadow-sm ${
                nameError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : 'border-[#1C2820]/20 focus:border-[#2D4A3A] focus:ring-[#2D4A3A]/20'
              }`}
            />
            {nameError ? (
              <span className="block text-[11px] text-red-600 mt-1 font-semibold">
                {nameError}
              </span>
            ) : (
              <span className="block text-[10px] text-[#1C2820]/50 mt-1 font-medium">
                Shown alongside your candid photos and well-wishes
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Join the Celebration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#1C2820]/10 flex items-center justify-between text-xs text-[#1C2820]/60">
          <div className="flex items-center gap-1.5 text-[#2D4A3A] font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Private vault available</span>
          </div>
          <Link
            href={`/user/${currentEvent.id}/gallery`}
            className="hover:text-[#1C2820] font-semibold underline underline-offset-4"
          >
            Browse gallery →
          </Link>
        </div>
      </div>
    </div>
  );
}

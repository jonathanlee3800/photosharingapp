'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { Shield, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function HostAuthGuard({ children }: { children: ReactNode }) {
  const { isHostLoggedIn, loginHost } = useEvent();

  if (!isHostLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white rounded-3xl p-8 border border-[#1C2820]/10 shadow-xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-medium text-[#1C2820]">
              Host Login Required
            </h2>
            <p className="text-xs sm:text-sm text-[#1C2820]/65 font-medium leading-relaxed">
              Please sign in to your host account to manage events, configure QR codes, and review moderation photos.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/host/login"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Go to Host Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => loginHost('host@withlove.app', 'password123')}
              className="w-full py-3 px-6 rounded-xl border border-[#2D4A3A]/30 bg-[#E9EFEA] hover:bg-[#D8E5DA] text-[#2D4A3A] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Host Demo Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


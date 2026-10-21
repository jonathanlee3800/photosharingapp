'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import GoogleIcon from '@/components/GoogleIcon';

export default function HostLoginPage() {
  const router = useRouter();
  const {
    isHostLoggedIn,
    loginHost,
    loginHostWithPassword,
    loginWithGoogle,
    hostUser,
    logoutHost,
  } = useEvent();

  const [email, setEmail] = useState('host@withlove.app');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoadingGoogle(true);
    const { error: googleError } = await loginWithGoogle();
    if (googleError) {
      setError(googleError);
      setLoadingGoogle(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoadingEmail(true);
    const result = await loginHostWithPassword(email, password);
    setLoadingEmail(false);

    if (result.success) {
      router.push('/host/events');
    } else {
      setError(result.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  const handleQuickDemoLogin = () => {
    loginHost('host@withlove.app', 'password123');
    router.push('/host/events');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 pb-28 sm:pb-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-10 border border-[#1C2820]/10 shadow-xl space-y-6">
        {/* Header Icon & Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] mx-auto flex items-center justify-center shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full">
            Host & Couple Portal
          </span>
          <h1 className="font-serif text-3xl font-medium text-[#1C2820]">
            Sign in to your event
          </h1>
          <p className="text-xs text-[#1C2820]/65 font-medium">
            Manage your wedding QR codes, live screen spotlights, mini-categories, and moderation vault.
          </p>
        </div>

        {isHostLoggedIn && hostUser ? (
          <div className="p-4 bg-[#E9EFEA] rounded-2xl border border-[#2D4A3A]/20 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#2D4A3A]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Currently signed in as {hostUser.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/host/events"
                className="flex-1 py-2.5 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold shadow-sm"
              >
                Go to Events List
              </Link>
              <button
                type="button"
                onClick={logoutHost}
                className="px-4 py-2.5 rounded-xl border border-[#2D4A3A]/20 bg-white text-xs font-semibold text-[#1C2820] hover:bg-black/5"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium leading-relaxed">
                {error}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loadingGoogle}
              className="w-full py-3.5 px-4 rounded-xl border border-[#1C2820]/15 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-[#1C2820] text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loadingGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#2D4A3A]" />
              ) : (
                <GoogleIcon className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{loadingGoogle ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>

            {/* Visual Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#1C2820]/10"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-[#1C2820]/45 uppercase tracking-wider">
                or sign in with password
              </span>
              <div className="flex-grow border-t border-[#1C2820]/10"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C2820]/80 uppercase tracking-wide mb-1.5">
                  Host Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#1C2820]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. simone@withlove.app"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#1C2820]/20 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C2820]/80 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#1C2820]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#1C2820]/20 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingEmail}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
              >
                {loadingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In as Host</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo Login Option */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="w-full py-3 rounded-xl border border-[#2D4A3A]/30 bg-[#E9EFEA] hover:bg-[#D8E5DA] text-[#2D4A3A] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#2D4A3A]" />
                  <span>1-Click Host Demo Sign In</span>
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="pt-4 border-t border-[#1C2820]/10 text-center text-xs text-[#1C2820]/65 space-y-1">
          <div>
            <span>Don't have a host account? </span>
            <Link href="/host/signup" className="font-bold text-[#2D4A3A] hover:underline">
              Create Host Account →
            </Link>
          </div>
          <div>
            <span>Are you a guest attending an event? </span>
            <Link href="/" className="font-medium text-[#1C2820]/75 hover:underline">
              Join Celebration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

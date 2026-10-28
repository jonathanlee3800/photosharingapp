'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, User, ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import GoogleIcon from '@/components/GoogleIcon';

export default function HostSignUpPage() {
  const router = useRouter();
  const {
    isHostLoggedIn,
    hostUser,
    loginWithGoogle,
    signUpHostWithPassword,
    loginHost,
  } = useEvent();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  // Handle Google OAuth Sign Up
  const handleGoogleSignUp = async () => {
    setError('');
    setLoadingGoogle(true);
    const { error: googleError } = await loginWithGoogle();
    if (googleError) {
      setError(googleError);
      setLoadingGoogle(false);
    }
    // If successful, the browser will automatically redirect to Google consent screen
  };

  // Handle standard email/password sign up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoadingEmail(true);
    const res = await signUpHostWithPassword(email, password, fullName);
    setLoadingEmail(false);

    if (res.error) {
      setError(res.error);
    } else if (res.requireVerification) {
      setVerificationSent(true);
    } else {
      router.push('/host/events');
    }
  };

  const handleDemoSignUp = () => {
    loginHost('host@memoryaisle.app', 'password123');
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
            Host & Couple Registration
          </span>
          <h1 className="font-serif text-3xl font-medium text-[#1C2820]">
            Create Host Account
          </h1>
          <p className="text-xs text-[#1C2820]/65 font-medium">
            Set up your wedding celebration space, create photo prompts, and manage your live displays.
          </p>
        </div>

        {isHostLoggedIn && hostUser ? (
          <div className="p-4 bg-[#E9EFEA] rounded-2xl border border-[#2D4A3A]/20 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#2D4A3A]">
              <CheckCircle2 className="w-4 h-4" />
              <span>You are already signed in as {hostUser.email}</span>
            </div>
            <Link
              href="/host/events"
              className="block w-full py-2.5 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold shadow-sm"
            >
              Go to Your Events Dashboard →
            </Link>
          </div>
        ) : verificationSent ? (
          <div className="p-6 bg-[#E9EFEA] rounded-2xl border border-[#2D4A3A]/20 space-y-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#2D4A3A] mx-auto" />
            <h2 className="font-serif text-xl font-medium text-[#1C2820]">
              Verification Email Sent
            </h2>
            <p className="text-xs text-[#1C2820]/75">
              We sent a confirmation link to <strong className="text-[#2D4A3A]">{email}</strong>. Please check your inbox to activate your host account.
            </p>
            <div className="pt-2">
              <Link
                href="/host/login"
                className="text-xs font-bold text-[#2D4A3A] hover:underline"
              >
                Proceed to Sign In →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium leading-relaxed">
                {error}
              </div>
            )}

            {/* Google One-Click Sign Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loadingGoogle}
              className="w-full py-3.5 px-4 rounded-xl border border-[#1C2820]/15 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-[#1C2820] text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loadingGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#2D4A3A]" />
              ) : (
                <GoogleIcon className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{loadingGoogle ? 'Connecting to Google...' : 'Sign up with Google'}</span>
            </button>

            {/* Visual Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#1C2820]/10"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-[#1C2820]/45 uppercase tracking-wider">
                or sign up with email
              </span>
              <div className="flex-grow border-t border-[#1C2820]/10"></div>
            </div>

            {/* Email Registration Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#1C2820]/80 uppercase tracking-wide mb-1">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#1C2820]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Simone & Joshua"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1C2820]/20 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C2820]/80 uppercase tracking-wide mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#1C2820]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="host@wedding.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1C2820]/20 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C2820]/80 uppercase tracking-wide mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#1C2820]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1C2820]/20 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all shadow-sm"
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
                    <span>Create Host Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Demo Sign In Option */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleDemoSignUp}
                  className="w-full py-2.5 rounded-xl border border-[#2D4A3A]/25 bg-[#E9EFEA] hover:bg-[#D8E5DA] text-[#2D4A3A] text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Demo Mode (No Registration)</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer Link */}
        <div className="pt-4 border-t border-[#1C2820]/10 text-center text-xs text-[#1C2820]/65 space-y-1">
          <div>
            <span>Already registered as a host? </span>
            <Link href="/host/login" className="font-bold text-[#2D4A3A] hover:underline">
              Sign In →
            </Link>
          </div>
          <div>
            <span>Attending as a guest? </span>
            <Link href="/" className="font-medium text-[#1C2820]/75 hover:underline">
              Join Celebration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


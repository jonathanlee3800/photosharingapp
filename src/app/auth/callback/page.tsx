'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        if (typeof window === 'undefined') return;

        // Check if there's an error in URL hash or query params
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const error = searchParams.get('error') || hashParams.get('error');
        const errorDescription =
          searchParams.get('error_description') ||
          hashParams.get('error_description');

        if (error) {
          if (isMounted) {
            setErrorMsg(errorDescription || error);
          }
          return;
        }

        // Handle PKCE code exchange if present
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (isMounted) setErrorMsg(exchangeError.message);
            return;
          }
        }

        // Verify active session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && isMounted) {
          // Success: redirect to host events dashboard
          router.replace('/host/events');
        } else if (isMounted) {
          // Fallback check after small delay
          setTimeout(async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              router.replace('/host/events');
            } else {
              router.replace('/host/login');
            }
          }, 1000);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err?.message || 'Authentication failed. Please try again.');
        }
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#1C2820]/10 shadow-xl text-center space-y-4">
        {errorMsg ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="font-serif text-2xl font-medium text-[#1C2820]">
              Sign In Issue
            </h1>
            <p className="text-xs sm:text-sm text-red-600 bg-red-50/70 p-3 rounded-xl border border-red-200">
              {errorMsg}
            </p>
            <div className="pt-2">
              <Link
                href="/host/signup"
                className="w-full py-3 px-4 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold inline-flex items-center justify-center gap-2"
              >
                <span>Back to Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#E9EFEA] text-[#2D4A3A] mx-auto flex items-center justify-center animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h1 className="font-serif text-2xl font-medium text-[#1C2820]">
              Completing Google Sign In...
            </h1>
            <p className="text-xs text-[#1C2820]/60">
              Syncing your host profile and wedding spaces. You will be redirected in a moment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}


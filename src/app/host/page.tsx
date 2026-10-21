'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HostRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/host/events');
  }, [router]);

  return null;
}

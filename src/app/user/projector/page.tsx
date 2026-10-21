'use client';

import React from 'react';
import ProjectorScreen from '@/components/ProjectorScreen';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function ProjectorPage() {
  const { currentEvent } = useEvent();
  return (
    <div className="fixed inset-0 bg-[#182B24] flex flex-col z-50">
      {/* Discreet auto-hiding top navigation */}
      <div className="h-10 px-6 bg-black/60 backdrop-blur-md flex items-center justify-between text-xs text-white/50 z-30 select-none opacity-20 hover:opacity-100 transition-opacity shrink-0">
        <Link href={`/user/${currentEvent.id}/gallery`} className="hover:text-white flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Event Gallery
        </Link>
        <span className="text-[11px] font-sans tracking-widest uppercase text-white/60">
          Projector Mode · [Space] or [→] Next Slide · [P] Pause/Play
        </span>
        <Link href={`/host/${currentEvent.id}/photos`} className="hover:text-white flex items-center gap-1.5 transition-colors">
          <Shield className="w-3.5 h-3.5" /> Host Admin
        </Link>
      </div>

      <main className="flex-1 overflow-hidden">
        <ProjectorScreen fullscreenMode />
      </main>
    </div>
  );
}

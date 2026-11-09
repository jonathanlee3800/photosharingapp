'use client';

import React from 'react';
import ProjectorScreen from '@/components/ProjectorScreen';
import { useEvent } from '@/context/EventContext';
import HostAuthGuard from '@/components/HostAuthGuard';

export default function ProjectorPage() {
  const { currentEvent } = useEvent();
  return (
    <HostAuthGuard>
      <div className="fixed inset-0 z-50 bg-[#FAF8F5]">
        <ProjectorScreen exitHref={`/host/${currentEvent.code}`} />
      </div>
    </HostAuthGuard>
  );
}

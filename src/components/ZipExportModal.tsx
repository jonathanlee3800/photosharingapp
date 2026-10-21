'use client';

import React, { useState } from 'react';
import { X, Download, CheckCircle2, Loader2, Sparkles, FolderArchive } from 'lucide-react';
import { useEvent } from '@/context/EventContext';

export default function ZipExportModal() {
  const {
    isZipModalOpen,
    setIsZipModalOpen,
    memories,
    publicMemories,
    privateMemories,
    exportAllZip,
  } = useEvent();

  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  if (!isZipModalOpen) return null;

  const handleDownloadZip = async () => {
    try {
      setIsExporting(true);
      setProgressMsg('Bundling photos and well-wishes...');
      await exportAllZip();
      setProgressMsg('Done! Your download will begin.');
      setTimeout(() => {
        setIsExporting(false);
        setIsZipModalOpen(false);
      }, 1200);
    } catch (e) {
      console.error(e);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] text-[#1C2820] max-w-md w-full rounded-[2rem] p-5 sm:p-7 space-y-5 sm:space-y-6 shadow-2xl border border-[#2D4A3A]/30 transform transition-all animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#2D4A3A] font-bold flex items-center gap-1.5">
              <FolderArchive className="w-3.5 h-3.5" /> withlove.app Archive Export
            </span>
            <h3 className="font-serif text-3xl font-medium mt-1 text-[#1C2820]">
              All the love, ready to keep.
            </h3>
          </div>
          <button
            onClick={() => !isExporting && setIsZipModalOpen(false)}
            disabled={isExporting}
            className="p-2 rounded-full hover:bg-black/5 text-[#1C2820]/60 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#F2EFE9] rounded-2xl p-5 space-y-3 text-xs border border-[#1C2820]/10 shadow-inner">
          <div className="flex justify-between py-1.5 border-b border-[#1C2820]/10">
            <span className="text-[#1C2820]/70">Public Slideshow Photos</span>
            <span className="font-semibold">{publicMemories.length} High-Res Files</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#1C2820]/10">
            <span className="text-[#1C2820]/70">Private Vault (Host Only)</span>
            <span className="font-semibold text-[#2D4A3A]">
              {privateMemories.length} Private Memories
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#1C2820]/10">
            <span className="text-[#1C2820]/70">Video Well-Wishes</span>
            <span className="font-semibold">
              {memories.filter((m) => m.type === 'video').length} Videos
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-[#1C2820]/70">Editorial Guestbook & Captions</span>
            <span className="font-semibold text-[#2D4A3A] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Included (TXT + JSON)
            </span>
          </div>
        </div>

        {isExporting && (
          <div className="p-3 bg-[#E9EFEA] rounded-xl text-xs font-semibold text-[#2D4A3A] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{progressMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsZipModalOpen(false)}
            disabled={isExporting}
            className="flex-1 py-3 rounded-xl border-2 border-[#1C2820]/10 text-xs font-bold hover:bg-black/5 active:scale-95 transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={isExporting || memories.length === 0}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : memories.length === 0 ? (
              <span>No Photos Yet</span>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download ZIP ({memories.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


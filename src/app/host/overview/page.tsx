'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Image as ImageIcon,
  Lock,
  QrCode,
  Copy,
  Download,
  Trophy,
  Plus,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Share2,
  Trash2,
  Check,
  Calendar,
  MapPin,
  Tag,
  ArrowLeft,
  Play,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import HostAuthGuard from '@/components/HostAuthGuard';
import { generateQrDataUrl, downloadQrCode } from '@/lib/qrHelper';

const EMOJI_OPTIONS = ['🌿', '🥂', '✨', '🕰️', '💃', '📸', '🎉', '💐', '🎂', '💌'];

export default function HostOverviewPage() {
  const router = useRouter();
  const {
    hostEvents: events,
    currentEvent,
    setCurrentEventId,
    memories,
    publicMemories,
    privateMemories,
    prompts,
    votingRound,
    setVotingCategory,
    activeSlideMemory,
    spotlightId,
    toggleSpotlight,
    resumeSlideshow,
    cycleNextSlide,
    addPrompt,
    deletePrompt,
    triggerToast,
    setIsZipModalOpen,
  } = useEvent();

  const [promptInput, setPromptInput] = useState('');
  const [promptIcon, setPromptIcon] = useState('📸');
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Generate real QR code for current event
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://memoryaisle.app';
    const targetUrl = `${origin}/user/${currentEvent.id}`;

    generateQrDataUrl(targetUrl, { width: 400, margin: 2 }).then((data) => {
      setQrDataUrl(data);
    });
  }, [currentEvent.id]);

  const activeVotingPrompt =
    prompts.find((p) => p.id === votingRound.promptId) || prompts[0] || { id: 'default', label: 'Wedding Moments', icon: '🌿' };

  // Live round stats for the current event, starting from zero
  const votingCandidates = publicMemories.filter((m) => m.promptId === votingRound.promptId);
  const votingTotal = votingCandidates.reduce((sum, m) => sum + (m.votes || 0), 0);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/user/${currentEvent.id}`;
      navigator.clipboard?.writeText(url);
    }
    triggerToast('Event link copied to clipboard', `/user/${currentEvent.id}`);
  };

  const handleDownloadQr = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://memoryaisle.app';
    const targetUrl = `${origin}/user/${currentEvent.id}`;
    downloadQrCode(targetUrl, currentEvent.title);
    triggerToast('Downloading high-res QR code PNG');
  };

  const handleAddPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    addPrompt(promptInput.trim(), promptIcon);
    setPromptInput('');
    setShowAddPrompt(false);
  };

  return (
    <HostAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
        <div className="space-y-4">
        {/* Back to All Events */}
        <div className="flex items-center justify-between">
          <Link
            href="/host/events"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#1C2820]/15 text-xs font-bold text-[#2D4A3A] hover:bg-[#E9EFEA] transition-all shadow-sm group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>All Events ({events.length})</span>
          </Link>
          <span className="text-xs text-[#1C2820]/50 font-medium">
            Managing: <span className="font-bold text-[#1C2820]">{currentEvent.title}</span>
          </span>
        </div>

        {/* Sub-navigation bar for Host */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1C2820]/10 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/host/${currentEvent.id}`}
              className="px-4 py-2 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold shadow-sm"
            >
              Overview
            </Link>
            <Link
              href={`/host/${currentEvent.id}/photos`}
              className="px-4 py-2 rounded-xl text-[#1C2820]/70 hover:text-[#1C2820] hover:bg-black/5 text-xs font-semibold transition-colors"
            >
              Photos & Videos ({memories.length})
            </Link>
            <Link
              href="/host/events/new"
              className="px-4 py-2 rounded-xl bg-[#E9EFEA] hover:bg-[#D8E5DA] text-[#2D4A3A] text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Event</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Event Switcher Selector */}
            {events.length > 1 && (
              <select
                value={currentEvent.id}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setCurrentEventId(nextId, true);
                  router.push(`/host/${nextId}`);
                }}
                className="px-3 py-2 rounded-xl border border-[#1C2820]/20 bg-white text-xs font-bold text-[#1C2820] focus:outline-none"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.id})
                  </option>
                ))}
              </select>
            )}

            <Link
              href={`/user/${currentEvent.id}/projector`}
              target="_blank"
              className="px-4 py-2 rounded-xl border border-[#1C2820]/20 text-xs font-bold text-[#1C2820] hover:bg-[#E9EFEA] flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#2D4A3A]" />
              <span>Projector</span>
            </Link>
            <button
              onClick={() => setIsZipModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export ZIP</span>
            </button>
          </div>
        </div>
        </div>

        {/* Hero Intro */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#1C2820]/60">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#2D4A3A]" /> {currentEvent.date}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#2D4A3A]" /> {currentEvent.venue}
              </span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#1C2820] mt-1">
              {currentEvent.title}
            </h1>
            <p className="text-sm text-[#1C2820]/65 mt-1 font-medium">
              Event ID: <span className="font-bold text-[#2D4A3A] font-mono">{currentEvent.id}</span> · Collecting candid memories from all your guests.
            </p>
          </div>

          <Link
            href="/host/events/new"
            className="px-4 py-2.5 rounded-xl border border-[#2D4A3A] text-[#2D4A3A] hover:bg-[#E9EFEA] text-xs font-bold flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Another Event</span>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#1C2820]/60 mb-2">
              <span className="text-xs font-semibold">Memories Collected</span>
              <ImageIcon className="w-4 h-4 text-[#2D4A3A]" />
            </div>
            <div className="font-serif text-4xl font-bold text-[#1C2820] mb-1">
              {memories.length}
            </div>
            <div className="text-[11px] text-[#1C2820]/60 font-medium">
              {memories.filter((m) => m.type === 'photo').length} photos ·{' '}
              {memories.filter((m) => m.type === 'video').length} video well-wishes
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#1C2820]/60 mb-2">
              <span className="text-xs font-semibold">Private Vault</span>
              <Lock className="w-4 h-4 text-[#2D4A3A]" />
            </div>
            <div className="font-serif text-4xl font-bold text-[#1C2820] mb-1">
              {privateMemories.length}
            </div>
            <div className="text-[11px] text-[#1C2820]/60 font-medium">
              Visible only to you, the hosts
            </div>
          </div>
        </div>

        {/* Middle Row: Generated QR Code Card & Live Contest Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Real Generated QR Code Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1C2820]">
                  Table QR Sign & Link
                </h2>
                <p className="text-xs text-[#1C2820]/60 font-medium mt-0.5">
                  Point phone camera at this QR code to join immediately without downloading an app.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#E9EFEA] text-[#2D4A3A] text-xs font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D4A3A] animate-pulse"></span>
                Live QR
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Scannable Real QR Graphic */}
              <div className="w-36 h-36 bg-white p-2.5 border border-[#1C2820]/15 rounded-2xl shadow-sm shrink-0 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${currentEvent.title}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-20 h-20 text-[#1C2820]/40 animate-pulse" />
                )}
              </div>

              <div className="space-y-3 w-full">
                <div className="text-xs text-[#1C2820]/70 font-medium leading-relaxed">
                  Guests scan this code at their tables. Displays directly on Android and iPhone browsers.
                </div>
                <div className="flex items-center justify-between bg-[#FAF8F5] rounded-xl px-4 py-2.5 border border-[#1C2820]/15">
                  <span className="text-xs sm:text-sm font-mono font-semibold text-[#1C2820] truncate pr-2">
                    /user/{currentEvent.id}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1 text-[#1C2820]/60 hover:text-[#1C2820]"
                    title="Copy invite URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-[#1C2820]/60 font-medium">
                  Unique Event ID: <span className="font-bold text-[#2D4A3A] font-mono">{currentEvent.id}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCopyLink}
                className="py-2.5 rounded-xl border border-[#1C2820]/15 text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] flex items-center justify-center gap-2 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </button>
              <button
                onClick={handleDownloadQr}
                className="py-2.5 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#1F3628] transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download QR Sign (PNG)
              </button>
            </div>
          </div>

          {/* Live Contest Round Card */}
          <div className="lg:col-span-5 bg-[#F4F1EA] rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1C2820]">
                The live round
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D4A3A] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D4A3A]"></span> LIVE
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-[#1C2820] mb-3 flex items-center gap-2">
                <span>{activeVotingPrompt.icon}</span>
                <span>{activeVotingPrompt.label}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 border-y border-[#1C2820]/10 py-4">
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C2820]">
                    00:00
                  </div>
                  <div className="text-[10px] text-[#1C2820]/60 font-medium">remaining</div>
                </div>
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C2820]">
                    {votingTotal}
                  </div>
                  <div className="text-[10px] text-[#1C2820]/60 font-medium">votes</div>
                </div>
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C2820]">
                    {votingCandidates.length}
                  </div>
                  <div className="text-[10px] text-[#1C2820]/60 font-medium">candidates</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => triggerToast('Contest closed! Winner displayed on screen')}
                className="flex-1 py-3 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <Trophy className="w-4 h-4" /> Close & Reveal Winner
              </button>
              <Link
                href={`/user/${currentEvent.id}/vote`}
                className="px-4 py-3 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] transition-colors"
              >
                View
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Row: Mini-Categories Manager & Live Spotlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mini-Categories Manager for this Event */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1C2820]">
                  Mini-Categories & Prompts
                </h2>
                <p className="text-xs text-[#1C2820]/60 font-medium mt-0.5">
                  Categories for {currentEvent.title}. Guests select one when sharing well-wishes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPrompt(!showAddPrompt)}
                className="px-3.5 py-1.5 rounded-xl border border-[#1C2820]/15 text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            </div>

            {/* Add prompt form */}
            {showAddPrompt && (
              <form onSubmit={handleAddPromptSubmit} className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#1C2820]/10 flex items-center gap-2">
                <select
                  value={promptIcon}
                  onChange={(e) => setPromptIcon(e.target.value)}
                  className="w-14 p-2 rounded-xl border border-[#1C2820]/20 text-base text-center bg-white"
                >
                  {EMOJI_OPTIONS.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="New category name (e.g. Best dance moves)"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#1C2820]/20 text-xs font-semibold"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2D4A3A] text-white rounded-xl text-xs font-bold"
                >
                  Save
                </button>
              </form>
            )}

            {/* Prompts list */}
            <div className="space-y-2">
              {prompts.map((p) => {
                const isVoting = p.id === votingRound.promptId;
                const count = memories.filter((m) => m.promptId === p.id).length;

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 font-bold text-[#1C2820]">
                      <span className="text-lg">{p.icon}</span>
                      <span>{p.label}</span>
                      <span className="text-[10px] text-[#1C2820]/50 font-medium">
                        ({count} photos)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isVoting ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#2D4A3A] text-white text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Active Contest</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVotingCategory(p.id)}
                          className="px-2.5 py-1 rounded-full border border-[#1C2820]/15 hover:bg-black/5 text-[#1C2820]/70 text-[10px] font-semibold"
                        >
                          Make Contest
                        </button>
                      )}

                      {prompts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deletePrompt(p.id)}
                          className="p-1.5 text-[#1C2820]/40 hover:text-red-600 transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Spotlight Manager */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1C2820]">
                In the Spotlight
              </h2>
              <Sparkles className="w-5 h-5 text-[#2D4A3A]" />
            </div>

            <div className="flex items-center gap-4">
              <img
                src={activeSlideMemory?.url || currentEvent.coverUrl}
                alt=""
                className="w-24 h-24 object-cover rounded-2xl shadow-sm border border-[#1C2820]/10 shrink-0"
              />
              <div>
                <div className="font-serif text-lg font-bold text-[#1C2820] line-clamp-2">
                  “{activeSlideMemory?.caption}”
                </div>
                <div className="text-xs text-[#1C2820]/60 mt-1 font-medium">
                  {activeSlideMemory?.guestName} · {activeSlideMemory?.votes} loves
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cycleNextSlide}
                className="flex-1 py-2.5 rounded-xl border border-[#1C2820]/15 text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] transition-colors"
              >
                Next Memory
              </button>
              <button
                type="button"
                onClick={() => (spotlightId ? resumeSlideshow() : toggleSpotlight(activeSlideMemory.id))}
                className="flex-1 py-2.5 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                {spotlightId ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume Slideshow</span>
                  </>
                ) : (
                  'Lock on Screen'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </HostAuthGuard>
  );
}

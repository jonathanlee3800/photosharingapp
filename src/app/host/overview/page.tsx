'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  ShieldCheck,
  Share2,
  Trash2,
  Calendar,
  Tag,
  Play,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { formatPin } from '@/lib/pin';
import type { MemoryItem } from '@/lib/initialData';
import HostAuthGuard from '@/components/HostAuthGuard';
import HostEventHeader from '@/components/HostEventHeader';
import { useConfirm } from '@/components/ConfirmDialog';
import { generateQrDataUrl, downloadQrCode } from '@/lib/qrHelper';

const EMOJI_OPTIONS = ['🌿', '🥂', '✨', '🕰️', '💃', '📸', '🎉', '💐', '🎂', '💌'];

export default function HostOverviewPage() {
  const {
    currentEvent,
    memories,
    publicMemories,
    privateMemories,
    prompts,
    votingRound,
    startVotingRound,
    closeVotingRound,
    activeSlideMemory,
    spotlightId,
    toggleSpotlight,
    resumeSlideshow,
    cycleNextSlide,
    addPrompt,
    deletePrompt,
    triggerToast,
  } = useEvent();

  const [promptInput, setPromptInput] = useState('');
  const [promptIcon, setPromptIcon] = useState('📸');
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  // Live round controls: chosen duration (minutes, 0 = no limit) and the last revealed winner
  const [roundMinutes, setRoundMinutes] = useState(5);
  const [lastWinner, setLastWinner] = useState<MemoryItem | null>(null);
  const [roundBusy, setRoundBusy] = useState(false);
  const [roundPromptId, setRoundPromptId] = useState('');
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Full guest link, on whichever domain this page is open. Set after mount so server and browser render match.
  const [siteOrigin, setSiteOrigin] = useState('https://memorieaisle.com');
  useEffect(() => setSiteOrigin(window.location.origin), []);
  const guestUrl = `${siteOrigin}/user/${currentEvent.code}`;

  // Generate real QR code for current event
  useEffect(() => {
    generateQrDataUrl(guestUrl, { width: 400, margin: 2 }).then((data) => {
      setQrDataUrl(data);
    });
  }, [guestUrl]);

  // While a round is open it shows that round's category; otherwise the category picked for the next round
  const selectedRoundPromptId =
    (prompts.some((p) => p.id === roundPromptId) && roundPromptId) ||
    (prompts.some((p) => p.id === votingRound.promptId) && votingRound.promptId) ||
    prompts[0]?.id ||
    '';
  const roundDisplayPromptId = votingRound.isOpen ? votingRound.promptId : selectedRoundPromptId;
  const activeVotingPrompt =
    prompts.find((p) => p.id === roundDisplayPromptId) || prompts[0] || { id: 'default', label: 'Wedding Moments', icon: '🌿' };

  // Live round stats for the round's category
  const votingCandidates = publicMemories.filter((m) => m.promptId === roundDisplayPromptId);
  const votingTotal = votingCandidates.reduce((sum, m) => sum + (m.votes || 0), 0);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(guestUrl);
    triggerToast('Event link copied to clipboard', guestUrl);
  };

  const handleDownloadQr = () => {
    downloadQrCode(guestUrl, currentEvent.title);
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
        <HostEventHeader active="overview" />

        {/* Hero Intro */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#1C2820]/60">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#2D4A3A]" /> {currentEvent.date}
              </span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#1C2820] mt-1">
              {currentEvent.title}
            </h1>
            <p className="text-sm text-[#1C2820]/65 mt-1 font-medium">
              Event PIN: <span className="font-bold text-[#2D4A3A] tabular-nums tracking-wider">{formatPin(currentEvent.code)}</span> · Collecting candid memories from all your guests.
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
                    {guestUrl}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1 text-[#1C2820]/60 hover:text-[#1C2820]"
                    title="Copy invite URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {/* Kahoot-style: guests can also type the PIN at /join */}
                <div className="rounded-xl bg-[#E9EFEA] px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#2D4A3A]/80">
                    Event PIN · guests can type it at /join
                  </div>
                  <div className="text-3xl font-bold text-[#1C2820] tracking-wider tabular-nums mt-0.5">
                    {formatPin(currentEvent.code)}
                  </div>
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
              {votingRound.isActive ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D4A3A] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D4A3A] animate-pulse"></span> LIVE
                </span>
              ) : votingRound.isOpen ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">TIME’S UP</span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1C2820]/45">CLOSED</span>
              )}
            </div>

            <div>
              {votingRound.isOpen ? (
                <div className="text-sm font-bold text-[#1C2820] mb-3 flex items-center gap-2">
                  <span>{activeVotingPrompt.icon}</span>
                  <span>{activeVotingPrompt.label}</span>
                </div>
              ) : (
                <label className="block mb-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2820]/55 mb-1.5">
                    Category for the next round
                  </span>
                  <select
                    value={selectedRoundPromptId}
                    onChange={(e) => setRoundPromptId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#1C2820]/15 bg-white text-sm font-bold text-[#1C2820] focus:outline-none focus:border-[#2D4A3A]"
                  >
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.label} ({publicMemories.filter((m) => m.promptId === p.id).length} photos)
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-3 gap-3 border-y border-[#1C2820]/10 py-4">
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C2820]">
                    {!votingRound.isOpen
                      ? '--:--'
                      : votingRound.secondsLeft === null
                        ? '∞'
                        : `${Math.floor(votingRound.secondsLeft / 60)}:${String(votingRound.secondsLeft % 60).padStart(2, '0')}`}
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

            {/* Winner of the last closed round */}
            {!votingRound.isOpen && lastWinner && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#2D4A3A]/20">
                <img
                  src={lastWinner.url}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover border border-[#1C2820]/10 shrink-0"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-bold text-[#2D4A3A] flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Winner · {lastWinner.votes} votes
                  </div>
                  <div className="text-[#1C2820]/70 font-medium truncate">
                    {lastWinner.caption && `“${lastWinner.caption}” · `}{lastWinner.guestName}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {votingRound.isOpen ? (
                <button
                  disabled={roundBusy}
                  onClick={async () => {
                    setRoundBusy(true);
                    setLastWinner(await closeVotingRound());
                    setRoundBusy(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
                >
                  <Trophy className="w-4 h-4" /> Close & Reveal Winner
                </button>
              ) : (
                <>
                  <select
                    value={roundMinutes}
                    onChange={(e) => setRoundMinutes(Number(e.target.value))}
                    className="px-3 py-3 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] focus:outline-none"
                    title="Round length"
                  >
                    <option value={2}>2 min</option>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={0}>No limit</option>
                  </select>
                  <button
                    disabled={roundBusy}
                    onClick={async () => {
                      setRoundBusy(true);
                      setLastWinner(null);
                      await startVotingRound(selectedRoundPromptId, roundMinutes || null);
                      setRoundBusy(false);
                    }}
                    className="flex-1 min-w-[160px] py-3 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
                  >
                    <Play className="w-4 h-4" /> Start Voting Round
                  </button>
                </>
              )}
              <Link
                href={`/host/${currentEvent.code}/round`}
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
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[#1C2820]/20 text-xs font-semibold"
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

                      {prompts.length > 1 && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Delete “${p.label}”?`,
                              message:
                                count > 0 ? (
                                  <>
                                    <strong className="text-red-600">
                                      All {count} {count === 1 ? 'photo/video' : 'photos and videos'} in this category
                                      will be permanently deleted
                                    </strong>
                                    . This can’t be undone.
                                  </>
                                ) : (
                                  'This category has no photos. Guests won’t be able to pick it anymore.'
                                ),
                              confirmLabel: count > 0 ? `Delete category & ${count} ${count === 1 ? 'photo' : 'photos'}` : 'Delete category',
                            });
                            if (ok) deletePrompt(p.id);
                          }}
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
      {confirmDialog}
    </HostAuthGuard>
  );
}

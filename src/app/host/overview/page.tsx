'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Check,
  Clock,
  SkipForward,
  ExternalLink,
  Pin,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { formatPin } from '@/lib/pin';
import HostAuthGuard from '@/components/HostAuthGuard';
import HostEventHeader from '@/components/HostEventHeader';
import { useConfirm } from '@/components/ConfirmDialog';
import { generateQrDataUrl, downloadQrCode } from '@/lib/qrHelper';

const EMOJI_OPTIONS = ['🌿', '🥂', '✨', '🕰️', '💃', '📸', '🎉', '💐', '🎂', '💌'];

const DURATION_PRESETS = [
  { value: 1, label: '1 min', hint: 'Blitz' },
  { value: 2, label: '2 mins', hint: 'Fast' },
  { value: 3, label: '3 mins', hint: 'Standard' },
  { value: 5, label: '5 mins', hint: 'Recommended' },
  { value: 10, label: '10 mins', hint: 'Extended' },
  { value: 15, label: '15 mins', hint: 'Party' },
  { value: 30, label: '30 mins', hint: 'Dinner' },
  { value: 60, label: '1 hour', hint: 'Long' },
  { value: 0, label: 'No limit', hint: 'Manual' },
];

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
  // Live round controls: chosen duration (minutes, 0 = no limit)
  const [roundMinutes, setRoundMinutes] = useState(5);
  const [roundBusy, setRoundBusy] = useState(false);
  const [roundPromptId, setRoundPromptId] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const durationDropdownRef = useRef<HTMLDivElement>(null);
  const [customMinutesInput, setCustomMinutesInput] = useState('');
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
      if (durationDropdownRef.current && !durationDropdownRef.current.contains(event.target as Node)) {
        setIsDurationDropdownOpen(false);
      }
    }
    if (isTagDropdownOpen || isDurationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTagDropdownOpen, isDurationDropdownOpen]);

  const getDurationLabel = (minutes: number) => {
    if (minutes === 0) return 'No limit';
    if (minutes === 1) return '1 min';
    if (minutes === 60) return '1 hour';
    if (minutes > 60 && minutes % 60 === 0) return `${minutes / 60} hours`;
    return `${minutes} mins`;
  };

  const isCustomDurationActive = !DURATION_PRESETS.some((p) => p.value === roundMinutes);

  const handleApplyCustomDuration = () => {
    const parsed = parseInt(customMinutesInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setRoundMinutes(parsed);
      setIsDurationDropdownOpen(false);
    }
  };

  const activeSlideMemoryPrompt = prompts.find((p) => p.id === activeSlideMemory?.promptId);

  // Full guest link, dynamically adapting to localhost:3000 or production domain.
  const [siteOrigin, setSiteOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
    }
  }, []);
  const guestUrl = siteOrigin ? `${siteOrigin}/user/${currentEvent.code}` : `/user/${currentEvent.code}`;

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

  // Winner of the last closed round, whether the host closed it or its timer ran out
  const lastWinner =
    !votingRound.isOpen && votingRound.closedAt
      ? publicMemories
          .filter((m) => m.promptId === votingRound.promptId && m.votes > 0)
          .reduce<(typeof publicMemories)[number] | null>((best, m) => (!best || m.votes > best.votes ? m : best), null)
      : null;

  // Live round stats for the round's category
  const votingCandidates = publicMemories.filter((m) => m.promptId === roundDisplayPromptId);
  const votingTotal = votingCandidates.reduce((sum, m) => sum + (m.votes || 0), 0);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(guestUrl);
    triggerToast('Event link copied to clipboard', guestUrl);
  };

  const handleDownloadQr = () => {
    downloadQrCode(guestUrl, currentEvent.title);
    triggerToast('Downloading high-res QR code');
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
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
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
          </div>

          <Link
            href="/host/events/new"
            className="px-4 py-2.5 rounded-xl bg-[#2D4A3A] text-white hover:bg-[#1F3628] text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Another Event</span>
          </Link>
        </div>

        {/* First thing a host needs at the event: how guests join, and the live round */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Real Generated QR Code Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-8 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1C2820]">
                  Event QR code & link
                </h2>
                <p className="text-xs text-[#1C2820]/60 font-medium mt-0.5">
                  Scan the QR code to join.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#E9EFEA] text-[#2D4A3A] text-xs font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D4A3A] animate-pulse"></span>
                Live QR code
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Scannable Real QR Graphic */}
              <div className="w-44 h-44 sm:w-52 sm:h-52 bg-white p-2.5 border border-[#1C2820]/15 rounded-2xl shadow-sm shrink-0 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${currentEvent.title}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-20 h-20 text-[#1C2820]/40 animate-pulse" />
                )}
              </div>

              <div className="space-y-3 w-full">
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
                    Guest Code · guests type this to join
                  </div>
                  <div className="text-3xl font-bold text-[#1C2820] tracking-wider tabular-nums mt-0.5">
                    {formatPin(currentEvent.code)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
              <button
                onClick={handleCopyLink}
                className="w-full min-w-0 py-2.5 px-2 sm:px-4 rounded-xl border border-[#1C2820]/15 text-[11px] sm:text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] flex items-center justify-center gap-1.5 sm:gap-2 transition-colors active:scale-[0.99] text-center"
              >
                <Copy className="w-3.5 h-3.5 shrink-0 text-[#2D4A3A]" />
                <span className="leading-tight">Copy Link</span>
              </button>
              <button
                onClick={handleDownloadQr}
                className="w-full min-w-0 py-2.5 px-2 sm:px-4 rounded-xl bg-[#2D4A3A] text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[#1F3628] transition-colors shadow-sm active:scale-[0.99] text-center"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="leading-tight">Download QR code</span>
              </button>
            </div>
          </div>

          {/* Live Contest Round Card */}
          <div className="lg:col-span-5 bg-[#F4F1EA] rounded-3xl p-4 sm:p-8 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between space-y-5 sm:space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1C2820]">
                  Live Photo Contest
                </h2>
                <p className="text-xs text-[#1C2820]/60 font-medium mt-1 leading-relaxed">
                  Start a timed contest on any photo tag. Guests vote for their favourites on their phones, and the winner is revealed on screen.
                </p>
              </div>
              {votingRound.isActive ? (
                <span className="px-2.5 py-1 rounded-full bg-[#2D4A3A] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> LIVE
                </span>
              ) : votingRound.isOpen ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider shrink-0 mt-1">TIME’S UP</span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-[#1C2820]/10 text-[#1C2820]/60 text-[10px] font-bold uppercase tracking-wider shrink-0 mt-1">CLOSED</span>
              )}
            </div>

            <div>
              {votingRound.isOpen ? (
                <div className="text-sm font-bold text-[#1C2820] mb-3 flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0 leading-none">{activeVotingPrompt.icon}</span>
                  <span className="truncate">{activeVotingPrompt.label}</span>
                </div>
              ) : (
                <div className="mb-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2820]/55 mb-1.5">
                    Select a photo tag to start this contest
                  </span>
                  <div ref={tagDropdownRef} className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isTagDropdownOpen}
                      onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                      className={`w-full min-w-0 px-3.5 py-2.5 rounded-xl border bg-white text-left flex items-center justify-between gap-2.5 shadow-sm transition-all focus:outline-none ${
                        isTagDropdownOpen
                          ? 'border-[#2D4A3A] ring-2 ring-[#2D4A3A]/10'
                          : 'border-[#1C2820]/15 hover:border-[#2D4A3A]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-base shrink-0 leading-none">{activeVotingPrompt.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-[#1C2820] leading-snug break-words">
                            {activeVotingPrompt.label}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-[#1C2820]/55 font-medium">
                            {publicMemories.filter((m) => m.promptId === activeVotingPrompt.id).length}{' '}
                            {publicMemories.filter((m) => m.promptId === activeVotingPrompt.id).length === 1 ? 'photo' : 'photos'} uploaded
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#1C2820]/50 transition-transform duration-200 shrink-0 self-center ${
                          isTagDropdownOpen ? 'rotate-180 text-[#2D4A3A]' : ''
                        }`}
                      />
                    </button>

                    {isTagDropdownOpen && (
                      <div
                        role="listbox"
                        className="absolute left-0 right-0 top-full mt-1 w-full max-h-60 overflow-y-auto bg-white rounded-2xl border border-[#1C2820]/15 shadow-xl z-30 p-1.5 space-y-1 overscroll-contain animate-in fade-in zoom-in-95 duration-100"
                      >
                        {prompts.length === 0 ? (
                          <div className="p-3 text-xs text-[#1C2820]/60 text-center">
                            No photo tags available
                          </div>
                        ) : (
                          prompts.map((p) => {
                            const isSelected = p.id === selectedRoundPromptId;
                            const count = publicMemories.filter((m) => m.promptId === p.id).length;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setRoundPromptId(p.id);
                                  setIsTagDropdownOpen(false);
                                }}
                                className={`w-full min-w-0 px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-colors ${
                                  isSelected
                                    ? 'bg-[#2D4A3A]/10 text-[#2D4A3A]'
                                    : 'hover:bg-[#1C2820]/5 text-[#1C2820]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className="text-base shrink-0 leading-none">{p.icon}</span>
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className={`text-xs sm:text-sm leading-snug break-words ${
                                        isSelected ? 'font-bold text-[#2D4A3A]' : 'font-medium text-[#1C2820]'
                                      }`}
                                    >
                                      {p.label}
                                    </div>
                                    <div className="text-[10px] sm:text-[11px] text-[#1C2820]/55 font-medium">
                                      {count} {count === 1 ? 'photo' : 'photos'}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-[#2D4A3A] shrink-0 self-center" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 border-y border-[#1C2820]/10 py-4">
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C2820]">
                    {!votingRound.isOpen
                      ? '--:--'
                      : votingRound.secondsLeft === null
                        ? '∞'
                        : votingRound.secondsLeft >= 3600
                          ? `${Math.floor(votingRound.secondsLeft / 3600)}:${String(Math.floor((votingRound.secondsLeft % 3600) / 60)).padStart(2, '0')}:${String(votingRound.secondsLeft % 60).padStart(2, '0')}`
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

            <div className="space-y-2.5 sm:space-y-3">
              {votingRound.isOpen ? (
                <button
                  disabled={roundBusy}
                  onClick={async () => {
                    setRoundBusy(true);
                    await closeVotingRound();
                    setRoundBusy(false);
                  }}
                  className="h-[46px] w-full px-4 rounded-xl bg-[#2D4A3A] hover:bg-[#1F3628] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-60 whitespace-nowrap"
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span>Close & Reveal Winner</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                  <div ref={durationDropdownRef} className="relative w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isDurationDropdownOpen}
                      onClick={() => setIsDurationDropdownOpen((prev) => !prev)}
                      className={`h-[44px] sm:h-[46px] w-full sm:w-auto px-3.5 rounded-xl border bg-white text-xs font-bold text-[#1C2820] flex items-center justify-between gap-2 shadow-sm transition-all focus:outline-none whitespace-nowrap ${
                        isDurationDropdownOpen
                          ? 'border-[#2D4A3A] ring-2 ring-[#2D4A3A]/10'
                          : 'border-[#1C2820]/15 hover:border-[#2D4A3A]/40'
                      }`}
                      title="Contest duration"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#2D4A3A] shrink-0" />
                        <span className="sm:hidden text-[#1C2820]/60 font-medium">Duration:</span>
                        <span>{getDurationLabel(roundMinutes)}</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#1C2820]/50 transition-transform duration-200 shrink-0 ${
                          isDurationDropdownOpen ? 'rotate-180 text-[#2D4A3A]' : ''
                        }`}
                      />
                    </button>

                    {isDurationDropdownOpen && (
                      <div
                        role="listbox"
                        className="absolute left-0 right-0 sm:right-auto bottom-full mb-1 w-full sm:w-60 bg-white rounded-2xl border border-[#1C2820]/15 shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1C2820]/50">
                          Contest Duration
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-0.5 overscroll-contain pr-0.5">
                          {DURATION_PRESETS.map((item) => {
                            const isSelected = roundMinutes === item.value && !isCustomDurationActive;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setRoundMinutes(item.value);
                                  setIsDurationDropdownOpen(false);
                                }}
                                className={`w-full min-w-0 px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition-colors ${
                                  isSelected
                                    ? 'bg-[#2D4A3A]/10 text-[#2D4A3A] font-bold'
                                    : 'hover:bg-[#1C2820]/5 text-[#1C2820] font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs">{item.value === 0 ? '♾️' : '⏱️'}</span>
                                  <span className="text-xs sm:text-sm">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] text-[#1C2820]/50 font-normal">
                                    {item.hint}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#2D4A3A] shrink-0" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Duration Input */}
                        <div className="border-t border-[#1C2820]/10 pt-2 pb-1 px-1 mt-1">
                          <div className="flex items-center justify-between px-1 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C2820]/60">
                              Custom limit
                            </span>
                            {isCustomDurationActive && (
                              <span className="text-[10px] font-bold text-[#2D4A3A] flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min={1}
                                max={1440}
                                placeholder="15"
                                value={customMinutesInput}
                                onChange={(e) => setCustomMinutesInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleApplyCustomDuration();
                                  }
                                }}
                                className="w-full pl-2.5 pr-8 py-1.5 rounded-lg border border-[#1C2820]/20 bg-white text-xs font-semibold text-[#1C2820] placeholder:text-xs placeholder:font-normal placeholder:text-[#1C2820]/40 focus:outline-none focus:border-[#2D4A3A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#1C2820]/50 font-medium pointer-events-none">
                                mins
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleApplyCustomDuration}
                              className="px-3 py-1.5 rounded-lg bg-[#2D4A3A] text-white text-xs font-bold hover:bg-[#1F3628] transition-colors shrink-0"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    disabled={roundBusy}
                    onClick={async () => {
                      setRoundBusy(true);
                      await startVotingRound(selectedRoundPromptId, roundMinutes || null);
                      setRoundBusy(false);
                    }}
                    className="h-[46px] w-full sm:flex-1 px-4 rounded-xl bg-[#2D4A3A] hover:bg-[#1F3628] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-60 whitespace-nowrap min-w-0"
                  >
                    <Play className="w-4 h-4 fill-current shrink-0" />
                    <span>Start Photo Contest</span>
                  </button>
                </div>
              )}
              <Link
                href={`/host/${currentEvent.code}/round`}
                className="h-[42px] w-full px-4 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] flex items-center justify-center hover:bg-[#FAF8F5] transition-colors whitespace-nowrap shadow-sm active:scale-[0.99]"
              >
                View Standings
              </Link>
            </div>
          </div>
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

        {/* Bottom Row: Tags Manager & Live Spotlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tags Manager for this Event */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-7 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#1C2820]">
                      Photo Tags
                    </h2>
                    <Tag className="w-5 h-5 text-[#2D4A3A] shrink-0" />
                  </div>
                  <p className="text-xs text-[#1C2820]/60 font-medium mt-1 leading-relaxed">
                    Custom tags for {currentEvent.title}. Guests select a tag when uploading to organize your gallery and enter live photo contests.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-[#1C2820]/5 text-[#1C2820]/65 text-[10px] font-bold uppercase tracking-wider">
                    {prompts.length} {prompts.length === 1 ? 'tag' : 'tags'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddPrompt(!showAddPrompt)}
                    className="h-[38px] sm:h-[40px] px-3 sm:px-3.5 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${showAddPrompt ? 'rotate-45' : ''}`} />
                    <span>{showAddPrompt ? 'Cancel' : 'Add Tag'}</span>
                  </button>
                </div>
              </div>

              {/* Add prompt form */}
              {showAddPrompt && (
                <form
                  onSubmit={handleAddPromptSubmit}
                  className="p-3.5 sm:p-4 bg-[#FAF8F5] rounded-2xl border border-[#1C2820]/15 space-y-3 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2820]/50 mb-1.5">
                      Choose an icon
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {EMOJI_OPTIONS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setPromptIcon(em)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all shrink-0 ${
                            promptIcon === em
                              ? 'bg-[#2D4A3A] text-white shadow-sm ring-2 ring-[#2D4A3A]/20 scale-105'
                              : 'bg-white border border-[#1C2820]/10 hover:bg-white/80 active:scale-95'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2820]/50 mb-1.5">
                      Tag Name
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">
                          {promptIcon}
                        </span>
                        <input
                          type="text"
                          value={promptInput}
                          onChange={(e) => setPromptInput(e.target.value)}
                          placeholder="e.g. First Dance"
                          className="w-full pl-9 pr-3.5 h-[44px] rounded-xl border border-[#1C2820]/20 bg-white text-xs sm:text-sm font-medium text-[#1C2820] placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal placeholder:text-[#1C2820]/40 focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/10 shadow-sm transition-all"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPromptInput('');
                            setShowAddPrompt(false);
                          }}
                          className="h-[44px] flex-1 sm:flex-initial px-4 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!promptInput.trim()}
                          className="h-[44px] flex-1 sm:flex-initial px-5 bg-[#2D4A3A] text-white rounded-xl text-xs font-bold hover:bg-[#1F3628] transition-all shadow-sm active:scale-95 disabled:opacity-40"
                        >
                          Save Tag
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#1C2820]/50 font-medium mt-1.5">
                      Suggestions: First Dance, Golden Hour Toasts, Cake Cutting
                    </p>
                  </div>
                </form>
              )}

              {/* Prompts list */}
              <div className="space-y-2.5">
                {prompts.map((p) => {
                  const count = memories.filter((m) => m.promptId === p.id).length;

                  return (
                    <div
                      key={p.id}
                      className="p-3 sm:p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/10 flex items-center justify-between gap-3 transition-colors hover:border-[#1C2820]/20"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#1C2820]/10 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                          {p.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-[#1C2820] break-words leading-snug">
                            {p.label}
                          </div>
                          <div className="text-[11px] text-[#1C2820]/55 font-medium mt-0.5">
                            {count} {count === 1 ? 'photo uploaded' : 'photos uploaded'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {prompts.length > 1 ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: `Delete “${p.label}”?`,
                                message:
                                  count > 0 ? (
                                    <>
                                      <strong className="text-red-600">
                                        All {count} {count === 1 ? 'photo/video' : 'photos and videos'} with this tag
                                        will be permanently deleted
                                      </strong>
                                      . This can’t be undone.
                                    </>
                                  ) : (
                                    'This tag has no photos. Guests won’t be able to pick it anymore.'
                                  ),
                                confirmLabel: count > 0 ? `Delete tag & ${count} ${count === 1 ? 'photo' : 'photos'}` : 'Delete tag',
                              });
                              if (ok) deletePrompt(p.id);
                            }}
                            className="w-9 h-9 rounded-xl hover:bg-red-50 text-[#1C2820]/40 hover:text-red-600 flex items-center justify-center transition-colors active:scale-95"
                            title="Delete tag"
                            aria-label={`Delete ${p.label}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider text-[#1C2820]/40 px-2.5 py-1 rounded-md bg-[#1C2820]/5"
                            title="Every event requires at least one photo tag"
                          >
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Spotlight Manager */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-7 border border-[#1C2820]/10 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#1C2820]">
                      In the Spotlight
                    </h2>
                    <Sparkles className="w-5 h-5 text-[#2D4A3A] shrink-0" />
                  </div>
                  <p className="text-xs text-[#1C2820]/60 font-medium mt-1 leading-relaxed">
                    Feature a special moment on the big screen. Locking a photo pauses the rolling slideshow and pins it across all projector feeds.
                  </p>
                </div>
                {spotlightId ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Pinned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C2820]/5 text-[#1C2820]/65 text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2D4A3A]" />
                    Live Slide
                  </span>
                )}
              </div>
            </div>

            {/* Apple-style Media Preview Card */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[#FAF8F5] border border-[#1C2820]/10 flex items-center gap-3.5 sm:gap-4 transition-all">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-sm border border-[#1C2820]/10 shrink-0 bg-[#1C2820]/5">
                <img
                  src={activeSlideMemory?.url || currentEvent.coverUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {spotlightId && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5 text-amber-300" /> Pinned
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {activeSlideMemoryPrompt && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1C2820]/60 mb-0.5 truncate max-w-full">
                    <span>{activeSlideMemoryPrompt.icon}</span>
                    <span className="truncate">{activeSlideMemoryPrompt.label}</span>
                  </div>
                )}
                <div className="font-serif text-sm sm:text-base font-bold text-[#1C2820] line-clamp-2 leading-snug">
                  {activeSlideMemory?.caption ? `“${activeSlideMemory.caption}”` : '“Moments to treasure”'}
                </div>
                <div className="text-[11px] sm:text-xs text-[#1C2820]/60 mt-1 font-medium truncate">
                  {activeSlideMemory?.guestName ? `by ${activeSlideMemory.guestName}` : 'Welcome moment'} · {activeSlideMemory?.votes || 0}{' '}
                  {activeSlideMemory?.votes === 1 ? 'love' : 'loves'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={publicMemories.length <= 1}
                  onClick={cycleNextSlide}
                  className="h-[46px] px-3.5 sm:px-4 rounded-xl border border-[#1C2820]/15 bg-white text-xs font-bold text-[#1C2820] hover:bg-[#FAF8F5] transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                  title="Show the next photo in the slideshow"
                >
                  <SkipForward className="w-3.5 h-3.5 text-[#1C2820]/70" />
                  <span>Next Photo</span>
                </button>

                <button
                  type="button"
                  disabled={publicMemories.length === 0 || !activeSlideMemory || activeSlideMemory.id === 'empty'}
                  onClick={() => (spotlightId ? resumeSlideshow() : toggleSpotlight(activeSlideMemory.id))}
                  className={`h-[46px] flex-1 px-4 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 ${
                    spotlightId
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-[#2D4A3A] hover:bg-[#1F3628] text-white'
                  }`}
                >
                  {spotlightId ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Resume Slideshow</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-3.5 h-3.5" />
                      <span>Lock on Screen</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link
                  href={`/host/${currentEvent.code}/projector`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D4A3A] hover:text-[#1F3628] hover:underline transition-colors py-0.5"
                >
                  <span>Open Live Projector Screen</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {confirmDialog}
    </HostAuthGuard>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Trash2,
  Search,
  CheckSquare,
  X,
  Check,
  Lock,
  Pin,
  Film,
  Eye,
  EyeOff,
  AlertCircle,
  Filter,
  Play,
  Upload,
  ChevronDown,
  Layers,
  Info,
  RotateCcw,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import HostAuthGuard from '@/components/HostAuthGuard';
import HostEventHeader from '@/components/HostEventHeader';
import { useConfirm } from '@/components/ConfirmDialog';
import HostUploadDialog from '@/components/HostUploadDialog';
import { useSearchPlaceholder } from '@/hooks/useSearchPlaceholder';

export default function HostPhotosPage() {
  const {
    memories,
    prompts,
    getPrompt,
    spotlightId,
    toggleSpotlight,
    resumeSlideshow,
    togglePrivacy,
    deleteMemory,
    deleteMultipleMemories,
    downloadSingle,
    exportSelectedZip,
  } = useEvent();

  const { confirm, dialog: confirmDialog } = useConfirm();
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'private'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const searchPlaceholder = useSearchPlaceholder();

  // Close tag dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    }
    if (isTagDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTagDropdownOpen]);

  const totalCount = memories.length;
  const publicCount = memories.filter((m) => !m.isPrivate).length;
  const privateCount = memories.filter((m) => m.isPrivate).length;

  const VISIBILITY_TABS = [
    {
      id: 'all' as const,
      label: 'All Memories',
      mobileLabel: 'All',
      count: totalCount,
      icon: Layers,
      description: 'Complete archive of every photo & video uploaded by guests and hosts.',
    },
    {
      id: 'live' as const,
      label: 'Visible in Gallery',
      mobileLabel: 'Public',
      count: publicCount,
      icon: Eye,
      description: 'Public memories visible on guests’ phones and playing on the live venue projector.',
    },
    {
      id: 'private' as const,
      label: 'Private Vault',
      mobileLabel: 'Private',
      count: privateCount,
      icon: Lock,
      description: 'Host-only memories — hidden from live screens, guests, and the photo contest.',
    },
  ];

  const activeTabObj = VISIBILITY_TABS.find((t) => t.id === filterTab) || VISIBILITY_TABS[0];
  const selectedPrompt = prompts.find((p) => p.id === categoryFilter);

  // Host upload window (choose files, category, caption)
  const [uploadOpen, setUploadOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredMemories = memories.filter((item) => {
    if (filterTab === 'live' && item.isPrivate) return false;
    if (filterTab === 'private' && !item.isPrivate) return false;

    if (categoryFilter !== 'all' && item.promptId !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.caption.toLowerCase().includes(q) ||
        item.guestName.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMemories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMemories.map((m) => m.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} ${selectedIds.length === 1 ? 'photo' : 'photos'}?`,
      message: 'They will be removed from the gallery, slideshow and projector for everyone. This can’t be undone.',
      confirmLabel: `Delete ${selectedIds.length}`,
    });
    if (ok) {
      deleteMultipleMemories(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.length === 0) return;
    await exportSelectedZip(selectedIds);
  };

  return (
    <HostAuthGuard>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
        <HostEventHeader active="photos" />

      {/* Page Title + host upload */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#1C2820] leading-none">
            All the love, in one place.
          </h1>
          <p className="text-sm text-[#1C2820]/65 mt-2 font-medium">
            Review guest uploads, add your own photos, keep favourites private, and download high-res files.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="self-start lg:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload photos</span>
        </button>
      </div>

      {/* Pinned spotlight banner */}
      {spotlightId && (() => {
        const pinned = memories.find((m) => m.id === spotlightId);
        return (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#E9EFEA] border border-[#2D4A3A]/20">
            <div className="flex items-center gap-3 min-w-0">
              {pinned && (
                <img
                  src={pinned.url}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover border border-[#1C2820]/10 shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#2D4A3A] flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5" fill="currentColor" />
                  <span>Pinned on all live screens</span>
                </div>
                <div className="text-xs text-[#1C2820]/70 font-medium truncate">
                  {pinned ? `${pinned.caption ? `“${pinned.caption}” · ` : ''}${pinned.guestName}` : 'The slideshow is paused on this photo.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={resumeSlideshow}
              className="px-4 py-2.5 rounded-xl bg-[#2D4A3A] hover:bg-[#1F3628] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Slideshow</span>
            </button>
          </div>
        );
      })()}

      {/* Visibility Segmented Control Bar (Apple HIG Segmented Navigation) */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Apple-style Segmented Control - immune to overflow on 320px screens */}
          <div
            role="tablist"
            aria-label="Photo visibility filter"
            className="w-full sm:w-auto inline-flex p-1 bg-[#1C2820]/5 rounded-2xl border border-[#1C2820]/10 gap-1 shadow-inner max-w-full overflow-hidden"
          >
            {VISIBILITY_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilterTab(tab.id)}
                  className={`flex-1 sm:flex-initial min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all min-h-[40px] sm:min-h-[42px] select-none ${
                    isActive
                      ? 'bg-white text-[#1C2820] shadow-sm border border-[#1C2820]/10'
                      : 'text-[#1C2820]/65 hover:text-[#1C2820] hover:bg-black/5'
                  }`}
                >
                  <TabIcon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive
                        ? tab.id === 'private'
                          ? 'text-amber-600'
                          : 'text-[#2D4A3A]'
                        : 'opacity-70'
                    }`}
                  />
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                  <span className="sm:hidden truncate">{tab.mobileLabel}</span>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-[#E9EFEA] text-[#2D4A3A]'
                        : 'bg-[#1C2820]/5 text-[#1C2820]/60'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Context helper pill (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#1C2820]/70 bg-[#FAF8F5] border border-[#1C2820]/10 px-3.5 py-2 rounded-xl">
            <Info className="w-3.5 h-3.5 text-[#2D4A3A] shrink-0" />
            <span>{activeTabObj.description}</span>
          </div>
        </div>

        {/* Quick Context helper pill (Mobile / Tablet) */}
        <div className="flex lg:hidden items-center gap-2 text-xs text-[#1C2820]/70 bg-[#FAF8F5] border border-[#1C2820]/10 px-3 py-2 rounded-xl">
          <Info className="w-3.5 h-3.5 text-[#2D4A3A] shrink-0" />
          <span className="leading-snug">{activeTabObj.description}</span>
        </div>
      </div>

      {/* Search & Actions Bar (Full width Search with standardized controls beneath) */}
      <div className="space-y-3">
        {/* Full-width Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#1C2820]/40 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-12 pl-11 sm:pl-12 pr-10 rounded-2xl border border-[#1C2820]/15 bg-white text-xs sm:text-sm font-medium text-[#1C2820] placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal placeholder:text-[#1C2820]/40 focus:outline-none focus:ring-2 focus:ring-[#2D4A3A]/20 focus:border-[#2D4A3A] shadow-sm transition-all [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1C2820]/10 hover:bg-[#1C2820]/20 text-[#1C2820]/70 flex items-center justify-center transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls row: Tag Filter & Select All */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left on desktop, Top on mobile: Dropdown & Mobile Select All */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto min-w-0">
            {/* Custom Standardized Photo Tag Dropdown - button width matches popover options 1:1 on desktop, stacked two-line layout without truncation */}
            <div ref={tagDropdownRef} className="relative flex-1 sm:flex-initial sm:w-72 min-w-0">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isTagDropdownOpen}
                onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border bg-white text-left flex items-center justify-between gap-2.5 shadow-sm transition-all focus:outline-none ${
                  isTagDropdownOpen
                    ? 'border-[#2D4A3A] ring-2 ring-[#2D4A3A]/10'
                    : 'border-[#1C2820]/15 hover:border-[#2D4A3A]/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-base shrink-0 leading-none">
                    {categoryFilter === 'all' ? '🏷️' : selectedPrompt?.icon || '🏷️'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-[#1C2820] leading-snug break-words">
                      {categoryFilter === 'all' ? 'All Photo Tags' : selectedPrompt?.label}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[#1C2820]/55 font-medium">
                      {categoryFilter === 'all'
                        ? `${memories.length} ${memories.length === 1 ? 'photo' : 'photos'} uploaded`
                        : `${memories.filter((m) => m.promptId === selectedPrompt?.id).length} ${memories.filter((m) => m.promptId === selectedPrompt?.id).length === 1 ? 'photo' : 'photos'} uploaded`}
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
                  className="absolute left-0 right-0 top-full mt-1.5 w-full bg-white/95 backdrop-blur-xl border border-[#1C2820]/15 rounded-2xl shadow-xl z-30 p-1.5 space-y-1 max-h-72 overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* Option: All tags */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={categoryFilter === 'all'}
                    onClick={() => {
                      setCategoryFilter('all');
                      setIsTagDropdownOpen(false);
                    }}
                    className={`w-full min-w-0 px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-[#2D4A3A]/10 text-[#2D4A3A]'
                        : 'hover:bg-[#1C2820]/5 text-[#1C2820]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-base shrink-0 leading-none">🏷️</span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs sm:text-sm leading-snug break-words ${
                            categoryFilter === 'all' ? 'font-bold text-[#2D4A3A]' : 'font-medium text-[#1C2820]'
                          }`}
                        >
                          All Photo Tags
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-[#1C2820]/55 font-medium">
                          {memories.length} {memories.length === 1 ? 'photo' : 'photos'} uploaded
                        </div>
                      </div>
                    </div>
                    {categoryFilter === 'all' && (
                      <Check className="w-4 h-4 text-[#2D4A3A] shrink-0 self-center" />
                    )}
                  </button>

                  {/* Prompts list */}
                  {prompts.length === 0 ? (
                    <div className="p-3 text-xs text-[#1C2820]/60 text-center">
                      No photo tags available
                    </div>
                  ) : (
                    prompts.map((p) => {
                      const isSelected = categoryFilter === p.id;
                      const count = memories.filter((m) => m.promptId === p.id).length;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setCategoryFilter(p.id);
                            setIsTagDropdownOpen(false);
                          }}
                          className={`w-full min-w-0 px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-colors ${
                            isSelected
                              ? 'bg-[#2D4A3A]/10 text-[#2D4A3A]'
                              : 'hover:bg-[#1C2820]/5 text-[#1C2820]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-base shrink-0 leading-none">{p.icon || '🏷️'}</span>
                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-xs sm:text-sm leading-snug break-words ${
                                  isSelected ? 'font-bold text-[#2D4A3A]' : 'font-medium text-[#1C2820]'
                                }`}
                              >
                                {p.label}
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-[#1C2820]/55 font-medium">
                                {count} {count === 1 ? 'photo' : 'photos'} uploaded
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

            {/* Select All on mobile right next to dropdown */}
            <button
              type="button"
              onClick={handleSelectAll}
              className="sm:hidden min-h-[46px] px-3.5 rounded-xl border border-[#1C2820]/15 bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#1C2820]/75 hover:text-[#1C2820] flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 whitespace-nowrap active:scale-95"
            >
              <CheckSquare className="w-4 h-4 text-[#2D4A3A]" />
              <span>
                {selectedIds.length === filteredMemories.length && filteredMemories.length > 0
                  ? 'Deselect'
                  : 'Select All'}
              </span>
            </button>
          </div>

          {/* Desktop Select All and Results Count */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <span className="text-xs font-medium text-[#1C2820]/60">
              Showing <strong className="text-[#1C2820] font-bold">{filteredMemories.length}</strong> of{' '}
              {memories.length} {memories.length === 1 ? 'photo' : 'photos'}
              {searchQuery.trim() && <span> for &ldquo;{searchQuery.trim()}&rdquo;</span>}
            </span>

            {(categoryFilter !== 'all' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
                className="text-[11px] font-bold text-[#2D4A3A] hover:underline flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSelectAll}
              className="hidden sm:flex min-h-[46px] px-3.5 rounded-xl border border-[#1C2820]/15 bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#1C2820]/75 hover:text-[#1C2820] items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95"
            >
              <CheckSquare className="w-4 h-4 text-[#2D4A3A]" />
              <span>
                {selectedIds.length === filteredMemories.length && filteredMemories.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#E9EFEA] border border-[#2D4A3A]/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#2D4A3A] text-white flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </div>
            <span className="text-xs font-bold text-[#1C2820]">
              photos selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold">
            <button
              onClick={handleDownloadSelected}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#2D4A3A]/20 text-[#1C2820] hover:bg-[#FAF8F5] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Selected (ZIP)</span>
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-3.5 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-[#1C2820]/60 hover:text-[#1C2820]"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Moderation Photos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMemories.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const promptObj = getPrompt(item.promptId);
          const isSpotlighted = spotlightId === item.id;

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#1C2820]/10 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              {/* Image / Video Preview & Overlay */}
              <div
                className="relative aspect-[4/3] bg-black/5 cursor-pointer overflow-hidden"
                onClick={() => toggleSelect(item.id)}
              >
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}

                {/* Selection Checkbox */}
                <div
                  className={`absolute top-3 left-3 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-[#2D4A3A] border-[#2D4A3A] shadow-md'
                      : 'bg-black/40 border-white/60 hover:bg-black/60'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white stroke-[3px]" />}
                </div>

                {/* Status Badge */}
                <div
                  className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-md ${
                    item.isPrivate
                      ? 'bg-[#182B24] text-white'
                      : isSpotlighted
                      ? 'bg-[#2D4A3A] text-white'
                      : 'bg-white/90 backdrop-blur-md text-[#1C2820]'
                  }`}
                >
                  {item.isPrivate ? (
                    <Lock className="w-3 h-3 text-amber-300" />
                  ) : isSpotlighted ? (
                    <Pin className="w-3 h-3 text-amber-300" fill="currentColor" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2D4A3A]"></div>
                  )}
                  <span>
                    {item.isPrivate
                      ? 'Private Vault'
                      : isSpotlighted
                      ? 'Pinned'
                      : 'Visible in Gallery'}
                  </span>
                </div>

                {item.type === 'video' && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                    <Film className="w-3 h-3 text-[#9BC4A8]" />
                    <span>Video · {item.duration || '0:24'}</span>
                  </div>
                )}
              </div>

              {/* Caption & Metadata */}
              <div className="p-4 space-y-2 flex-1">
                <p className="font-bold text-xs sm:text-sm text-[#1C2820] line-clamp-2 leading-snug">
                  {item.caption && `“${item.caption}”`}
                </p>
                <div className="flex items-center justify-between text-xs text-[#1C2820]/60 font-medium">
                  <span className="font-bold text-[#1C2820]">{item.guestName}</span>
                  <span>{item.timestamp}</span>
                </div>
                <div className="text-[11px] text-[#2D4A3A] font-semibold flex items-center gap-1">
                  <span>{promptObj.icon}</span>
                  <span>{promptObj.label}</span>
                </div>
              </div>

              {/* Moderation Actions Bar */}
              <div className="px-4 py-3 bg-[#FAF8F5] border-t border-[#1C2820]/10 flex items-center justify-between text-xs">
                {/* Privacy Toggle */}
                <button
                  type="button"
                  onClick={() => togglePrivacy(item.id)}
                  className={`flex items-center gap-1 font-semibold transition-colors ${
                    item.isPrivate
                      ? 'text-[#2D4A3A] hover:underline'
                      : 'text-[#1C2820]/65 hover:text-[#1C2820]'
                  }`}
                >
                  {item.isPrivate ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Make Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Make Private</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  {/* Spotlight button */}
                  {!item.isPrivate && (
                    <button
                      type="button"
                      onClick={() => toggleSpotlight(item.id)}
                      className={`p-1.5 rounded-lg hover:bg-black/5 transition-colors ${
                        isSpotlighted ? 'text-[#2D4A3A]' : 'text-[#1C2820]/60'
                      }`}
                      title={isSpotlighted ? 'Unpin from live screens' : 'Pin to live screens'}
                      aria-label={isSpotlighted ? 'Unpin from live screens' : 'Pin to live screens'}
                    >
                      <Pin className="w-4 h-4" fill={isSpotlighted ? "currentColor" : "none"} />
                    </button>
                  )}

                  {/* Direct download single photo */}
                  <button
                    type="button"
                    onClick={() => downloadSingle(item)}
                    className="p-1.5 rounded-lg text-[#1C2820]/60 hover:text-[#1C2820] hover:bg-black/5 transition-colors"
                    title="Download this photo"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Delete picture */}
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Delete photo by ${item.guestName}?`,
                        message: `${item.caption ? `“${item.caption}”` : 'This photo'} will be removed for everyone. This can’t be undone.`,
                      });
                      if (ok) {
                        deleteMemory(item.id);
                        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                      }
                    }}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="Delete photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMemories.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#1C2820]/10 text-[#1C2820]/60 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-[#1C2820]/40" />
          <p className="font-serif text-xl font-medium text-[#1C2820]">
            No photos found in this filter
          </p>
          <p className="text-xs max-w-sm mx-auto">
            Adjust your search query, photo tag, or visibility tab to view more memories.
          </p>
          {(categoryFilter !== 'all' || searchQuery.trim() || filterTab !== 'all') && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setSearchQuery('');
                  setFilterTab('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold hover:bg-[#1F3628] shadow-sm transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Show All Memories</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    {confirmDialog}
    <HostUploadDialog
      open={uploadOpen}
      onClose={() => setUploadOpen(false)}
      defaultPromptId={categoryFilter !== 'all' ? categoryFilter : undefined}
    />
    </HostAuthGuard>
  );
}

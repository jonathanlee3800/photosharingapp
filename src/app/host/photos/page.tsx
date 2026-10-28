'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Trash2,
  Search,
  CheckSquare,
  X,
  Check,
  Lock,
  Sparkles,
  Film,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  Filter,
  ArrowLeft,
  Play,
} from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import HostAuthGuard from '@/components/HostAuthGuard';

export default function HostPhotosPage() {
  const {
    currentEvent,
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
    setIsZipModalOpen,
  } = useEvent();

  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'private' | 'review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredMemories = memories.filter((item) => {
    if (filterTab === 'live' && item.isPrivate) return false;
    if (filterTab === 'private' && !item.isPrivate) return false;
    if (filterTab === 'review') {
      if (!item.isPrivate && item.votes > 25) return false;
    }

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

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (
      window.confirm(
        `Are you sure you want to permanently delete ${selectedIds.length} photo(s)?`
      )
    ) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 sm:pb-12">
        {/* Sub-navigation bar for Host */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2820]/10 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href={`/host/${currentEvent.id}`}
              className="px-4 py-2 rounded-xl text-[#1C2820]/70 hover:text-[#1C2820] hover:bg-black/5 text-xs font-semibold transition-colors"
            >
              Overview
            </Link>
            <Link
              href={`/host/${currentEvent.id}/photos`}
              className="px-4 py-2 rounded-xl bg-[#2D4A3A] text-white text-xs font-bold shadow-sm"
            >
              Photos & Videos ({memories.length})
            </Link>
            <Link
              href="/host/events"
              className="px-4 py-2 rounded-xl text-[#1C2820]/70 hover:text-[#1C2820] hover:bg-black/5 text-xs font-semibold transition-colors"
            >
              All Events
            </Link>
          </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/user/${currentEvent.id}/projector`}
            target="_blank"
            className="px-4 py-2 rounded-xl border border-[#1C2820]/20 text-xs font-bold text-[#1C2820] hover:bg-[#E9EFEA] flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#2D4A3A]" />
            <span>Open Event Screen</span>
          </Link>
          <button
            onClick={() => setIsZipModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All ZIP ({memories.length})</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/host/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C2820]/60 hover:text-[#2D4A3A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Events</span>
        </Link>
        <span className="text-xs text-[#1C2820]/30">/</span>
        <Link
          href={`/host/${currentEvent.id}`}
          className="text-xs font-semibold text-[#1C2820]/60 hover:text-[#2D4A3A] transition-colors"
        >
          Overview ({currentEvent.title})
        </Link>
        <span className="text-xs text-[#1C2820]/30">/</span>
        <span className="text-xs font-bold text-[#2D4A3A]">Photos & Vault</span>
      </div>

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#1C2820] leading-none">
            All the love, in one place.
          </h1>
          <p className="text-sm text-[#1C2820]/65 mt-2 font-medium">
            Review guest uploads, keep photos private in your vault, delete unwanted pictures, and download high-res files.
          </p>
        </div>
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
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pinned on all live screens</span>
                </div>
                <div className="text-xs text-[#1C2820]/70 font-medium truncate">
                  {pinned ? `“${pinned.caption}” · ${pinned.guestName}` : 'The slideshow is paused on this photo.'}
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-6 border-b border-[#1C2820]/10 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All memories', count: memories.length },
          {
            id: 'live',
            label: 'Live in gallery',
            count: memories.filter((m) => !m.isPrivate).length,
          },
          {
            id: 'private',
            label: 'Private vault',
            count: memories.filter((m) => m.isPrivate).length,
          },
          {
            id: 'review',
            label: 'Needs review',
            count: memories.filter((m) => m.isPrivate || m.votes <= 25).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`pb-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              filterTab === tab.id
                ? 'border-[#2D4A3A] text-[#2D4A3A]'
                : 'border-transparent text-[#1C2820]/60 hover:text-[#1C2820]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                filterTab === tab.id
                  ? 'bg-[#E9EFEA] text-[#2D4A3A]'
                  : 'bg-[#1C2820]/5 text-[#1C2820]/60'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1C2820]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captions or guests..."
              className="w-full sm:w-72 pl-10 pr-4 py-2.5 rounded-xl border border-[#1C2820]/15 text-xs font-semibold bg-white focus:outline-none focus:border-[#2D4A3A]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#1C2820]/15 text-xs font-semibold bg-white text-[#1C2820] focus:outline-none focus:border-[#2D4A3A]"
          >
            <option value="all">All categories</option>
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSelectAll}
          className="text-xs font-bold text-[#1C2820]/75 hover:text-[#1C2820] flex items-center gap-1.5 self-end sm:self-auto"
        >
          <CheckSquare className="w-4 h-4 text-[#2D4A3A]" />
          <span>
            {selectedIds.length === filteredMemories.length
              ? 'Deselect All'
              : 'Select All'}
          </span>
        </button>
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

          <div className="flex items-center gap-4 text-xs font-bold">
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
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2D4A3A]"></div>
                  )}
                  <span>
                    {item.isPrivate
                      ? 'Private Vault'
                      : isSpotlighted
                      ? 'Spotlighted'
                      : 'Live Public'}
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
                  “{item.caption}”
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
                      title={isSpotlighted ? 'Release Spotlight' : 'Spotlight on live screens'}
                    >
                      <Sparkles className="w-4 h-4" />
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
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete photo by ${item.guestName}?\n"${item.caption}"`
                        )
                      ) {
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
        <div className="p-12 text-center bg-white rounded-3xl border border-[#1C2820]/10 text-[#1C2820]/60 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-[#1C2820]/40" />
          <p className="font-serif text-xl font-medium text-[#1C2820]">
            No photos found in this filter
          </p>
          <p className="text-xs">Adjust your search or filter tab to view more photos.</p>
        </div>
      )}
    </div>
    </HostAuthGuard>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Video,
  Upload,
  Check,
  Lock,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  X,
  User,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { SAMPLE_PRESETS } from '@/lib/initialData';
import { useEvent } from '@/context/EventContext';
import { processUploadedImage, isValidImageFile, isHeicFile } from '@/lib/imageProcessor';

interface SelectedMediaFile {
  url: string;
  name: string;
  type: 'photo' | 'video';
  isPendingCompression?: boolean;
}

export default function UploadPage() {
  const router = useRouter();
  const {
    currentEvent,
    guestName,
    prompts,
    addMemory,
    triggerToast,
  } = useEvent();

  const [authorInput, setAuthorInput] = useState(guestName || '');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedMediaFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caption, setCaption] = useState('');
  const [promptId, setPromptId] = useState(prompts[0]?.id || 'fav-chapter');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (guestName && !authorInput) {
      setAuthorInput(guestName);
    }
  }, [guestName]);

  // Ensure promptId always belongs to the active event's prompts
  useEffect(() => {
    if (prompts.length > 0 && !prompts.some((p) => p.id === promptId)) {
      setPromptId(prompts[0].id);
    }
  }, [prompts, promptId]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so user can pick the same file again if desired
    e.target.value = '';

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);

    if (isVideo) {
      if (file.size > 15 * 1024 * 1024) {
        triggerToast(
          'Video file is too large',
          'Please select a clip under 15 MB for quick sharing'
        );
        return;
      }

      setIsProcessing(true);
      const instantVideoUrl = URL.createObjectURL(file);
      setSelectedFile({
        url: instantVideoUrl,
        name: file.name,
        type: 'video',
      });
      setMediaType('video');
      setSelectedPreset(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setSelectedFile({
            url: result,
            name: file.name,
            type: 'video',
          });
        }
        setIsProcessing(false);
      };
      reader.onerror = () => setIsProcessing(false);
      reader.readAsDataURL(file);
      return;
    }

    if (!isValidImageFile(file)) {
      triggerToast('Please select a valid image file (JPG, PNG, HEIC, WebP)');
      return;
    }

    const isHeic = isHeicFile(file);
    setIsProcessing(true);
    setSelectedPreset(null);

    // If standard JPEG/PNG, display instant preview immediately (0ms)
    if (!isHeic) {
      const instantUrl = URL.createObjectURL(file);
      setSelectedFile({
        url: instantUrl,
        name: file.name,
        type: 'photo',
        isPendingCompression: true,
      });
      setMediaType('photo');
      triggerToast('Photo loaded!', file.name);
    } else {
      triggerToast('Converting iPhone HEIC photo...', file.name);
    }

    // Process & convert HEIC (via server libheif) and compress to JPEG DataURL
    try {
      const processed = await processUploadedImage(file, {
        maxDimension: 1400,
        quality: 0.85,
      });

      setSelectedFile({
        url: processed.dataUrl,
        name: processed.fileName,
        type: 'photo',
        isPendingCompression: false,
      });
      setMediaType('photo');
      triggerToast('Photo ready to post!', processed.fileName);
    } catch (err: any) {
      console.warn('Image processing fallback:', err);
      triggerToast('Could not convert HEIC photo', 'Please try selecting another photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsePreset = () => {
    const nextIdx = selectedPreset === null ? 0 : (selectedPreset + 1) % SAMPLE_PRESETS.length;
    setSelectedPreset(nextIdx);
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile && selectedPreset === null) {
      triggerToast(
        'Photo required',
        'Please tap "Take Photo or Choose from Library" to pick your memory'
      );
      return;
    }

    const finalAuthor = authorInput.trim() || guestName || 'Wedding Guest';
    setIsSubmitting(true);

    try {
      if (selectedFile) {
        await addMemory({
          type: selectedFile.type,
          url: selectedFile.url,
          caption:
            caption.trim() ||
            `Wishing ${currentEvent.title} a lifetime of quiet mornings and loud celebrations!`,
          promptId,
          isPrivate,
          duration: selectedFile.type === 'video' ? '0:24' : undefined,
          guestName: finalAuthor,
        });
      } else if (selectedPreset !== null) {
        const presetUrl = (SAMPLE_PRESETS[selectedPreset] || SAMPLE_PRESETS[0]).url;
        await addMemory({
          type: mediaType,
          url: presetUrl,
          caption:
            caption.trim() ||
            `Wishing ${currentEvent.title} a lifetime of quiet mornings and loud celebrations!`,
          promptId,
          isPrivate,
          duration: mediaType === 'video' ? '0:24' : undefined,
          guestName: finalAuthor,
        });
      }

      router.push(`/user/${currentEvent.id}/gallery`);
    } catch (err) {
      console.error('Error posting memory:', err);
      triggerToast('Could not post memory', 'Please check your connection and try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDisplayUrl = selectedFile
    ? selectedFile.url
    : selectedPreset !== null
    ? SAMPLE_PRESETS[selectedPreset].url
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 pb-28 sm:pb-12">
      {/* Top back button */}
      <Link
        href={`/user/${currentEvent.id}/gallery`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C2820]/60 hover:text-[#1C2820] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Gallery</span>
      </Link>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1C2820]/10 shadow-lg space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2D4A3A] bg-[#E9EFEA] px-3 py-1 rounded-full">
            {currentEvent.title} · Share a Memory
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#1C2820] mt-2">
            A moment or story.
          </h1>
          <p className="text-xs sm:text-sm text-[#1C2820]/65 font-medium mt-1">
            Add your photo or video and attach a personal well-wish for the live album.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo / Video Pill Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#FAF8F5] p-1.5 rounded-2xl border border-[#1C2820]/10">
            <button
              type="button"
              onClick={() => {
                setMediaType('photo');
                if (selectedFile?.type === 'video') setSelectedFile(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                mediaType === 'photo'
                  ? 'bg-[#2D4A3A] text-white shadow-sm'
                  : 'text-[#1C2820]/60 hover:text-[#1C2820]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaType('video');
                if (selectedFile?.type === 'photo') setSelectedFile(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                mediaType === 'video'
                  ? 'bg-[#2D4A3A] text-white shadow-sm'
                  : 'text-[#1C2820]/60 hover:text-[#1C2820]'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video Toast</span>
            </button>
          </div>

          {/* Hidden Real File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === 'video' ? 'video/*' : 'image/*,.heic,.heif'}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Media Preview & Trigger Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Left: Preview Box */}
            <div className="relative aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden border border-[#1C2820]/15 shadow-inner bg-[#FAF8F5] flex items-center justify-center">
              {activeDisplayUrl ? (
                <>
                  {mediaType === 'video' || selectedFile?.type === 'video' ? (
                    <video
                      src={activeDisplayUrl}
                      controls
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={activeDisplayUrl}
                      alt="Upload preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.warn('Image preview load error');
                      }}
                    />
                  )}

                  {/* Active Indicator Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                    <Check className="w-3.5 h-3.5 text-[#9BC4A8] stroke-[3]" />
                    <span>{selectedFile ? 'Active Photo' : 'Demo Sample'}</span>
                  </div>

                  {/* File Name Tag */}
                  {selectedFile && (
                    <span className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold truncate shadow-md">
                      {selectedFile.name}
                    </span>
                  )}
                </>
              ) : (
                /* Empty Placeholder State */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer p-6 text-center space-y-2 flex flex-col items-center justify-center text-[#1C2820]/60 hover:text-[#2D4A3A] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-[#E9EFEA] flex items-center justify-center text-[#2D4A3A] shadow-sm">
                    {mediaType === 'video' ? (
                      <Video className="w-6 h-6" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>
                  <div className="font-bold text-xs text-[#1C2820]">
                    No {mediaType === 'video' ? 'video' : 'photo'} selected yet
                  </div>
                  <div className="text-[10px] text-[#1C2820]/50 font-medium">
                    Tap the button on the right to choose from your library
                  </div>
                </div>
              )}

              {/* Processing Loader Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-[#9BC4A8]" />
                  <span className="text-xs font-bold">
                    Optimizing photo for instant loading...
                  </span>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col gap-3">
              {/* Primary Camera / File Upload CTA */}
              <button
                type="button"
                disabled={isProcessing || isSubmitting}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-5 px-4 rounded-2xl border-2 border-dashed border-[#2D4A3A] bg-[#E9EFEA]/60 hover:bg-[#E9EFEA] disabled:opacity-50 text-[#1C2820] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.99] text-center shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center shadow-sm">
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs font-bold mt-1">
                  {isProcessing
                    ? 'Processing Image...'
                    : mediaType === 'video'
                    ? selectedFile
                      ? 'Choose Different Video'
                      : 'Choose Video File'
                    : selectedFile
                    ? 'Choose a Different Photo'
                    : 'Take Photo or Choose from Library'}
                </span>
                <span className="text-[10px] text-[#1C2820]/60 font-medium">
                  {selectedFile
                    ? 'Ready to post · Tap to replace'
                    : 'Supports iPhone HEIC, JPG, PNG & Android camera roll'}
                </span>
              </button>

              {/* Reset / Demo Preset Options */}
              {selectedFile ? (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="w-full py-2.5 px-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove selected photo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUsePreset}
                  className="w-full py-2.5 px-3 rounded-xl border border-[#1C2820]/15 hover:bg-black/5 text-[#1C2820]/75 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {selectedPreset !== null
                      ? `Switch demo sample (${selectedPreset + 1}/${SAMPLE_PRESETS.length})`
                      : 'Or test with a demo photo'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Guest Name (Editable Inline) */}
          <div>
            <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide mb-2">
              Your Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#2D4A3A] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                placeholder="e.g. Clara Vance"
                className="w-full rounded-2xl border border-[#1C2820]/20 pl-10 pr-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Well-Wish / Caption */}
          <div>
            <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide mb-2">
              Well-Wish or Caption
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={`Write a heartfelt toast, memory, or laugh for ${currentEvent.title}...`}
              className="w-full rounded-2xl border border-[#1C2820]/20 p-4 text-sm font-medium focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/20 transition-all resize-none shadow-sm"
            />
          </div>

          {/* Category / Prompt Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#1C2820] uppercase tracking-wide">
              Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {prompts.map((p) => {
                const active = promptId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPromptId(p.id)}
                    className={`p-3.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      active
                        ? 'border-[#2D4A3A] bg-[#E9EFEA] text-[#1C2820] shadow-sm'
                        : 'border-[#1C2820]/15 hover:border-[#1C2820]/40 text-[#1C2820]/70'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{p.icon}</span>
                      <span>{p.label}</span>
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        active
                          ? 'border-[#2D4A3A] bg-[#2D4A3A] text-white'
                          : 'border-[#1C2820]/30'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Couple's Private Vault Toggle */}
          <div
            onClick={() => setIsPrivate(!isPrivate)}
            className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
              isPrivate
                ? 'bg-[#E9EFEA] border-[#2D4A3A]'
                : 'bg-white border-[#1C2820]/15 hover:border-[#1C2820]/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isPrivate
                    ? 'bg-[#2D4A3A] text-white'
                    : 'bg-[#FAF8F5] text-[#1C2820]/60'
                }`}
              >
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#1C2820]">
                  Private for Couple Only
                </div>
                <div className="text-[11px] text-[#1C2820]/60 font-medium">
                  Visible only in the couple’s private vault · Kept off public screens
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={() => {}}
              className="w-4 h-4 accent-[#2D4A3A]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing || isSubmitting || (!selectedFile && selectedPreset === null)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Posting to Live Wedding Stream...</span>
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Image...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {mediaType === 'video' || selectedFile?.type === 'video'
                    ? 'Post Video Toast to Wedding Stream'
                    : 'Post Photo to Wedding Stream'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

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
} from 'lucide-react';
import Link from 'next/link';
import { SAMPLE_PRESETS } from '@/lib/initialData';
import { useEvent } from '@/context/EventContext';

interface SelectedMediaFile {
  url: string;
  name: string;
  type: 'photo' | 'video';
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
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [selectedFile, setSelectedFile] = useState<SelectedMediaFile | null>(null);
  const [isConverting, setIsConverting] = useState(false);
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

  // Helper: Takes any image Blob, resizes to max 1400px on canvas, and outputs universal JPEG DataURL
  const compressBlobToJpeg = (blob: Blob, displayName: string): Promise<SelectedMediaFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          reject(new Error('Failed to read image data'));
          return;
        }
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1400;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve({
              url: compressedDataUrl,
              name: displayName,
              type: 'photo',
            });
          } else {
            resolve({
              url: result,
              name: displayName,
              type: 'photo',
            });
          }
        };
        img.onerror = () => {
          reject(new Error('Browser could not decode image directly'));
        };
        img.src = result;
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so user can pick again
    e.target.value = '';

    const isVideo = file.type.startsWith('video/');

    if (isVideo) {
      if (file.size > 4.5 * 1024 * 1024) {
        triggerToast(
          'Video file is too large for browser storage',
          'Please pick a shorter clip (under 4.5 MB)'
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setSelectedFile({
            url: result,
            name: file.name,
            type: 'video',
          });
          setMediaType('video');
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // Check if the photo is an iPhone HEIC / HEIF file
    const lowerName = file.name.toLowerCase();
    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      lowerName.endsWith('.heic') ||
      lowerName.endsWith('.heif');

    const normalizedName = file.name.replace(/\.(heic|heif)$/i, '.jpg');

    setIsConverting(true);
    try {
      let sourceBlob: Blob = file;

      if (isHeic) {
        try {
          const heic2any = (await import('heic2any')).default;
          const converted = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.85,
          });
          sourceBlob = Array.isArray(converted) ? converted[0] : converted;
        } catch (heicErr) {
          // If Safari natively decoded it or file was already JPEG with .heic extension, fall through to canvas
          console.warn('heic2any fallback to native image decoder:', heicErr);
        }
      }

      const processed = await compressBlobToJpeg(sourceBlob, normalizedName);
      setSelectedFile(processed);
      setMediaType('photo');
    } catch (err) {
      console.error('Image conversion error:', err);
      triggerToast(
        'Could not process image format',
        'Please try selecting another photo from your library'
      );
    } finally {
      setIsConverting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAuthor = authorInput.trim() || guestName || 'Wedding Guest';

    if (selectedFile) {
      addMemory({
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
    } else {
      // Fallback demo preset
      const presetUrl = (SAMPLE_PRESETS[selectedPreset] || SAMPLE_PRESETS[0]).url;
      addMemory({
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
  };

  const currentPreviewUrl =
    selectedFile?.url || SAMPLE_PRESETS[selectedPreset].url;

  const currentPreviewName = selectedFile?.name || null;

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
              onClick={() => setMediaType('photo')}
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
              onClick={() => setMediaType('video')}
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

          {/* Hidden Real File Input (supports iPhone HEIC/HEIF & standard images/videos) */}
          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === 'video' ? 'video/*' : 'image/*,.heic,.heif'}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Media Preview & Trigger */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="relative aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden border border-[#1C2820]/15 shadow-inner bg-black/5">
              {currentPreviewUrl.startsWith('data:video') ? (
                <video
                  src={currentPreviewUrl}
                  controls
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={currentPreviewUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
              )}

              {isConverting && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-[#9BC4A8]" />
                  <span className="text-xs font-bold">
                    Optimizing iPhone photo to JPEG...
                  </span>
                </div>
              )}

              {currentPreviewName && !isConverting && (
                <span className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold truncate">
                  {currentPreviewName}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* Primary Camera / File Upload CTA */}
              <button
                type="button"
                disabled={isConverting}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-5 px-4 rounded-2xl border-2 border-dashed border-[#2D4A3A] bg-[#E9EFEA]/60 hover:bg-[#E9EFEA] disabled:opacity-50 text-[#1C2820] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.99] text-center"
              >
                <div className="w-10 h-10 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center shadow-sm">
                  {isConverting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs font-bold mt-1">
                  {isConverting
                    ? 'Converting HEIC to JPEG...'
                    : mediaType === 'video'
                    ? 'Choose Video File'
                    : selectedFile
                    ? 'Choose a Different Photo'
                    : 'Take Photo or Choose from Library'}
                </span>
                <span className="text-[10px] text-[#1C2820]/60 font-medium">
                  {selectedFile
                    ? 'Converted to universal JPEG · Tap to replace'
                    : 'Supports iPhone HEIC, JPG, PNG & Android camera roll'}
                </span>
              </button>

              {/* Sample Preset Switcher (when no custom file selected) */}
              {!selectedFile ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreset((prev) => (prev + 1) % SAMPLE_PRESETS.length);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-[#1C2820]/10 hover:bg-black/5 text-[#1C2820]/75 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Switch demo sample ({selectedPreset + 1}/{SAMPLE_PRESETS.length})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="w-full py-2.5 px-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove selected photo</span>
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
            disabled={isConverting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] hover:from-[#1F3628] hover:to-[#16261E] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Converting Photo to JPEG...</span>
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

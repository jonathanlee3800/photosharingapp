'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Video, Check, Lock, RotateCcw, X, Loader2, Crop as CropIcon } from 'lucide-react';
import Link from 'next/link';
import { useEvent } from '@/context/EventContext';
import { processUploadedImage, isValidImageFile, isHeicFile } from '@/lib/imageProcessor';
import PhotoFrame from '@/components/PhotoFrame';
import PhotoCropDialog from '@/components/PhotoCropDialog';
import { readVideoDuration } from '@/lib/videoDuration';

interface SelectedMediaFile {
  url: string;
  name: string;
  type: 'photo' | 'video';
  isPendingCompression?: boolean;
  duration?: string | null;
}

export default function UploadPage() {
  const router = useRouter();
  const { currentEvent, guestName, prompts, addMemory, triggerToast } = useEvent();

  const [authorInput, setAuthorInput] = useState(guestName || '');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
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
  const [isCropping, setIsCropping] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so user can pick the same file again if desired
    e.target.value = '';

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);

    if (isVideo) {
      if (file.size > 15 * 1024 * 1024) {
        triggerToast('Video file is too large', 'Please select a clip under 15 MB for quick sharing');
        return;
      }

      setIsProcessing(true);
      const instantVideoUrl = URL.createObjectURL(file);
      setSelectedFile({ url: instantVideoUrl, name: file.name, type: 'video' });
      setMediaType('video');
      const durationRead = readVideoDuration(file);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result;
        const duration = await durationRead;
        if (typeof result === 'string') {
          setSelectedFile({ url: result, name: file.name, type: 'video', duration });
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

    // If standard JPEG/PNG, display instant preview immediately (0ms)
    if (!isHeic) {
      const instantUrl = URL.createObjectURL(file);
      setSelectedFile({ url: instantUrl, name: file.name, type: 'photo', isPendingCompression: true });
      setMediaType('photo');
    }

    // Process & convert HEIC (via server libheif) and compress to JPEG DataURL
    try {
      const processed = await processUploadedImage(file, { maxDimension: 2000, quality: 0.88 });
      setSelectedFile({ url: processed.dataUrl, name: processed.fileName, type: 'photo', isPendingCompression: false });
      setMediaType('photo');
    } catch (err: any) {
      console.warn('Image processing fallback:', err);
      triggerToast('Could not read that photo', 'Please try selecting another one');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    const finalAuthor = authorInput.trim() || guestName || 'Wedding Guest';
    setIsSubmitting(true);

    try {
      await addMemory({
        type: selectedFile.type,
        url: selectedFile.url,
        caption: caption.trim(),
        promptId,
        isPrivate,
        duration: selectedFile.type === 'video' ? selectedFile.duration || undefined : undefined,
        guestName: finalAuthor,
      });
      router.push(`/user/${currentEvent.id}/gallery`);
    } catch (err) {
      console.error('Error posting memory:', err);
      triggerToast('Could not post memory', 'Please check your connection and try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVideo = selectedFile?.type === 'video' || (!selectedFile && mediaType === 'video');
  const busy = isProcessing || isSubmitting;

  return (
    <div className="w-full max-w-xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="px-4 md:px-6 pt-3 md:pt-8 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-10">
          <Link href={`/user/${currentEvent.id}/gallery`} className="text-[16px] font-medium text-[#2D4A3A] py-2 pr-3 press">
            Cancel
          </Link>
          <span className="text-[13px] font-medium text-[#1C2820]/45 truncate pl-3">{currentEvent.title}</span>
        </div>

        <div className="animate-fade-up">
          <h1 className="font-serif text-[36px] md:text-[44px] leading-[1.05] font-medium tracking-tight text-[#1C2820]">
            Share a moment.
          </h1>
          <p className="text-[15px] text-[#1C2820]/55 mt-1.5">It’ll appear in the live gallery and on the big screen.</p>
        </div>

        {/* Photo / Video segmented control */}
        <div role="tablist" aria-label="Media type" className="grid grid-cols-2 p-1 rounded-[14px] bg-[#1C2820]/[0.06]">
          {(
            [
              { id: 'photo', label: 'Photo', icon: Camera },
              { id: 'video', label: 'Video', icon: Video },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const active = mediaType === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMediaType(id);
                  if (selectedFile && selectedFile.type !== id) setSelectedFile(null);
                }}
                className={`h-10 rounded-[11px] text-[15px] font-semibold flex items-center justify-center gap-2 transition-all ${
                  active ? 'bg-white text-[#1C2820] shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-[#1C2820]/55'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Hidden file input (iOS offers Camera or Photo Library) */}
        <input
          ref={fileInputRef}
          type="file"
          accept={mediaType === 'video' ? 'video/*' : 'image/*,.heic,.heif'}
          onChange={handleFileChange}
          className="hidden"
        />

        {isCropping && selectedFile && (
          <PhotoCropDialog
            src={selectedFile.url}
            onCancel={() => setIsCropping(false)}
            onApply={(url) => {
              setSelectedFile({ ...selectedFile, url });
              setIsCropping(false);
            }}
          />
        )}

        {/* Media */}
        <div className="relative aspect-[4/5] rounded-[28px] overflow-hidden bg-white border border-[#1C2820]/[0.08] shadow-[0_10px_40px_rgba(28,40,32,0.06)]">
          {selectedFile ? (
            <>
              {selectedFile.type === 'video' ? (
                <video src={selectedFile.url} controls muted playsInline className="absolute inset-0 w-full h-full object-contain bg-black bg-black" />
              ) : (
                <PhotoFrame src={selectedFile.url} alt="Your photo" />
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                {selectedFile.type === 'photo' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setIsCropping(true)}
                    className="h-9 px-3.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[13px] font-semibold flex items-center gap-1.5 press"
                  >
                    <CropIcon className="w-3.5 h-3.5" /> Crop
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[13px] font-semibold flex items-center gap-1.5 press"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Replace
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedFile(null)}
                  aria-label="Remove"
                  className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center press"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 w-full flex flex-col items-center justify-center gap-4 text-center px-8 bg-gradient-to-b from-white to-[#F4F1EA] press"
            >
              <span className="w-20 h-20 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center shadow-[0_12px_30px_rgba(45,74,58,0.3)]">
                {isVideo ? <Video className="w-9 h-9" strokeWidth={1.6} /> : <Camera className="w-9 h-9" strokeWidth={1.6} />}
              </span>
              <span className="space-y-1">
                <span className="block text-[18px] font-semibold text-[#1C2820]">
                  {isVideo ? 'Record or choose a video' : 'Take or choose a photo'}
                </span>
                <span className="block text-[14px] text-[#1C2820]/50">
                  {isVideo ? 'Up to 15 MB' : 'iPhone HEIC, JPG and PNG all work'}
                </span>
              </span>
            </button>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-[14px] font-medium">Preparing your {isVideo ? 'video' : 'photo'}…</span>
            </div>
          )}
        </div>

        {/* Name + message (iOS grouped list) */}
        <div className="rounded-[22px] bg-white border border-[#1C2820]/[0.08] divide-y divide-[#1C2820]/[0.07] overflow-hidden">
          <label className="flex items-center gap-4 px-4 min-h-[52px]">
            <span className="text-[15px] font-medium text-[#1C2820] w-14 shrink-0">Name</span>
            <input
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
              placeholder="Your name"
              className="flex-1 min-w-0 h-[52px] bg-transparent text-[16px] text-[#1C2820] placeholder:text-[#1C2820]/35 focus:outline-none"
            />
          </label>
          <label className="block px-4 py-3">
            <span className="sr-only">Message</span>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={`Add a message for ${currentEvent.title}…`}
              className="w-full bg-transparent text-[16px] leading-relaxed text-[#1C2820] placeholder:text-[#1C2820]/35 focus:outline-none resize-none"
            />
          </label>
        </div>

        {/* Photo Tag */}
        {prompts.length > 0 && (
          <div className="space-y-2">
            <div className="px-1">
              <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1C2820]/60">Photo Tag</p>
              <p className="text-xs text-[#1C2820]/50 font-medium mt-0.5">Pick the tag that best fits your photo</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {prompts.map((p) => {
                const active = promptId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPromptId(p.id)}
                    aria-pressed={active}
                    className={`h-10 px-4 rounded-full text-[14px] font-medium flex items-center gap-1.5 transition-colors press ${
                      active ? 'bg-[#2D4A3A] text-white' : 'bg-white border border-[#1C2820]/10 text-[#1C2820]/75'
                    }`}
                  >
                    {active ? <Check className="w-4 h-4" /> : <span>{p.icon}</span>}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Private toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={isPrivate}
          onClick={() => setIsPrivate(!isPrivate)}
          className="w-full rounded-[22px] bg-white border border-[#1C2820]/[0.08] px-4 py-3.5 flex items-center gap-3 text-left press"
        >
          <span className="w-9 h-9 rounded-[10px] bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center shrink-0">
            <Lock className="w-[18px] h-[18px]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-medium text-[#1C2820]">Only for the couple</span>
            <span className="block text-[13px] text-[#1C2820]/50">Hidden from the gallery and big screen</span>
          </span>
          {/* iOS-style switch */}
          <span
            className={`relative w-[51px] h-[31px] rounded-full shrink-0 transition-colors ${
              isPrivate ? 'bg-[#2D4A3A]' : 'bg-[#1C2820]/15'
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-transform ${
                isPrivate ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>

        {/* Post button: pinned to the bottom on phones */}
        <div
          className="fixed md:static inset-x-0 bottom-0 z-40 glass md:bg-transparent md:backdrop-blur-none border-t md:border-0 border-[#1C2820]/[0.08] px-4 md:px-0 pt-3 md:pt-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="submit"
            disabled={busy}
            className="w-full max-w-xl mx-auto h-14 rounded-2xl bg-[#2D4A3A] text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(45,74,58,0.28)] disabled:opacity-60 press"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Posting…
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Preparing…
              </>
            ) : selectedFile ? (
              `Post ${selectedFile.type === 'video' ? 'video' : 'photo'}${isPrivate ? ' privately' : ''}`
            ) : (
              `Choose a ${isVideo ? 'video' : 'photo'}`
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

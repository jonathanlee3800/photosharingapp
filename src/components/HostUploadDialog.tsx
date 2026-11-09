'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader2, ImagePlus, Film, Check, Lock, Crop as CropIcon } from 'lucide-react';
import { useEvent } from '@/context/EventContext';
import { processUploadedImage, isValidImageFile, isHeicFile } from '@/lib/imageProcessor';
import PhotoCropDialog from '@/components/PhotoCropDialog';
import { readVideoDuration } from '@/lib/videoDuration';

const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

interface PickedFile {
  id: number;
  file: File;
  previewUrl: string | null; // null for HEIC until it has been converted to JPEG
  isVideo: boolean;
  converting: boolean;
  processedUrl?: string; // The converted photo, reused at upload so it isn't converted twice
}

const PHOTO_OPTIONS = { maxDimension: 2000, quality: 0.88 };

const revokePreview = (p: PickedFile) => {
  if (p.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(p.previewUrl);
};

/**
 * Host upload: pick photos/videos, choose a category, add an optional caption, then upload.
 * Uses the same pipeline as guests (HEIC conversion, compression, R2, live updates).
 */
export default function HostUploadDialog({
  open,
  onClose,
  defaultPromptId,
}: {
  open: boolean;
  onClose: () => void;
  defaultPromptId?: string;
}) {
  const { prompts, addMultipleMemories, triggerToast, hostUser } = useEvent();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [promptId, setPromptId] = useState('');
  const [caption, setCaption] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [croppingId, setCroppingId] = useState<number | null>(null);
  const nextIdRef = useRef(0);
  // HEIC is converted on the server, one file at a time so a big selection doesn't overload it
  const conversionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pickedRef = useRef<PickedFile[]>([]);
  pickedRef.current = picked;

  // Reset each time the dialog opens
  useEffect(() => {
    if (!open) return;
    pickedRef.current.forEach(revokePreview);
    setPicked([]);
    setCaption('');
    setIsPrivate(false);
    setStatus('');
    setPromptId(defaultPromptId && prompts.some((p) => p.id === defaultPromptId) ? defaultPromptId : prompts[0]?.id || '');
  }, [open]);

  // Free preview URLs when the dialog goes away (removing a file frees its own)
  useEffect(() => () => pickedRef.current.forEach(revokePreview), []);

  if (!open) return null;

  const addFiles = (files: File[]) => {
    let skipped = 0;
    const next: PickedFile[] = [];
    for (const file of files) {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
      if (isVideo ? file.size > MAX_VIDEO_BYTES : !isValidImageFile(file)) {
        skipped++;
        continue;
      }
      const needsConversion = !isVideo && isHeicFile(file);
      next.push({
        id: nextIdRef.current++,
        file,
        isVideo,
        previewUrl: needsConversion ? null : URL.createObjectURL(file),
        converting: needsConversion,
      });
    }
    setPicked((prev) => [...prev, ...next]);
    next.filter((p) => p.converting).forEach(convertForPreview);
    if (skipped > 0) {
      triggerToast(`${skipped} ${skipped === 1 ? 'file' : 'files'} skipped`, 'Only photos and videos under 15 MB can be uploaded');
    }
  };

  // Browsers can't reliably show HEIC, so convert it now and preview the JPEG. If that fails the
  // placeholder stays, and upload tries the conversion again.
  const convertForPreview = (item: PickedFile) => {
    const update = (changes: Partial<PickedFile>) =>
      setPicked((prev) => prev.map((p) => (p.id === item.id ? { ...p, ...changes } : p)));
    conversionQueueRef.current = conversionQueueRef.current.then(async () => {
      if (!pickedRef.current.some((p) => p.id === item.id)) return; // Removed while waiting
      try {
        const { dataUrl } = await processUploadedImage(item.file, PHOTO_OPTIONS);
        if (dataUrl.startsWith('data:image/jpeg')) {
          update({ previewUrl: dataUrl, processedUrl: dataUrl, converting: false });
          return;
        }
      } catch (err) {
        console.warn('HEIC preview error:', err);
      }
      update({ converting: false });
    });
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const upload = async () => {
    if (picked.length === 0 || uploading) return;
    setUploading(true);
    const entries: Parameters<typeof addMultipleMemories>[0] = [];
    let failed = 0;
    for (let i = 0; i < picked.length; i++) {
      const { file, isVideo, processedUrl } = picked[i];
      setStatus(`Preparing ${i + 1} of ${picked.length}…`);
      try {
        const url = isVideo
          ? await readAsDataUrl(file)
          : processedUrl || (await processUploadedImage(file, PHOTO_OPTIONS)).dataUrl;
        const duration = isVideo ? await readVideoDuration(file) : null;
        entries.push({
          type: isVideo ? 'video' : 'photo',
          url,
          duration: duration || undefined,
          caption: caption.trim(),
          promptId,
          isPrivate,
          guestName: hostUser?.name || 'The hosts',
        });
      } catch (err) {
        console.warn('Host upload processing error:', err);
        failed++;
      }
    }
    if (entries.length > 0) {
      setStatus(`Uploading ${entries.length}…`);
      await addMultipleMemories(entries);
    }
    if (failed > 0) triggerToast(`${failed} ${failed === 1 ? 'file' : 'files'} couldn't be read`, 'Please try those again');
    setUploading(false);
    onClose();
  };

  const count = picked.length;
  const cropping = picked.find((p) => p.id === croppingId);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="host-upload-title">
      {cropping?.previewUrl && (
        <PhotoCropDialog
          src={cropping.previewUrl}
          onCancel={() => setCroppingId(null)}
          onApply={(url) => {
            revokePreview(cropping);
            setPicked((prev) => prev.map((p) => (p.id === cropping.id ? { ...p, previewUrl: url, processedUrl: url } : p)));
            setCroppingId(null);
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !uploading && onClose()} />

      <div className="relative w-full sm:max-w-xl max-h-[92dvh] flex flex-col bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3 border-b border-[#1C2820]/[0.07]">
          <div>
            <h2 id="host-upload-title" className="font-serif text-3xl font-medium text-[#1C2820] leading-tight">
              Upload photos
            </h2>
            <p className="text-xs text-[#1C2820]/55 font-medium mt-1">Add your own photos and videos to this event.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-[#1C2820]/[0.06] text-[#1C2820]/70 flex items-center justify-center shrink-0 hover:bg-[#1C2820]/10 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.heic,.heif,video/*"
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = '';
              addFiles(files);
            }}
          />

          {/* Files */}
          {count === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full py-10 rounded-2xl border-2 border-dashed border-[#2D4A3A]/30 bg-[#FAF8F5] hover:bg-[#E9EFEA]/60 flex flex-col items-center gap-3 transition-colors"
            >
              <span className="w-14 h-14 rounded-full bg-[#2D4A3A] text-white flex items-center justify-center">
                <ImagePlus className="w-7 h-7" />
              </span>
              <span className="text-sm font-bold text-[#1C2820]">Choose photos or videos</span>
              <span className="text-xs text-[#1C2820]/50">Select several at once · HEIC, JPG, PNG, videos up to 15 MB</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#1C2820]/60">
                  {count} {count === 1 ? 'file' : 'files'} selected
                </span>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs font-bold text-[#2D4A3A] hover:underline"
                >
                  + Add more
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {picked.map((p) => (
                  <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#1C2820]/[0.06]">
                    {p.previewUrl ? (
                      p.isVideo ? (
                        <video src={p.previewUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                      ) : (
                        <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#1C2820]/50 text-[10px] font-semibold gap-1 p-1 text-center">
                        {p.converting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                        {p.converting ? 'Loading' : 'HEIC'}
                      </div>
                    )}
                    {!p.isVideo && p.previewUrl && (
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => setCroppingId(p.id)}
                        aria-label="Crop photo"
                        className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <CropIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {p.isVideo && (
                      <span className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                        <Film className="w-3 h-3" />
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => {
                        revokePreview(p);
                        setPicked((prev) => prev.filter((other) => other.id !== p.id));
                      }}
                      aria-label="Remove"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Tag */}
          <div className="space-y-1.5">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wide text-[#1C2820]">Photo Tag</span>
              <p className="text-[11px] text-[#1C2820]/60 font-medium mt-0.5">Select which tag this belongs to</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {prompts.map((p) => {
                const active = promptId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={uploading}
                    onClick={() => setPromptId(p.id)}
                    aria-pressed={active}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      active ? 'bg-[#2D4A3A] text-white' : 'bg-[#FAF8F5] border border-[#1C2820]/12 text-[#1C2820]/75 hover:bg-[#E9EFEA]'
                    }`}
                  >
                    {active ? <Check className="w-3.5 h-3.5" /> : <span>{p.icon}</span>}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label htmlFor="host-upload-caption" className="block text-xs font-bold uppercase tracking-wide text-[#1C2820]">
              Caption <span className="font-medium normal-case tracking-normal text-[#1C2820]/45">(optional{count > 1 ? ', used for all selected' : ''})</span>
            </label>
            <textarea
              id="host-upload-caption"
              rows={3}
              value={caption}
              disabled={uploading}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write something about these moments…"
              className="w-full rounded-2xl border border-[#1C2820]/15 p-4 text-xs sm:text-sm font-medium text-[#1C2820] placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal placeholder:text-[#1C2820]/35 focus:outline-none focus:border-[#2D4A3A] focus:ring-2 focus:ring-[#2D4A3A]/15 resize-none"
            />
          </div>

          {/* Private */}
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            disabled={uploading}
            onClick={() => setIsPrivate(!isPrivate)}
            className="w-full rounded-2xl border border-[#1C2820]/12 px-4 py-3 flex items-center gap-3 text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-[#E9EFEA] text-[#2D4A3A] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[#1C2820]">Only for the couple</span>
              <span className="block text-xs text-[#1C2820]/50">Keep in the private vault, off the gallery and big screen</span>
            </span>
            <span className={`relative w-[46px] h-[28px] rounded-full shrink-0 transition-colors ${isPrivate ? 'bg-[#2D4A3A]' : 'bg-[#1C2820]/15'}`}>
              <span
                className={`absolute top-[2px] left-[2px] w-6 h-6 rounded-full bg-white shadow transition-transform ${isPrivate ? 'translate-x-[18px]' : ''}`}
              />
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1C2820]/[0.07] flex items-center justify-end gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#1C2820]/70 hover:bg-black/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={upload}
            disabled={count === 0 || uploading || !promptId}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2D4A3A] to-[#1F3628] text-white text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? status : count > 0 ? `Upload ${count} ${count === 1 ? 'file' : 'files'}` : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

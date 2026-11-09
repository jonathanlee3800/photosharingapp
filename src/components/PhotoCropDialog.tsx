'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { centerCrop, makeAspectCrop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X } from 'lucide-react';

const SHAPES: Array<{ label: string; aspect?: number }> = [
  { label: 'Free' },
  { label: 'Square', aspect: 1 },
  { label: '4:5', aspect: 4 / 5 },
  { label: '16:9', aspect: 16 / 9 },
];

const WHOLE_PHOTO: PercentCrop = { unit: '%', x: 0, y: 0, width: 100, height: 100 };
const MAX_OUTPUT_DIMENSION = 2000;

/** Lets someone frame their own photo before uploading. Works with touch and mouse. */
export default function PhotoCropDialog({
  src,
  onCancel,
  onApply,
}: {
  src: string;
  onCancel: () => void;
  onApply: (croppedDataUrl: string) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<PercentCrop>(WHOLE_PHOTO);
  const [shape, setShape] = useState(0);

  // Stop the page behind from scrolling while cropping
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const chooseShape = (index: number) => {
    setShape(index);
    const aspect = SHAPES[index].aspect;
    const image = imageRef.current;
    if (!aspect || !image) {
      setCrop(WHOLE_PHOTO);
      return;
    }
    const { naturalWidth: width, naturalHeight: height } = image;
    // The largest area of this shape that fits, centred
    const fitted = width / height > aspect ? { unit: '%' as const, height: 100 } : { unit: '%' as const, width: 100 };
    setCrop(centerCrop(makeAspectCrop(fitted, aspect, width, height), width, height));
  };

  const apply = () => {
    const image = imageRef.current;
    if (!image || !crop.width || !crop.height) return;
    const sourceX = (crop.x / 100) * image.naturalWidth;
    const sourceY = (crop.y / 100) * image.naturalHeight;
    const sourceWidth = (crop.width / 100) * image.naturalWidth;
    const sourceHeight = (crop.height / 100) * image.naturalHeight;
    const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(sourceWidth, sourceHeight));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    onApply(canvas.toDataURL('image/jpeg', 0.9));
  };

  // Rendered on the page itself, so it covers everything wherever it's opened from
  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-[#101813] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Crop photo"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="h-14 px-4 flex items-center justify-between shrink-0">
        <button type="button" onClick={onCancel} aria-label="Cancel crop" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center press">
          <X className="w-5 h-5" />
        </button>
        <span className="text-[15px] font-semibold">Crop photo</span>
        <span className="w-10" />
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-4">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          aspect={SHAPES[shape].aspect}
          minWidth={40}
          minHeight={40}
          keepSelection
          ruleOfThirds
        >
          <img ref={imageRef} src={src} alt="Photo to crop" className="block max-w-full max-h-[calc(100dvh-13rem)] object-contain" />
        </ReactCrop>
      </div>

      <div className="px-4 pt-3 pb-4 space-y-3 shrink-0">
        <div className="flex justify-center gap-2">
          {SHAPES.map((option, index) => (
            <button
              key={option.label}
              type="button"
              onClick={() => chooseShape(index)}
              aria-pressed={shape === index}
              className={`h-9 px-4 rounded-full text-[14px] font-medium press ${
                shape === index ? 'bg-white text-[#1C2820]' : 'bg-white/10 text-white/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 max-w-md mx-auto">
          <button type="button" onClick={onCancel} className="flex-1 h-12 rounded-2xl bg-white/10 text-[15px] font-semibold press">
            Cancel
          </button>
          <button type="button" onClick={apply} className="flex-1 h-12 rounded-2xl bg-white text-[#1C2820] text-[15px] font-semibold press">
            Apply crop
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Shrinks a video on the guest's own phone before it is uploaded: 720p, H.264 + AAC in an MP4,
 * which plays everywhere (iPhone, Android, the projector's browser). Uses the phone's hardware
 * encoder through WebCodecs, so a 30-second clip takes a few seconds.
 *
 * Never blocks an upload: if the browser can't do it, or anything goes wrong, the original file is
 * returned unchanged.
 */

const MAX_SIDE = 1280; // 720p
const VIDEO_BITRATE = 2_500_000; // ~9 MB for 30 seconds
const AUDIO_BITRATE = 128_000;
const SKIP_BELOW_BYTES = 4 * 1024 * 1024; // already small: not worth the wait

/** Largest video that can be stored (after compression) */
export const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
/** Largest video a guest can pick: bigger ones are fine when the phone can shrink them first */
export function maxPickableVideoBytes(): number {
  return canCompressVideo() ? 300 * 1024 * 1024 : MAX_VIDEO_BYTES;
}

export type CompressResult = { file: File; compressed: boolean };

export function canCompressVideo(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoDecoder' in window;
}

export async function compressVideo(file: File, onProgress?: (fraction: number) => void): Promise<CompressResult> {
  if (!canCompressVideo() || file.size <= SKIP_BELOW_BYTES) return { file, compressed: false };

  try {
    // Loaded only when a video is picked, so photo-only guests never download it
    const mb = await import('mediabunny');
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return { file, compressed: false };

    // Longest side to 720p, keeping the shape (portrait stays portrait); never upscale
    const width = await track.getDisplayWidth();
    const height = await track.getDisplayHeight();
    const size =
      Math.max(width, height) <= MAX_SIDE ? {} : width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE };

    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), // starts playing before fully downloaded
      target: new mb.BufferTarget(),
    });
    const conversion = await mb.Conversion.init({
      input,
      output,
      video: { ...size, codec: 'avc', quality: new mb.Quality({ bitrate: VIDEO_BITRATE }), forceTranscode: true },
      audio: { codec: 'aac', quality: new mb.Quality({ bitrate: AUDIO_BITRATE }) },
      showWarnings: false,
    });
    // Anything dropped (e.g. the phone can't encode the sound) would spoil the clip: keep the original
    if (!conversion.isValid || conversion.discardedTracks.length > 0) return { file, compressed: false };

    conversion.onProgress = (p) => onProgress?.(Math.min(1, Math.max(0, p)));
    await conversion.execute();

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0 || buffer.byteLength >= file.size) return { file, compressed: false };
    const name = file.name.replace(/\.[^.]+$/, '') + '.mp4';
    return { file: new File([buffer], name, { type: 'video/mp4' }), compressed: true };
  } catch (err) {
    console.warn('Video compression skipped:', err);
    return { file, compressed: false };
  }
}

// Formats seconds as a video length label: 0:07, 1:05, 1:02:09
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/**
 * Reads a video's real length from the file itself, before it's uploaded.
 * Returns null if the browser can't read it, so callers can leave the length off rather than guess.
 */
export function readVideoDuration(file: File, timeoutMs = 8000): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    const check = () => {
      const d = video.duration;
      if (Number.isFinite(d) && d > 0) finish(formatDuration(d));
    };

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        check();
      } else {
        // Some recordings don't state their length up front; seeking far ahead makes the browser work it out
        video.currentTime = Number.MAX_SAFE_INTEGER;
      }
    };
    video.ondurationchange = check;
    video.onseeked = check;
    video.onerror = () => finish(null);
    video.src = url;
  });
}

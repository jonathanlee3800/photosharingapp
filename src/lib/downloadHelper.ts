import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { MemoryItem } from './initialData';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

// File extension from the actual file type, falling back to the media type
function extensionFor(mime: string | undefined, type: MemoryItem['type']): string {
  return (mime && EXT_BY_MIME[mime.split(';')[0].trim().toLowerCase()]) || (type === 'video' ? 'mp4' : 'jpg');
}

// Fetches a photo/video as a Blob; throws on HTTP errors so an error page is never saved as media
async function fetchMediaBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

/**
 * Downloads a single photo directly to the user's device
 */
export async function downloadSinglePhoto(memory: MemoryItem) {
  const baseName = `wedding-memory-${slugify(memory.guestName)}-${memory.id}`;
  try {
    // Check if it's a data URL or remote URL
    if (memory.url.startsWith('data:')) {
      const mime = memory.url.slice(5, memory.url.indexOf(';'));
      saveAs(memory.url, `${baseName}.${extensionFor(mime, memory.type)}`);
      return true;
    }

    const blob = await fetchMediaBlob(memory.url);
    saveAs(blob, `${baseName}.${extensionFor(blob.type, memory.type)}`);
    return true;
  } catch (error) {
    const filename = `${baseName}.${extensionFor(undefined, memory.type)}`;
    console.warn('Direct fetch failed, falling back to window.open or link:', error);
    // Fallback: trigger a link with download attribute
    const link = document.createElement('a');
    link.href = memory.url;
    link.target = '_blank';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
}

/**
 * Downloads a collection of memories as a consolidated ZIP file including:
 * 1. Image and video assets
 * 2. Captions & well-wishes index (manifest.txt or guestbook.json)
 */
export async function downloadMemoriesZip(
  memories: MemoryItem[],
  zipTitle: string = 'Wedding_Memories.zip',
  onProgress?: (percent: number, currentFile: string) => void,
  eventMeta?: { title?: string; date?: string }
): Promise<boolean> {
  const zip = new JSZip();
  const folder = zip.folder('wedding_photos') || zip;
  const headerTitle = (eventMeta?.title || 'Wedding Celebration').toUpperCase();
  const headerDate = eventMeta?.date || 'Celebration Archive';

  // 1. Build a guestbook well-wishes text summary
  let wellWishesSummary = `=========================================================\n`;
  wellWishesSummary += `  ${headerTitle} — MEMORIES & WELL-WISHES ARCHIVE\n`;
  wellWishesSummary += `  Date: ${headerDate} | Total Memories: ${memories.length}\n`;
  wellWishesSummary += `=========================================================\n\n`;

  memories.forEach((mem, index) => {
    wellWishesSummary += `[#${index + 1}] Guest: ${mem.guestName}\n`;
    wellWishesSummary += `Type: ${mem.type.toUpperCase()} | Timestamp: ${mem.timestamp} | Likes: ${mem.votes}\n`;
    wellWishesSummary += `Well-Wish / Caption: "${mem.caption}"\n`;
    if (mem.subCaption) wellWishesSummary += `Details: ${mem.subCaption}\n`;
    wellWishesSummary += `Private Vault: ${mem.isPrivate ? 'YES' : 'NO'}\n`;
    wellWishesSummary += `---------------------------------------------------------\n\n`;
  });

  zip.file('GUESTBOOK_AND_WELL_WISHES.txt', wellWishesSummary);
  // Metadata only: embedded base64 media is already in the photo files, don't duplicate it here
  zip.file(
    'memories_metadata.json',
    JSON.stringify(
      memories.map((m) => ({ ...m, url: m.url.startsWith('data:') ? '(embedded file in wedding_photos/)' : m.url })),
      null,
      2
    )
  );

  // 2. Fetch and add images/videos
  const total = memories.length;
  for (let i = 0; i < total; i++) {
    const mem = memories[i];
    const baseName = `${String(i + 1).padStart(2, '0')}_${slugify(mem.guestName)}_${mem.id}`;

    if (onProgress && total > 0) {
      onProgress(Math.round(((i + 1) / total) * 90), baseName);
    }

    try {
      if (mem.url.startsWith('data:')) {
        // Base64 image or video
        const mime = mem.url.slice(5, mem.url.indexOf(';'));
        const base64Data = mem.url.split(',')[1];
        if (base64Data) {
          folder.file(`${baseName}.${extensionFor(mime, mem.type)}`, base64Data, { base64: true });
        }
      } else {
        const blob = await fetchMediaBlob(mem.url);
        folder.file(`${baseName}.${extensionFor(blob.type, mem.type)}`, blob);
      }
    } catch (e) {
      console.warn(`Could not bundle ${baseName} (${e instanceof Error ? e.message : 'fetch failed'}). Embedding reference link.`);
      folder.file(`${baseName}.url.txt`, `Direct photo link: ${mem.url}\nCaption: ${mem.caption}`);
    }
  }

  if (onProgress) onProgress(95, 'Generating ZIP package...');
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, zipTitle);
  if (onProgress) onProgress(100, 'Complete!');
  return true;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-') || 'guest';
}


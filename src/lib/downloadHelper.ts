import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { MemoryItem } from './initialData';

/**
 * Downloads a single photo directly to the user's device
 */
export async function downloadSinglePhoto(memory: MemoryItem) {
  const ext = memory.type === 'video' ? 'mp4' : 'jpg';
  const filename = `wedding-memory-${slugify(memory.guestName)}-${memory.id}.${ext}`;
  try {
    // Check if it's a data URL or remote URL
    if (memory.url.startsWith('data:')) {
      saveAs(memory.url, filename);
      return true;
    }

    const response = await fetch(memory.url, { mode: 'cors' });
    const blob = await response.blob();
    saveAs(blob, filename);
    return true;
  } catch (error) {
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
  zip.file('memories_metadata.json', JSON.stringify(memories, null, 2));

  // 2. Fetch and add images/videos
  const total = memories.length;
  for (let i = 0; i < total; i++) {
    const mem = memories[i];
    const safeGuest = slugify(mem.guestName);
    const ext = mem.type === 'video' ? 'mp4' : 'jpg';
    const filename = `${String(i + 1).padStart(2, '0')}_${safeGuest}_${mem.id}.${ext}`;

    if (onProgress && total > 0) {
      onProgress(Math.round(((i + 1) / total) * 90), filename);
    }

    try {
      if (mem.url.startsWith('data:')) {
        // Base64 image or video
        const base64Data = mem.url.split(',')[1];
        if (base64Data) {
          folder.file(filename, base64Data, { base64: true });
        }
      } else {
        const res = await fetch(mem.url);
        const blob = await res.blob();
        folder.file(filename, blob);
      }
    } catch (e) {
      console.warn(`Could not bundle ${filename} directly (CORS). Embedding reference link.`);
      folder.file(`${filename}.url.txt`, `Direct photo link: ${mem.url}\nCaption: ${mem.caption}`);
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


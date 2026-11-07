// Browser-side helpers for storing photos/videos in Cloudflare R2.

const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/+$/, '');

/** Builds the public URL for an object stored in R2. */
export function mediaUrlFromKey(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export const isR2PublicUrlConfigured = (): boolean => Boolean(R2_PUBLIC_URL);

/**
 * Uploads a locally held file (data: or blob: URL) to R2 and returns its public URL and key.
 * Remote URLs (e.g. sample presets) are returned unchanged with no key.
 */
export async function uploadMediaToR2(
  url: string,
  eventId: string,
  postId: string
): Promise<{ url: string; key: string | null }> {
  if (!url.startsWith('data:') && !url.startsWith('blob:')) {
    return { url, key: null };
  }

  const blob = await (await fetch(url)).blob();

  const presignRes = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, postId, contentType: blob.type, size: blob.size }),
  });
  if (!presignRes.ok) {
    const { error } = await presignRes.json().catch(() => ({ error: presignRes.statusText }));
    throw new Error(error || 'Could not prepare upload');
  }
  const { uploadUrl, key } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`);
  }

  return { url: mediaUrlFromKey(key), key };
}

/** Deletes R2 media for the given posts or a whole event (host only). */
export async function deleteMediaFromR2(target: { postIds?: string[]; eventId?: string }) {
  try {
    await fetch('/api/delete-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(target),
    });
  } catch (e) {
    console.warn('deleteMediaFromR2 error:', e);
  }
}

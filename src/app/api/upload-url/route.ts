import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@/lib/supabase/server';
import { getR2Client, isR2Configured, R2_BUCKET } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowed upload types and their file extensions
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Issues a short-lived presigned PUT URL so guests (no login required) can upload
 * a single photo/video directly to R2 under `<eventId>/<postId>.<ext>`.
 */
export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'Media storage is not configured' }, { status: 503 });
  }

  let body: { eventId?: string; postId?: string; contentType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { eventId, postId, contentType, size } = body;

  if (!eventId || !UUID_RE.test(eventId) || !postId || !UUID_RE.test(postId)) {
    return NextResponse.json({ error: 'Invalid event or post id' }, { status: 400 });
  }

  const ext = contentType ? ALLOWED_TYPES[contentType] : undefined;
  if (!contentType || !ext) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const maxBytes = contentType.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (typeof size !== 'number' || size <= 0 || size > maxBytes) {
    return NextResponse.json({ error: 'File is too large' }, { status: 413 });
  }

  // Only allow uploads into events that actually exist
  const supabase = await createClient();
  const { data: event } = await supabase.from('events').select('id').eq('id', eventId).maybeSingle();
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const key = `${eventId}/${postId}.${ext}`;

  try {
    const uploadUrl = await getSignedUrl(
      getR2Client(),
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 300 }
    );
    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error('R2 presign error:', err);
    return NextResponse.json({ error: 'Could not prepare upload' }, { status: 500 });
  }
}

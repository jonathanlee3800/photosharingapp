import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';
import { getR2Client, isR2Configured, R2_BUCKET } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Removes R2 media for posts (`postIds`) or a whole event (`eventId`).
 * Only the logged-in host who owns the event may delete its media.
 * Call this BEFORE deleting the database rows, since ownership is checked against them.
 */
export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ deleted: 0 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { postIds?: string[]; eventId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const r2 = getR2Client();
  let keys: string[] = [];

  if (body.eventId) {
    if (!UUID_RE.test(body.eventId)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', body.eventId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Every object for an event lives under the "<eventId>/" prefix
    let continuationToken: string | undefined;
    do {
      const page = await r2.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          Prefix: `${body.eventId}/`,
          ContinuationToken: continuationToken,
        })
      );
      keys.push(...(page.Contents || []).map((o) => o.Key!).filter(Boolean));
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
  } else {
    const postIds = (body.postIds || []).filter((id) => UUID_RE.test(id));
    if (postIds.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }
    const { data: posts } = await supabase
      .from('posts')
      .select('storage_key, events!inner(owner_id)')
      .in('id', postIds)
      .eq('events.owner_id', user.id);
    keys = (posts || []).map((p: any) => p.storage_key).filter(Boolean);
  }

  // DeleteObjects accepts up to 1000 keys per call
  for (let i = 0; i < keys.length; i += 1000) {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      })
    );
  }

  return NextResponse.json({ deleted: keys.length });
}

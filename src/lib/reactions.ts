// Emoji reactions go to the projector only. The projector is the only screen subscribed to this
// channel; guests send over REST without subscribing, because Supabase bills one message per
// subscribed client. Each reaction costs 2 messages (1 sent + 1 projector), however many guests there are.

export const reactionsChannelName = (eventId: string) => `event-reactions-${eventId}`;

export function sendReactionToProjector(eventId: string, emoji: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  fetch(`${url.replace(/\/+$/, '')}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ topic: reactionsChannelName(eventId), event: 'reaction', payload: { emoji }, private: false }],
    }),
    keepalive: true,
  }).catch(() => {
    // A missed emoji on the projector isn't worth interrupting the guest for
  });
}

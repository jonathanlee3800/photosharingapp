// Simulates wedding guests: open the gallery, stay connected for live updates, vote in a burst.
// Refuses to run unless the event's title contains "stress test", so it can't touch a real event.
//
//   k6 run -e GUESTS=5 -e PIN=123456 -e SUPABASE_URL=https://xxx.supabase.co -e ANON_KEY=xxx load-tests/stress.js
//
// Optional: SITE, MEDIA, ARRIVE_S (guests arrive over this time), VOTE_WINDOW_S (votes land within this time).
import http from 'k6/http';
import ws from 'k6/ws';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const GUESTS = Number(__ENV.GUESTS || 5);
const PIN = __ENV.PIN;
const SUPABASE_URL = (__ENV.SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = __ENV.ANON_KEY;
const SITE = __ENV.SITE || 'https://memorieaisle.com';
const MEDIA = __ENV.MEDIA || 'https://media.memorieaisle.com';
const ARRIVE_S = Number(__ENV.ARRIVE_S || 60);
const VOTE_WINDOW_S = Number(__ENV.VOTE_WINDOW_S || 30);

const SETTLE_S = 15; // connected and idle before votes start
const COOLDOWN_S = 30; // stay connected so late updates are still counted
const VOTE_AT_S = ARRIVE_S + SETTLE_S;
const END_AT_S = VOTE_AT_S + VOTE_WINDOW_S + COOLDOWN_S;

const voteTime = new Trend('vote_ms', true);
const liveMessages = new Counter('live_updates_received');
const joined = new Counter('live_channels_joined');
const joinRefused = new Counter('live_channels_refused');
const connectionErrors = new Counter('live_connection_errors');
const limitErrors = new Counter('live_limit_errors'); // too_many_connections, tenant_events, ...
const voteErrors = new Counter('vote_errors');
const reactionLeaks = new Counter('reactions_reaching_phones'); // should stay 0

export const options = {
  scenarios: {
    guests: { executor: 'per-vu-iterations', vus: GUESTS, iterations: 1, maxDuration: `${END_AT_S + 60}s` },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    vote_ms: ['p(95)<1500'],
    vote_errors: ['count==0'],
    reactions_reaching_phones: ['count==0'],
    live_limit_errors: ['count==0'],
    live_connection_errors: ['count==0'],
    live_channels_refused: ['count==0'],
  },
};

const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' };

export function setup() {
  if (!PIN || !SUPABASE_URL || !ANON_KEY) exec.test.abort('Set PIN, SUPABASE_URL and ANON_KEY');

  const event = http.post(`${SUPABASE_URL}/rest/v1/rpc/get_event_for_guest`, JSON.stringify({ p_code: PIN }), { headers }).json();
  if (!event) exec.test.abort(`No event with PIN ${PIN}`);
  if (!/stress test/i.test(event.title)) exec.test.abort(`"${event.title}" is not titled "Stress Test". Refusing to run.`);
  if (!event.voting_open) exec.test.abort('Start a live round on the event first');

  const posts = http
    .post(`${SUPABASE_URL}/rest/v1/rpc/get_event_posts`, JSON.stringify({ p_event_id: event.id }), { headers })
    .json()
    .posts.filter((p) => p.category_tag === event.voting_prompt_id);
  if (!posts.length) exec.test.abort("Add a few photos to the round's category first");

  return { eventId: event.id, posts };
}

function loadGallery(data) {
  const page = http.get(`${SITE}/user/${PIN}/gallery`, { tags: { name: 'gallery page' } });
  check(page, { 'gallery page loads': (r) => r.status === 200 });
  http.post(`${SUPABASE_URL}/rest/v1/rpc/get_event_for_guest`, JSON.stringify({ p_code: PIN }), { headers, tags: { name: 'load event' } });
  http.post(`${SUPABASE_URL}/rest/v1/rpc/get_event_posts`, JSON.stringify({ p_event_id: data.eventId }), { headers, tags: { name: 'load posts' } });
  data.posts
    .filter((p) => p.storage_key)
    .slice(0, 6)
    .forEach((p) => {
      const img = http.get(`${MEDIA}/${p.storage_key}`, { tags: { name: 'photo' } });
      check(img, { 'photo loads': (r) => r.status === 200 });
    });
}

function vote(data, voterId) {
  const post = data.posts[Math.floor(Math.random() * data.posts.length)];
  const res = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/toggle_vote`,
    JSON.stringify({ p_post_id: post.id, p_voter_id: voterId }),
    { headers, tags: { name: 'vote' } }
  );
  voteTime.add(res.timings.duration);
  if (res.status !== 200) {
    voteErrors.add(1);
    console.warn(`vote failed ${res.status}: ${String(res.body).slice(0, 160)}`);
  }
}

// The same two channels the app opens on a guest's gallery or vote page
const channels = (eventId) => [`realtime:event-updates-${eventId}`, `realtime:event-feed-${eventId}`];

export default function (data) {
  const elapsedMs = () => Date.now() - exec.scenario.startTime;
  const voterId = `loadtest-${exec.vu.idInTest}`;

  sleep(Math.random() * ARRIVE_S); // guests don't all arrive in the same second
  loadGallery(data);

  const url = `${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0`;
  const res = ws.connect(url, {}, (socket) => {
    let ref = 0;
    const send = (topic, event, payload) =>
      socket.send(JSON.stringify({ topic, event, payload, ref: String(++ref), join_ref: String(ref) }));

    socket.on('open', () => {
      channels(data.eventId).forEach((topic) => {
        send(topic, 'phx_join', {
          config: { broadcast: { ack: false, self: false }, presence: { key: '' }, postgres_changes: [], private: false },
          access_token: ANON_KEY,
        });
      });
      socket.setInterval(() => send('phoenix', 'heartbeat', {}), 25000);

      const voteInMs = (VOTE_AT_S + Math.random() * VOTE_WINDOW_S) * 1000 - elapsedMs();
      socket.setTimeout(() => {
        vote(data, voterId);
        // The app also sends a 🥂 emoji on each vote, to the projector only (phones never receive it)
        http.post(
          `${SUPABASE_URL}/realtime/v1/api/broadcast`,
          JSON.stringify({ messages: [{ topic: `event-reactions-${data.eventId}`, event: 'reaction', payload: { emoji: '🥂' }, private: false }] }),
          { headers, tags: { name: 'vote emoji' } }
        );
      }, Math.max(0, voteInMs));
      socket.setTimeout(() => socket.close(), Math.max(1000, END_AT_S * 1000 - elapsedMs()));
    });

    socket.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (/too_many|tenant_events|rate.?limit/i.test(raw)) {
        limitErrors.add(1);
        console.warn(`limit hit: ${raw.slice(0, 200)}`);
      }
      if (msg.event === 'phx_reply' && msg.topic !== 'phoenix' && msg.payload) {
        if (msg.payload.status === 'ok') joined.add(1);
        else {
          joinRefused.add(1);
          console.warn(`channel refused: ${raw.slice(0, 200)}`);
        }
      }
      if (msg.event === 'phx_error' || msg.event === 'phx_close') connectionErrors.add(1);
      if (msg.event === 'broadcast') {
        liveMessages.add(1);
        if (/"reaction"/.test(raw)) reactionLeaks.add(1);
      }
    });

    socket.on('error', (e) => {
      connectionErrors.add(1);
      console.warn(`connection error: ${e.error()}`);
    });
  });
  check(res, { 'live connection opened': (r) => r && r.status === 101 });
}

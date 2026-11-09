// Simulates guests uploading photos: get a signed URL, PUT the file to R2, save the post.
// Refuses to run unless the event's title contains "stress test", so it can't touch a real event.
// Deleting the event in the app removes its R2 files and posts.
//
//   k6 run -e UPLOADERS=5 -e PHOTOS_EACH=2 -e FILE=C:/path/small.jpg -e PIN=123456 -e SUPABASE_URL=https://xxx.supabase.co -e ANON_KEY=xxx load-tests/uploads.js
//
// Optional: SITE, ARRIVE_S (uploaders start within this time).
import http from 'k6/http';
import exec from 'k6/execution';
import { sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const UPLOADERS = Number(__ENV.UPLOADERS || 5);
const PHOTOS_EACH = Number(__ENV.PHOTOS_EACH || 2);
const PIN = __ENV.PIN;
const SUPABASE_URL = (__ENV.SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = __ENV.ANON_KEY;
const SITE = __ENV.SITE || 'https://memorieaisle.com';
const ARRIVE_S = Number(__ENV.ARRIVE_S || 60);
const FILE = open(__ENV.FILE, 'b'); // must be a JPEG; keep it small

const signTime = new Trend('sign_url_ms', true);
const putTime = new Trend('r2_put_ms', true);
const saveTime = new Trend('save_post_ms', true);
const uploaded = new Counter('photos_uploaded');
const failed = new Counter('upload_failures');

export const options = {
  scenarios: {
    uploaders: { executor: 'per-vu-iterations', vus: UPLOADERS, iterations: PHOTOS_EACH, maxDuration: `${ARRIVE_S + 300}s` },
  },
  thresholds: {
    upload_failures: ['count==0'],
    sign_url_ms: ['p(95)<1500'],
    save_post_ms: ['p(95)<1500'],
  },
};

const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' };

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));

export function setup() {
  if (!PIN || !SUPABASE_URL || !ANON_KEY) exec.test.abort('Set PIN, SUPABASE_URL and ANON_KEY');

  const event = http.post(`${SUPABASE_URL}/rest/v1/rpc/get_event_for_guest`, JSON.stringify({ p_code: PIN }), { headers }).json();
  if (!event) exec.test.abort(`No event with PIN ${PIN}`);
  if (!/stress test/i.test(event.title)) exec.test.abort(`"${event.title}" is not titled "Stress Test". Refusing to run.`);

  const prompt = event.prompts[0];
  if (!prompt) exec.test.abort('The event needs at least one category');

  return { eventId: event.id, promptId: prompt.id };
}

function fail(step, res) {
  failed.add(1);
  console.warn(`${step} failed ${res.status}: ${String(res.body).slice(0, 160)}`);
}

export default function (data) {
  if (exec.vu.iterationInScenario === 0) sleep(Math.random() * ARRIVE_S);

  const postId = uuid();

  const signed = http.post(
    `${SITE}/api/upload-url`,
    JSON.stringify({ eventId: data.eventId, postId, contentType: 'image/jpeg', size: FILE.byteLength }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'sign url' } }
  );
  signTime.add(signed.timings.duration);
  if (signed.status !== 200) return fail('sign url', signed);
  const { uploadUrl, key } = signed.json();

  const put = http.put(uploadUrl, FILE, {
    headers: { 'Content-Type': 'image/jpeg' },
    tags: { name: 'r2 put' },
    responseType: 'none',
  });
  putTime.add(put.timings.duration);
  if (put.status !== 200) return fail('r2 put', put);

  const saved = http.post(
    `${SUPABASE_URL}/rest/v1/posts`,
    JSON.stringify({
      id: postId,
      event_id: data.eventId,
      guest_name: `Load Test ${exec.vu.idInTest}`,
      guest_id: null,
      file_url: `${SITE}/${key}`,
      storage_key: key,
      caption: 'Load test',
      category_tag: data.promptId,
      media_type: 'photo',
      is_private: false,
      is_spotlight: false,
    }),
    { headers: { ...headers, Prefer: 'return=minimal' }, tags: { name: 'save post' } }
  );
  saveTime.add(saved.timings.duration);
  if (saved.status !== 201) return fail('save post', saved);

  uploaded.add(1);
  sleep(2 + Math.random() * 3); // a guest picking their next photo
}

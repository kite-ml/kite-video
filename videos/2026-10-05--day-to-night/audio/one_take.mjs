// The whole narration in ONE ElevenLabs call, then cut into per-scene segments.
//
// Separate calls per line gave every take its own level and room tone (audible as echo when cut together).
// One call reads the script as one performance; <break> tags place the human pauses; the with-timestamps
// endpoint returns character timings, so each segment is cut at the middle of the silence before it.
//
//   ELEVENLABS_API_KEY=... ELEVEN_VOICE=Luigi node one_take.mjs
//
// Writes take.mp3 (the full read), vo*.mp3 (segments), manifest.json and alignment.json (word timings per
// segment, relative to its own start: what subs.mjs --rebuild reads).

import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY not set'); process.exit(1); }
const H = { 'xi-api-key': KEY, 'content-type': 'application/json' };
const MODEL = process.env.ELEVEN_MODEL ?? 'eleven_turbo_v2';
const b = s => `<break time="${s}s" />`;

// One performance. Pauses inside a line are part of the line; the long ones between lines are the cut points.
const SEGMENTS = [
  ['vo0a', `We recorded our robot's demos on a bright morning.`],
  ['vo0b', `By evening, ${b(0.15)} its cameras saw a different scene.`],
  ['vo1', `Kite relights your dataset to match a photo from each camera.`],
  ['vo2', `Only the light changes, ${b(0.15)} so every recorded action still lines up.`],
  ['vo3', `Kite also generates new scenes: ${b(0.3)} distractor objects, ${b(0.2)} new backgrounds, ${b(0.2)} new surfaces.`],
  ['vo4', `Augment your dataset with the Kite API.`],
];
const GAP = 1.1;                                      // seconds of silence between lines: clean cut points
const SETTINGS = { stability: 0.42, similarity_boost: 0.85, style: 0.18, use_speaker_boost: true };

const plain = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function voiceId() {
  const want = process.env.ELEVEN_VOICE ?? 'Luigi';
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: H });
  if (!r.ok) throw new Error(`voices ${r.status}`);
  const v = (await r.json()).voices.find(v => v.name.toLowerCase() === want.toLowerCase() || v.voice_id === want);
  if (!v) throw new Error(`voice ${want} not found`);
  return v;
}

const voice = await voiceId();
const text = SEGMENTS.map(([, t]) => t).join(` ${b(GAP)} `);
const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}/with-timestamps?output_format=mp3_44100_128`,
  { method: 'POST', headers: H, body: JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS }) });
if (!r.ok) throw new Error(`tts ${r.status} ${await r.text()}`);
const j = await r.json();
writeFileSync(join(HERE, 'take.mp3'), Buffer.from(j.audio_base64, 'base64'));
const al = j.alignment;                               // characters + start/end seconds, tags included or not
const dur = f => +execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim();
const total = dur(join(HERE, 'take.mp3'));

// spoken characters only (drop anything inside <...>), each with its time
const chars = [];
let inTag = false;
al.characters.forEach((ch, i) => {
  if (ch === '<') inTag = true;
  if (!inTag) chars.push({ ch, s: al.character_start_times_seconds[i], e: al.character_end_times_seconds[i] });
  if (ch === '>') inTag = false;
});
const spoken = chars.map(c => c.ch).join('');
const norm = s => s.replace(/\s+/g, ' ');

// locate each segment's spoken text in order
let cursor = 0;
const spans = SEGMENTS.map(([id, t]) => {
  const want = plain(t);
  // match on the text with whitespace collapsed
  let i = cursor, k = 0, start = -1;
  const src = spoken;
  while (i < src.length && k < want.length) {
    const a = src[i], w = want[k];
    if (/\s/.test(a) && /\s/.test(w)) { i++; k++; while (i < src.length && /\s/.test(src[i])) i++; continue; }
    if (/\s/.test(a) && start < 0) { i++; continue; }
    if (a === w) { if (start < 0) start = i; i++; k++; }
    else { if (start >= 0) { i = start + 1; k = 0; start = -1; } else { i++; } }
  }
  if (k < want.length) throw new Error(`${id}: could not find "${want}" in the alignment`);
  cursor = i;
  return { id, text: want, first: start, last: i - 1, s: chars[start].s, e: chars[i - 1].e };
});

// cut at the middle of each gap; keep a little air on both ends
const segs = [];
spans.forEach((sp, n) => {
  const prevEnd = n ? spans[n - 1].e : 0;
  const nextStart = n < spans.length - 1 ? spans[n + 1].s : total;
  const a = n ? (prevEnd + sp.s) / 2 : Math.max(0, sp.s - 0.08);
  const z = n < spans.length - 1 ? (sp.e + nextStart) / 2 : total;
  const lead = Math.min(0.12, sp.s - a), tail = Math.min(0.35, z - sp.e);
  const from = sp.s - lead, to = sp.e + tail;
  const f = join(HERE, `${sp.id}.mp3`);
  execSync(`ffmpeg -y -v error -ss ${from.toFixed(3)} -to ${to.toFixed(3)} -i "${join(HERE, 'take.mp3')}" -c:a libmp3lame -q:a 2 "${f}"`);
  // word timings relative to this segment's own start
  const words = [];
  let w = null;
  for (let c = sp.first; c <= sp.last; c++) {
    const { ch, s, e } = chars[c];
    if (/\s/.test(ch)) { if (w) { words.push(w); w = null; } continue; }
    if (!w) w = { t: '', s: s - from, e: e - from };
    w.t += ch; w.e = e - from;
  }
  if (w) words.push(w);
  segs.push({ id: sp.id, text: sp.text, duration: dur(f), from, words });
  console.log(`${sp.id}  ${dur(f).toFixed(2)}s  [${from.toFixed(2)}–${to.toFixed(2)} of the take]  "${sp.text.slice(0, 50)}"`);
});

writeFileSync(join(HERE, 'manifest.json'), JSON.stringify({
  voice: { id: voice.voice_id, name: voice.name }, model: MODEL, one_take: true,
  segments: segs.map(({ id, text, duration }) => ({ id, slotStart: 0, duration, text })),
}, null, 2));
writeFileSync(join(HERE, 'alignment.json'), JSON.stringify(Object.fromEntries(segs.map(s => [s.id, s.words])), null, 1));
console.log(`take ${total.toFixed(2)}s -> ${segs.length} segments`);

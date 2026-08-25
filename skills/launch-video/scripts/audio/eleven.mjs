// Kite Evals launch video — ElevenLabs narration + music.
//
//   ELEVENLABS_API_KEY=... node eleven.mjs            # narration (6 segments) + music
//   ELEVENLABS_API_KEY=... node eleven.mjs --vo-only
//   ELEVENLABS_API_KEY=... node eleven.mjs --music-only
//   ELEVEN_VOICE="Name or id" to override the narrator voice.
//
// Writes vo0..vo5.mp3 + music.mp3 + manifest.json (measured durations) here.

import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY not set'); process.exit(1); }
const H = { 'xi-api-key': KEY, 'content-type': 'application/json' };
const args = process.argv.slice(2);

// ---- the script (bookends read as VO placeholders until the on-camera takes exist) ----
const TIRED = { stability: 0.6, similarity_boost: 0.85, style: 0.08, use_speaker_boost: true };
const SEGMENTS = [
  // Hook: one segment per on-screen line, placed exactly at each line's reveal.
  { id: 'vo0a', slotStart: 0.35, text: `Testing a policy means babysitting a robot.`, settings: TIRED },
  { id: 'vo0b', slotStart: 2.10, text: `Hours of watching every run.`, settings: TIRED },
  { id: 'vo0c', slotStart: 4.30, text: `And you still don't know where it breaks.`, settings: TIRED },
  { id: 'vo1', slotStart: 7.45, text: `Kite Evals runs a thousand simulations at once.` },
  { id: 'vo2', slotStart: 14.45, text: `Every condition you care about is tested.` },
  { id: 'vo3', slotStart: 22.45, text:
    `You get a full report on the reasons your policy failed. Every rollout comes back labeled, and agents cluster the failures for you.` },
  { id: 'vo4', slotStart: 34.55, text:
    `Open any run. Twenty-three percent success — and exactly which mugs it dropped, and when.` },
  { id: 'vo4b', slotStart: 46.5, text:
    `Then change the objects, the lighting — even the robot — and run it all again.` },
  { id: 'vo5', slotStart: 54.35, text:
    `We're in early access, with teams across manufacturing, logistics, lab automation, and retail. Bring one policy. We'll show you where it breaks.` },
];
const DEFAULT_SETTINGS = { stability: 0.45, similarity_boost: 0.85, style: 0.12, use_speaker_boost: true };
const MODEL = process.env.ELEVEN_MODEL ?? 'eleven_multilingual_v2';

const MUSIC_PROMPT =
  'Upbeat minimal electronic backing track for a tech product launch video. ' +
  'Clean synth pulse, soft four-on-the-floor kick around 104 BPM, subtle plucks and a warm pad, ' +
  'understated and precise, optimistic but restrained, modern developer-tool aesthetic. ' +
  'Instrumental only, no vocals, no risers or cheesy EDM drops. ' +
  'Gentle intro over the first two bars, steady groove, calm confident outro that resolves cleanly at the end.';
const MUSIC_MS = +(process.env.MUSIC_MS ?? 58000);

const dur = f => +execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim();

// Premade ElevenLabs voices, usable by id even when the key lacks voices_read.
const PREMADE = {
  Brian: 'nPczCjzI2devNBz1zQrb', Daniel: 'onwK4e9ZLuTAKqWW03F9',
  George: 'JBFqnCBsd6RMkjVDRZzb', Adam: 'pNInz6obpgDQGcFmaJgB',
  Antoni: 'ErXwobaYiN019PkySvjV', Rachel: '21m00Tcm4TlvDq8ikWAM',
};

async function pickVoice() {
  const want = process.env.ELEVEN_VOICE;
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: H });
  if (!r.ok) {
    console.warn(`voices list unavailable (${r.status}) — using premade voice ids`);
    if (want) return { voice_id: PREMADE[want] ?? want, name: want };
    return { voice_id: PREMADE.Brian, name: 'Brian' };
  }
  const { voices } = await r.json();
  if (want) {
    const v = voices.find(v => v.voice_id === want || v.name.toLowerCase() === want.toLowerCase());
    if (v) return v;
    console.warn(`voice "${want}" not found in account list; trying as raw id`);
    return { voice_id: want, name: want };
  }
  for (const name of ['Brian', 'George', 'Daniel', 'Roger', 'Adam', 'Antoni', 'Rachel']) {
    const v = voices.find(v => v.name === name || v.name.startsWith(name + ' '));
    if (v) return v;
  }
  return voices[0];
}

async function tts(voice) {
  // --only vo0,vo4b regenerates just those ids; everything else must already
  // exist on disk. The manifest is rebuilt from disk for ALL segments either way.
  const onlyArg = args.find(a => a.startsWith('--only'));
  const only = onlyArg ? (onlyArg.split('=')[1] ?? args[args.indexOf(onlyArg) + 1]).split(',') : null;
  const manifest = [];
  for (const seg of SEGMENTS) {
    const f = join(HERE, `${seg.id}.mp3`);
    if (!only || only.includes(seg.id)) {
      const body = {
        text: seg.text, model_id: MODEL,
        voice_settings: seg.settings ?? DEFAULT_SETTINGS,
      };
      const r = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`,
        { method: 'POST', headers: H, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`${seg.id}: ${r.status} ${await r.text()}`);
      writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    }
    const d = dur(f);
    manifest.push({ id: seg.id, slotStart: seg.slotStart, duration: d, text: seg.text });
    console.log(`${seg.id}  ${d.toFixed(2)}s ${only && !only.includes(seg.id) ? '(kept)' : '(new)'}  "${seg.text.slice(0, 44)}…"`);
  }
  writeFileSync(join(HERE, 'manifest.json'),
    JSON.stringify({ voice: { id: voice.voice_id, name: voice.name }, model: MODEL, segments: manifest }, null, 2));
}

async function music() {
  const tries = [
    ['https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128',
      { prompt: MUSIC_PROMPT, music_length_ms: MUSIC_MS }],
    ['https://api.elevenlabs.io/v1/music/compose?output_format=mp3_44100_128',
      { prompt: MUSIC_PROMPT, music_length_ms: MUSIC_MS }],
  ];
  for (const [url, body] of tries) {
    const r = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify(body) });
    if (r.ok) {
      const f = join(HERE, 'music.mp3');
      writeFileSync(f, Buffer.from(await r.arrayBuffer()));
      console.log(`music  ${dur(f).toFixed(2)}s  <- ${url.split('?')[0]}`);
      return;
    }
    console.warn(`music endpoint ${url.split('/v1/')[1].split('?')[0]}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  }
  throw new Error('all music endpoints failed');
}

const voice = args.includes('--music-only') ? null : await pickVoice();
if (voice) console.log('narrator:', voice.name, voice.voice_id);
if (!args.includes('--music-only')) await tts(voice);
if (!args.includes('--vo-only')) await music();

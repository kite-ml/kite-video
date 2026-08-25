// Luigi avatar for the hook: lip-synced talking-head via ElevenCreative Flows
// (model creatify-aurora: character image + speech audio -> video).
//
//   ELEVENLABS_API_KEY=... node avatar.mjs [--image path.jpg] [--asset <asset_id>] [--res 720p]
//
// Steps: build the hook audio exactly as it sits in the final mix (vo0a/b/c
// at their output-time starts, padded to the S0 length) -> POST /v1/flows/video
// -> poll -> download avatar.mp4 -> extract 30fps frames into ../stage/assets/avatar
// -> write ../stage/assets/avatar/avatar.js for the stage.
//
// Needs the key scope image_video_generation.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY not set'); process.exit(1); }
const args = process.argv.slice(2);
const str = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const RES = str('--res', '720p');
const IMAGE = str('--image', join(HERE, '..', '..', 'public', 'authors', 'luigi-dintrono.jpg'));
const ASSET = str('--asset', null);
const OUTDIR = join(HERE, '..', 'stage', 'assets', 'avatar');
mkdirSync(OUTDIR, { recursive: true });
const sh = c => execSync(c, { stdio: 'pipe' }).toString();

// ---- 1. hook audio in output time ----
const T = JSON.parse(readFileSync(join(HERE, '..', 'stage', 'timing.js'), 'utf8').replace(/^window\.TIMING=/, '').replace(/;\s*$/, ''));
const { s0len, vo } = T.hook;
const inputs = vo.map(([id]) => `-i "${join(HERE, id + '.mp3')}"`).join(' ');
const delays = vo.map(([, st], i) => `[${i}:a]aresample=44100,adelay=${Math.round(st * 1000)}|${Math.round(st * 1000)}[d${i}]`).join(';');
const mix = vo.map((_, i) => `[d${i}]`).join('');
const hookMp3 = join(HERE, 'hook_vo.mp3');
sh(`ffmpeg -y -v error ${inputs} -filter_complex "${delays};${mix}amix=inputs=${vo.length}:normalize=0,apad=whole_dur=${s0len}[o]" -map "[o]" -c:a libmp3lame -q:a 2 "${hookMp3}"`);
console.log(`hook audio: ${hookMp3} (${s0len}s)`);

// ---- 2. create generation ----
const H = { 'xi-api-key': KEY, 'content-type': 'application/json' };
const image = ASSET
  ? { type: 'asset', asset_id: ASSET }
  : { type: 'inline_base64', content_base64: readFileSync(IMAGE).toString('base64'),
      mime_type: IMAGE.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg' };
const body = {
  model_id: 'creatify-aurora',
  image,
  audio: { type: 'inline_base64', content_base64: readFileSync(hookMp3).toString('base64'), mime_type: 'audio/mpeg' },
  resolution: RES,
};
let r = await fetch('https://api.elevenlabs.io/v1/flows/video', { method: 'POST', headers: H, body: JSON.stringify(body) });
if (!r.ok) throw new Error(`create: ${r.status} ${await r.text()}`);
const { id } = await r.json();
console.log('generation', id, '— polling…');

// ---- 3. poll ----
let out;
for (let i = 0; i < 240; i++) {
  await new Promise(res => setTimeout(res, 5000));
  r = await fetch(`https://api.elevenlabs.io/v1/flows/video/${id}`, { headers: H });
  if (!r.ok) throw new Error(`get: ${r.status} ${await r.text()}`);
  out = await r.json();
  if (i % 6 === 0) console.log(`  ${(i * 5)}s  status=${out.status}`);
  if (out.status === 'completed' || out.status === 'failed') break;
}
if (out.status !== 'completed') throw new Error(`generation ${out.status}: ${out.error_message ?? ''} (${out.failure_reason ?? ''})`);

// ---- 4. download + frames ----
const mp4 = join(HERE, 'avatar.mp4');
const vr = await fetch(out.content_url);
writeFileSync(mp4, Buffer.from(await vr.arrayBuffer()));
const info = sh(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "${mp4}"`).trim();
console.log('avatar.mp4', info);
for (const f of readdirSync(OUTDIR)) if (f.endsWith('.jpg')) unlinkSync(join(OUTDIR, f));
sh(`ffmpeg -y -v error -i "${mp4}" -vf "fps=30,scale=960:-2" -q:v 3 "${join(OUTDIR, 'f_%04d.jpg')}"`);
const n = readdirSync(OUTDIR).filter(f => f.endsWith('.jpg')).length;
const [w, h] = info.split(',').map(Number);
writeFileSync(join(OUTDIR, 'avatar.js'), `window.AVATAR=${JSON.stringify({ n, fps: 30, w, h })};\n`);
console.log(`frames: ${n} @30fps -> ${OUTDIR}`);

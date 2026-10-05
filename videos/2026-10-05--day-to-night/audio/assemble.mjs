// Final assembly: frame sequence + placed VO + ducked music -> ../out/kite-evals-launch.mp4
//
//   node assemble.mjs                # needs ../out/frames, vo*.mp3, vo-starts.json, music.mp3
//   node assemble.mjs --silent       # video from frames only (no audio yet)

import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'out');
const FPS = 30;
const sh = c => { console.log('+', c.length > 220 ? c.slice(0, 220) + ' …' : c); execSync(c, { stdio: 'inherit' }); };
// --frames frames2 --out kite-evals-launch-v2.mp4   (defaults = v1)
const argv = process.argv.slice(2);
const str = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const FRAMES_DIR = str('--frames', 'frames');
const OUT_NAME = str('--out', 'kite-evals-launch.mp4');
const TAG = FRAMES_DIR === 'frames' ? '' : '_' + FRAMES_DIR;

const nFrames = readdirSync(join(OUT, FRAMES_DIR)).filter(f => f.endsWith('.png')).length;
const DUR = nFrames / FPS;
console.log(`${nFrames} frames -> ${DUR.toFixed(2)}s`);

// ---- 1. silent video from frames ----
sh(`ffmpeg -y -v error -framerate ${FPS} -i "${join(OUT, FRAMES_DIR, 'frame_%05d.png')}" ` +
   `-c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart "${join(OUT, 'video_silent' + TAG + '.mp4')}"`);

if (process.argv.includes('--silent')) process.exit(0);

// ---- 2. VO timeline: level each take to one loudness (ElevenLabs takes vary by up to 10 dB), place it ----
const starts = JSON.parse(readFileSync(join(HERE, 'vo-starts.json'), 'utf8'));
const TARGET_LUFS = -21;
const lufs = f => +execSync(`ffmpeg -v info -i "${f}" -af ebur128 -f null - 2>&1 | grep -E "^\\s+I:" | tail -1`)
  .toString().match(/I:\s+(-?[\d.]+)/)[1];
// One-take narration (one_take.mjs): one gain for the whole read, so its natural dynamics survive.
// Separate takes (eleven.mjs): level each one.
const oneTake = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8')).one_take;
const takeGain = oneTake ? Math.max(-6, Math.min(12, TARGET_LUFS - lufs(join(HERE, 'take.mp3')))) : null;
const gains = starts.map(s => oneTake ? takeGain : Math.max(-6, Math.min(10, TARGET_LUFS - lufs(join(HERE, s.id + '.mp3')))));
starts.forEach((s, i) => console.log(`  ${s.id}  gain ${gains[i] >= 0 ? '+' : ''}${gains[i].toFixed(1)} dB`));
const inputs = starts.map(s => `-i "${join(HERE, s.id + '.mp3')}"`).join(' ');
// Gentle downward expander after leveling: the clone carries room tone (~-55 dBFS once leveled) that reads as echo in
// the pauses. Below -42 dBFS it eases the floor down by up to 18 dB; speech measured unchanged (0.0 dB at p5).
const EXPANDER = 'agate=threshold=0.0079:ratio=3:range=0.126:attack=3:release=200:knee=2.8:detection=rms';
const delays = starts.map((s, i) =>
  `[${i}:a]aresample=48000,volume=${gains[i].toFixed(2)}dB,${EXPANDER},alimiter=limit=0.891:attack=5:release=60:level=0,` +
  `adelay=${Math.round(s.start * 1000)}|${Math.round(s.start * 1000)}[d${i}]`).join(';');
const mixIn = starts.map((_, i) => `[d${i}]`).join('');
sh(`ffmpeg -y -v error ${inputs} -filter_complex "${delays};${mixIn}amix=inputs=${starts.length}:normalize=0,` +
   `apad=whole_dur=${DUR}[vo]" -map "[vo]" -c:a pcm_s16le "${join(OUT, 'vo.wav')}"`);

// ---- 3. music: trim, fade, duck under VO, mix, loudness-normalize ----
const fadeOutAt = Math.max(0, DUR - 2.8);
sh(`ffmpeg -y -v error -i "${join(OUT, 'vo.wav')}" -i "${join(HERE, 'music.mp3')}" -filter_complex ` +
   `"[1:a]aresample=48000,atrim=0:${DUR},asetpts=PTS-STARTPTS,` +
   `afade=t=in:st=0:d=0.6,afade=t=out:st=${fadeOutAt.toFixed(2)}:d=2.8,volume=-12.5dB[mus];` +
   `[mus][0:a]sidechaincompress=threshold=0.015:ratio=9:attack=25:release=420:makeup=1[duck];` +
   `[0:a][duck]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[mix]" ` +
   `-map "[mix]" -ar 48000 -c:a aac -b:a 192k "${join(OUT, 'audio_mix.m4a')}"`);

// ---- 4. mux ----
sh(`ffmpeg -y -v error -i "${join(OUT, 'video_silent' + TAG + '.mp4')}" -i "${join(OUT, 'audio_mix.m4a')}" ` +
   `-c:v copy -c:a copy -shortest -movflags +faststart "${join(OUT, OUT_NAME)}"`);
console.log('==> out/' + OUT_NAME);

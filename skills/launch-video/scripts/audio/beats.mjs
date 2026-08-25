// Detect the music's beat grid (BPM + phase) from the kick energy, so scene
// cuts can snap to beats. Writes beats.json {bpm, period, phase, beats:[...]}.
//
//   node beats.mjs

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SR = 22050, HOP = 256;                 // ~11.6ms envelope resolution

// low-passed mono PCM — kicks only
const raw = execSync(
  `ffmpeg -v error -i "${join(HERE, 'music.mp3')}" -af "lowpass=f=130,lowpass=f=130" -f s16le -ac 1 -ar ${SR} -`,
  { maxBuffer: 1 << 28 });
const n = raw.length >> 1;
const env = [];
for (let i = 0; i + HOP <= n; i += HOP) {
  let s = 0;
  for (let j = i; j < i + HOP; j++) { const v = raw.readInt16LE(j * 2) / 32768; s += v * v; }
  env.push(Math.sqrt(s / HOP));
}
// onset strength: positive energy delta
const on = env.map((e, i) => Math.max(0, e - (env[i - 1] ?? 0)));
const hopS = HOP / SR;

// autocorrelate onsets over 60–170 BPM
let best = { score: -1, lag: 0 };
const L0 = Math.round(60 / 170 / hopS), L1 = Math.round(60 / 60 / hopS);
for (let lag = L0; lag <= L1; lag++) {
  let s = 0;
  for (let i = 0; i + lag < on.length; i++) s += on[i] * on[i + lag];
  // mild preference for faster grids when harmonics tie (score halves at double lag)
  const score = s / Math.sqrt(lag);
  if (score > best.score) best = { score, lag };
}
const period = best.lag * hopS;

// phase: grid offset that catches the most onset energy (±1 hop window)
let bestPhase = { score: -1, off: 0 };
for (let off = 0; off < best.lag; off++) {
  let s = 0;
  for (let i = off; i < on.length; i += best.lag) s += (on[i] ?? 0) + 0.5 * ((on[i - 1] ?? 0) + (on[i + 1] ?? 0));
  if (s > bestPhase.score) bestPhase = { score: s, off };
}
const phase = bestPhase.off * hopS;
const durS = env.length * hopS;
const beats = [];
for (let t = phase; t < durS; t += period) beats.push(+t.toFixed(3));

const bpm = 60 / period;
writeFileSync(join(HERE, 'beats.json'), JSON.stringify({ bpm: +bpm.toFixed(2), period: +period.toFixed(4), phase: +phase.toFixed(3), beats }, null, 1));
console.log(`bpm ${bpm.toFixed(1)}  period ${period.toFixed(3)}s  phase ${phase.toFixed(3)}s  (${beats.length} beats over ${durS.toFixed(1)}s)`);

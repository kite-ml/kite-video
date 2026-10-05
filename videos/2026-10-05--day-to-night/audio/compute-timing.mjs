// From measured VO durations (manifest.json) + the detected beat grid
// (beats.json), decide final scene lengths and emit:
//   ../out/timing.json    — piecewise anchors [outputT, stageT] for render.mjs
//   ./vo-starts.json      — final start time (s) per segment for the mix
//   ../stage/timing.js    — hook line reveals + every phrase start, in STAGE time
//
// Scene 0 holds TWO hook segments (vo0a/b) from one read, placed by their words
// (alignment.json) so the pause between them is exact. Phrase starts inside a
// segment come from its internal silences, word starts from the alignment.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { segments } = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'));
const { period, phase } = JSON.parse(readFileSync(join(HERE, 'beats.json'), 'utf8'));
const seg = id => segments.find(s => s.id === id);

// stage-time scene starts + end: hook, relight, proof, generate, ask
const NOM = [0, 6.9, 11.5, 16.8, 24.5, 29.1];
const TGT = [5.0, 3.5, 4.1, 6.3, 4.3];           // output-time target length per scene (v2: tighter)
const LEAD = [null, 0.15, 0.15, 0.15, 0.25];      // VO start offset inside scenes 1..4
const TAIL = 0.12;

const snapBeat = (t, min) => {
  const k = Math.round((t - phase) / period);
  let s = phase + k * period;
  while (s < min - 1e-9) s += period;
  return +s.toFixed(3);
};

// internal pauses -> phrase starts (seconds into the take)
const phraseStarts = id => {
  const log = execSync(`ffmpeg -v info -i "${join(HERE, id + '.mp3')}" -af silencedetect=n=-40dB:d=0.2 -f null - 2>&1`).toString();
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  const d = seg(id).duration;
  return [0, ...ends.filter(e => e < d - 0.15)];
};

// --- scene 0: two hook lines, a tight pause between them ----------------
const AL = JSON.parse(readFileSync(join(HERE, 'alignment.json'), 'utf8'));   // word timings, segment-relative
const a = seg('vo0a'), b = seg('vo0b');
const aStart = 0.15;
const GAP_AB = 0.25;                           // "…a bright morning." → "By evening…"
const bStart = +(aStart + AL.vo0a.at(-1).e + GAP_AB - AL.vo0b[0].s).toFixed(3);
const s0need = bStart + AL.vo0b.at(-1).e + 0.3;    // a short beat on the evening frame, then cut
const s0len = Math.max(TGT[0], snapBeat(s0need, s0need - 0.2));
const k0 = NOM[1] / s0len;                     // output -> stage factor for S0
console.log(`S0: a@${aStart} b@${bStart}  len ${s0len.toFixed(3)}`);

// --- remaining scenes: one segment each ----------------------------------
const order = ['vo1', 'vo2', 'vo3', 'vo4'];
const outStarts = [0, s0len];
const voStarts = [{ id: 'vo0a', start: aStart }, { id: 'vo0b', start: bStart }];
order.forEach((id, j) => {
  const i = j + 1;
  const s = seg(id);
  const need = LEAD[i] + s.duration + TAIL;
  const len = Math.max(TGT[i], need);
  voStarts.push({ id, start: +(outStarts[i] + LEAD[i]).toFixed(3), duration: s.duration });
  const raw = outStarts[i] + len;
  const snapped = (i < NOM.length - 2)
    ? snapBeat(raw, outStarts[i] + Math.max(need, TGT[i] - 0.35))
    : +raw.toFixed(3);
  outStarts.push(snapped);
});
const anchors = outStarts.map((o, i) => [+o.toFixed(3), NOM[i]]);

// output time -> stage time (piecewise linear through the anchors)
const stageOf = t => {
  for (let i = 0; i < anchors.length - 1; i++) {
    const [o0, s0] = anchors[i], [o1, s1] = anchors[i + 1];
    if (t <= o1 || i === anchors.length - 2) return s0 + (s1 - s0) * Math.min(Math.max((t - o0) / (o1 - o0), 0), 1);
  }
  return anchors.at(-1)[1];
};
const phrases = {};
for (const v of voStarts) phrases[v.id] = phraseStarts(v.id).map(p => +stageOf(v.start + p).toFixed(3));
const words = {};                              // every word's start in stage time (hook text lands on its word)
for (const v of voStarts) words[v.id] = (AL[v.id] || []).map(w => [w.t, +stageOf(v.start + w.s).toFixed(3)]);

writeFileSync(join(HERE, '..', 'out', 'timing.json'), JSON.stringify({ anchors }, null, 2));
writeFileSync(join(HERE, 'vo-starts.json'), JSON.stringify(voStarts, null, 2));
const hook = {
  s0len: +s0len.toFixed(3),
  lines: [aStart, bStart].map(x => +(x * k0).toFixed(3)),
  vo: [['vo0a', aStart, a.duration], ['vo0b', bStart, b.duration]],
};
const beatStage = [];                          // beat grid in stage time, for cut-on-beat montage
for (let t = phase; t < outStarts.at(-1); t += period) beatStage.push(+stageOf(t).toFixed(3));
writeFileSync(join(HERE, '..', 'stage', 'timing.js'),
  `window.TIMING=${JSON.stringify({ hook, anchors, phrases, words, beats: beatStage })};\n`);
console.log('scene starts:', outStarts.map(x => x.toFixed(2)).join('  '));
console.log('total:', outStarts.at(-1).toFixed(2), 's');
console.log('phrases (stage t):', JSON.stringify(phrases));

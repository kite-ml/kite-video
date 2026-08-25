// From measured VO durations (manifest.json) + the detected beat grid
// (beats.json), decide final scene lengths and emit:
//   ../out/timing.json    — piecewise anchors [outputT, stageT] for render.mjs
//   ./vo-starts.json      — final start time (s) per segment for the mix
//
// Scene 0 holds THREE hook segments (vo0a/b/c) placed sequentially — each
// one lands exactly on its on-screen line reveal. The script prints the
// stage-time line reveals to paste into the stage if they drift.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { segments } = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'));
const { period, phase } = JSON.parse(readFileSync(join(HERE, 'beats.json'), 'utf8'));
const seg = id => segments.find(s => s.id === id);

const NOM = [0, 7, 14, 22, 34, 46, 54, 66];   // stage-time scene starts + end
// output-time target length per scene (s5 = 12.4: two extra seconds of chips air)
const TGT = [9.417, 5.0, 5.5, 8.0, 10.0, 5.69, 12.4];
const TAIL = 0.25;

const snapBeat = (t, min) => {
  const k = Math.round((t - phase) / period);
  let s = phase + k * period;
  while (s < min - 1e-9) s += period;
  return +s.toFixed(3);
};

// --- scene 0: sequential hook lines -------------------------------------
const a = seg('vo0a'), b = seg('vo0b'), c = seg('vo0c');
const aStart = 0.35;
const bStart = +(aStart + a.duration + 0.55).toFixed(3);
const cStart = +(bStart + b.duration + 0.60).toFixed(3);
const s0need = cStart + c.duration + 1.0;
const s0len = Math.max(TGT[0], snapBeat(s0need, s0need - 0.28));
const k0 = 7 / s0len;                          // output -> stage factor for S0
console.log(`S0: a@${aStart} b@${bStart} c@${cStart}  len ${s0len.toFixed(3)}`);
console.log(`    stage line reveals: L1 ${(aStart * k0).toFixed(2)}  L2 ${(bStart * k0).toFixed(2)}  L3 ${(cStart * k0).toFixed(2)}  (HF factor 7/${s0len.toFixed(3)})`);

// --- remaining scenes: one segment each ----------------------------------
const order = ['vo1', 'vo2', 'vo3', 'vo4', 'vo4b', 'vo5'];
const outStarts = [0, s0len];
const voStarts = [{ id: 'vo0a', start: aStart }, { id: 'vo0b', start: bStart }, { id: 'vo0c', start: cStart }];
order.forEach((id, j) => {
  const i = j + 1;                             // scene index
  const s = seg(id);
  const lead = s.slotStart - NOM[i];
  const need = lead + s.duration + TAIL;
  const len = Math.max(TGT[i], need);
  voStarts.push({ id, start: +(outStarts[i] + lead).toFixed(3), duration: s.duration });
  const raw = outStarts[i] + len;
  const snapped = (i < NOM.length - 2)
    ? snapBeat(raw, outStarts[i] + Math.max(need + 0.05, TGT[i] - 0.35))
    : +raw.toFixed(3);
  outStarts.push(snapped);
});
const anchors = outStarts.map((o, i) => [o, NOM[i]]);
writeFileSync(join(HERE, '..', 'out', 'timing.json'), JSON.stringify({ anchors }, null, 2));
writeFileSync(join(HERE, 'vo-starts.json'), JSON.stringify(voStarts, null, 2));
// stage-side bridge (file:// pages can't fetch JSON): S0 length, hook line reveals
// in stage time, and the hook VO layout in output time (for the avatar lip-sync).
const hook = {
  s0len: +s0len.toFixed(3),
  lines: [aStart, bStart, cStart].map(x => +(x * k0).toFixed(3)),
  vo: [['vo0a', aStart, a.duration], ['vo0b', bStart, b.duration], ['vo0c', cStart, c.duration]],
};
writeFileSync(join(HERE, '..', 'stage', 'timing.js'), `window.TIMING=${JSON.stringify({ hook, anchors })};\n`);
console.log('scene starts:', outStarts.map(x => x.toFixed(2)).join('  '));
console.log('total:', outStarts.at(-1).toFixed(2), 's');

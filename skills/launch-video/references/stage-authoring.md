# Stage authoring

The stage is a single self-contained HTML file. One rule: **`window.seek(t)` renders frame `t`
from scratch.** No CSS animations, no transitions, no `requestAnimationFrame` state, no
accumulation between frames — the renderer jumps around the timeline and every frame must be
reproducible in isolation.

## Required globals

```js
window.DUR    = 66;                       // nominal stage duration (seconds)
window.seek   = t => { … };               // renders frame t
window.READY  = Promise.all([…]);         // fonts + every image decoded; renderer awaits it
window.STILLS = [{name:'scene1-hero', t:7.55}, …];   // hero stills for --stills
```

`READY` must include `document.fonts.ready` **and** an `Image()` preload of every frame asset —
otherwise the first frames render with fallback fonts or blank tiles.

## Helpers that carry the motion language

```js
const P=(t,a,b)=>clamp((t-a)/(b-a),0,1);            // progress within a window
const cubicOut=x=>1-Math.pow(1-x,3);                 // arrivals
const cubicInOut=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;  // camera moves
const backOut=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};  // overshoot
function rng(seed){…}                                // seeded PRNG — deterministic layout
```

Randomness must come from a **seeded** PRNG at build time (cell positions, jitter, tile choices),
never `Math.random()` inside `seek`.

Don't write moves from scratch: `inspiration/motions/index.html` (repo root) implements the 12
signature moves from the reference films — typewriter, cascade+count, travel-orb, multiply-grid,
chip-pops, draw-line, orbit, stream-log, camera-glide, branch-merge, label-swap, morph-logo —
in exactly this idiom. Copy a section's markup + its `seekMotion` block and retime it.

## Camera (continuous-canvas stages)

```js
const CAM=[[t,cx,cy,zoom], …];                       // keyframes, eased with cubicInOut
function camera(t){ … zoom interpolated in log space …
  const dx=5*Math.sin(0.61*t)+3*Math.sin(1.3*t+2);   // micro-drift, never dead-still
  return [x+dx, y+dy, z*(1+0.004*Math.sin(0.47*t))]; }
$('world').style.transform=`translate(960px,540px) scale(${z}) translate(${-cx}px,${-cy}px)`;
```

World coordinates are authored once; every element's screen position follows from the camera.
Center each keyframe on the beat's subject, and derive headline `left` from that same x.

## Scene visibility

```js
const W={hook:[0,7], gw:[7,34], s4:[34,46], mont:[46,54], closer:[54,66]};
const XF=0.14;                                        // crossfade width
```

Crossfades mean a scene's code runs slightly before its window — clamp scene-local time
(`Math.max(0, t - W.x[0])`) or you'll index arrays at −1 and the render dies mid-run.

## Timing bridge

`file://` pages can't `fetch()` JSON, so `compute-timing.mjs` writes `stage/timing.js`
(`window.TIMING = {hook:{s0len, lines, vo}, anchors}`) and `subs.mjs` writes `stage/subs.js`
(`window.SUBS = [{s,e,text}]`, in **stage** time). Include both with `<script src>` and read them
with a fallback so the stage still opens standalone:

```js
const TH=(window.TIMING&&window.TIMING.hook)||{s0len:9.417,lines:[0.26,2.57,4.29]};
const K0=7/TH.s0len;    // output→stage factor inside the hook (beat grid, avatar frames)
```

## Measured geometry

Anything pointing at a laid-out element (connector curves, callouts) must measure after fonts load:

```js
window.READY=Promise.all([…]).then(()=>buildConnectors());   // reads getBoundingClientRect()
```

Hardcoded coordinates drift the moment copy or font metrics change — this caused a visible
misalignment that shipped once.

## Dev scrubber

Gate a scrubber on `?dev` (`<input type=range>` + play button driving `seek`). Preview in a
browser, but treat **headless screenshots as authoritative** — the preview pane viewport is
smaller than 1920×1080 and will mislead you.

# Design decisions — apply by default

Settled over the Kite Evals launch video (~15 review rounds). These are defaults, not laws —
but change them deliberately, and never re-litigate them from scratch.

## Source of truth: cotufa

Read **`graphics/BRAND.md`** (the cotufa playbook, live at <https://kiteml.com/brand-playbook>)
before authoring; tokens come from `graphics/dist/theme.css`. Everything below is how that brand
behaves *in motion* — the playbook's four principles decide most of it:

| Cotufa principle | What it means in a video |
|---|---|
| **Control** — IDE-grade precision | Real UI, real episode ids and camera keys in mono; nothing decorative that isn't functional. |
| **Motion** — "shown moving, not posed" | A camera that never sits still, transitions that carry the subject, real rollout footage over stills. |
| **Trust** — monochrome restraint, product proof before decoration | Paper/ink grounds, no gradient washes, and the product-UI beat gets the most screen time. |
| **Frontier** — signal color appears rarely, so it feels earned | Signal palette for data only (pass/fail), one hairline rail per card, the gradient period after "Bring one policy". |

## Motion language

The reference is the ElevenLabs launch films: **one continuous canvas the camera moves across**,
not a slideshow of scenes.

- **Continuous world.** Lay the whole story out on one horizontal axis in world space
  (hero tile → grid → clusters/report → wire → product UI). The camera dollies laterally,
  leans in, pulls back to a "map" of the pipeline, then dives into the next station.
  Objects persist as faint ghosts after their beat — it reads as one system, not five slides.
- **Never dead-still.** Add micro-drift to the camera (a few px of layered sine) so even holds breathe.
- **Every camera end-state is centered on that beat's subject.** This was the single most-repeated
  note. Compute headline positions from the camera x for that beat, not from the page.
- **Overshoot entrances** (`backOut`) for panels, rows, windows, chips, lockups. Fades alone feel dead.
- **Word-staggered headlines**: each word rises + de-blurs ~60ms apart; headline appears
  *slightly before* its phase, not after.
- **Recurring hero motif**: the Kite mark is the policy — it opens the light world, fans into the
  grid, and returns as the end-card lockup.
- **Transitions must carry the subject.** Don't cut to empty space and let elements trickle in;
  move the thing the viewer is watching (e.g. failures *swarm* from the grid into clusters while
  the camera follows) — rejected version: tilt down to empty paper, cells fall in a column.
- **Reveals over crossfades** at theme changes: radial `clip-path` circle out of the hero mark
  (ink → light), and the montage grows out of the product UI's camera tile.
- Crossfade width 0.14s. Longer reads as a dissolve and kills the pace.

## Pacing

- **50–60s total.** ~2.4 words/sec of VO is a relaxed, confident read.
- Target scene lengths (output time): hook 9.4 · fan-out 5 · cascade 5.5 · clusters 8 ·
  product UI 10 · montage 5.7 (= 5 clips × 2 beats) · closer 12.4.
- **Cuts land on the beat grid.** Detect BPM/phase from the actual generated track (`beats.mjs`),
  snap every scene boundary. ~105 BPM ⇒ 0.569s period; a 2-beat clip is 1.14s.
- **Give the closer air.** "Bring one policy." needs ~2s of chips-holding before it lands, and a
  beat of silence after the last line before the end card. Choppy closers were flagged twice.

## Scene grammar

1. **Hook (ink)** — state the user's *problem*, not the product's mechanism. It must sound like a
   tired engineer, not a pitch: "Testing a policy means babysitting a robot. Hours of watching
   every run. And you still don't know where it breaks." Lines type in with a caret, one VO
   segment each. Right side: a card/carousel of real robot datasets shuffling **on every beat**.
2. **Scale (paper)** — policy tile fans out into a 40×25 grid that fills, then flips green/red in
   random order (never row-by-row; random reads as parallel).
3. **Reasons (paper)** — reds swarm into 4 labeled clusters; report panel with counts + bars.
4. **Product UI (paper)** — the only beat that proves the product is real, so give it the most
   time: cursor moves, clicks a failed episode, dual camera view loads, subgoal timeline + logs.
   Use **real sim footage** with the real failure labels.
5. **Variety (full-bleed)** — 5 real clips, hard cut every 2 beats, alternating punch-in /
   slow-push. Different robots, environments, lighting.
6. **Closer (ink)** — early-access chips → "Bring one policy." → "We'll show you where it breaks."
   → end card.

## Copy rules

- **No AI-flavored aphorisms.** "Not a score. The reasons." was rejected as AI-sounding; write a
  normal sentence a human would say: "You get a full report on the reasons your policy failed."
- **No unverified specifics in the pitch** (e.g. "thirty minutes, not a week" was cut). Speak to
  the user's problem and the value instead: "Every condition you care about is tested."
- **Slide text and VO should complement, not duplicate**, but must never contradict — if the sim
  shows a bottle, don't say "mugs".
- **No decorative page furniture**: corner labels like "KITE EVALS / CLOUD EVAL · 08.2026" were
  cut. Dashed rails only.
- **No caption pills restating the VO** over full-bleed footage (removed from the montage).

## Typography & color (cotufa)

Tokens live in `graphics/dist/theme.css` — copy them, don't retype them.

- Google Sans for all display copy; JetBrains Mono is "the voice of the machine" — state, metrics,
  paths, logs, episode ids, camera keys — **never body copy**. **End card is all Google Sans.**
  (The stage bundles `GoogleSansFlex` woff2 locally for deterministic headless rendering.)
- Headlines: 46px/1.18, `letter-spacing:-0.05em`, `text-wrap:balance`, `max-width:1460px`.
- Two grounds: **ink** (`#0a0a0a` mesh + dots motif + grain) for hook/closer; **paper**
  (`--background`, dashed rails) for the product world.
- **No background gradient washes.** Soft signal-colored blooms behind the paper world were tried
  and cut — keep paper clean. The end card is pure black; no purple/green haze.
- Signal palette for data only: `--signal-sensor` pass, `--signal-motion` fail, gradient rail as
  a thin accent on cards. The signal dot after "Bring one policy" is the one flourish.
- Glass panels: `color-mix(popover 72%)` + `backdrop-filter: blur(24px) saturate(1.5)` + inset hairline.

## Subtitles

Bottom-center pill, 29px Google Sans, `backdrop-filter` glass: dark pill/white text on ink and
video, white pill/dark text on paper. One line, ≤44 chars, split at punctuation. Hide them where
the words are already on screen (typed hook lines, big closer headlines).

# inspiration/ — the films our motion language comes from

[decisions.md](../skills/launch-video/references/decisions.md) names "the ElevenLabs launch
films" as the motion reference. These are those films, committed so the reference can't be lost,
plus a written inventory of their moves and runnable reproductions in
[`motions/index.html`](motions/index.html).

**Steal the motion, not the palette.** These films live on gradient washes and painterly
texture; cotufa explicitly rejects that (Trust: paper/ink restraint, signal color earned).
Everything below is about *how things move* — what they look like stays governed by
`graphics/BRAND.md` and decisions.md.

## How we want our videos to feel

Fast and full of movement. Concretely:

1. **Something happens every ~2 seconds.** A reveal, a morph, a pop, a count — pace comes from
   event density, not from cutting faster. All four films run 20+ micro-scenes in 45–72s.
2. **Never dead-still.** Backgrounds drift, cards breathe, the camera micro-moves even on holds.
   A static frame means the video has stopped; there is no such frame in any of these films.
3. **One continuous canvas, no hard cuts.** Scenes morph, wash, or travel into each other. The
   films transition by transforming the thing you're already watching — cut detection at 0.3
   finds 1–5 cuts *per film*.
4. **A hero element persists and transforms.** Orb → venn → planet → pause-bars → wordmark: one
   identity thread the whole way. Ours is the Kite mark.
5. **Motion has hierarchy.** One primary move per beat; everything else is quiet micro-motion in
   support. Fast ≠ everything moving at once.
6. **Type performs.** Prompts type with a caret, numbers count up, big words land one at a time.
   Text is choreography, not labels.
7. **UI is footage.** Product cards, node canvases, dashboards — animated as living objects
   (sliding, wiring up, streaming logs), never pasted screenshots.
8. **Snappy envelopes.** Enter fast and decelerate (`cubicOut`/`backOut` overshoot, 0.3–0.5s);
   exit accelerating (`cubicIn`). Fades alone read as dead.
9. **End on the mark.** Every film collapses its world into the logo and holds. Earn the ending;
   give it air.

## The films

| File | What it is | Steal from it |
|---|---|---|
| `eleven-agents-launch.mp4` | ElevenLabs Agents launch (72s, editor timeline visible: Opening / Demo / Proof & Use cases / Trust / Outro) | typewriter prompts, checklist cascade with counting %, channel-icon pops, self-drawing charts, orbs traveling branching rails, guardrail card stacks, venn→planet morph, bars→wordmark outro |
| `eleven-creative-avatars.mp4` | ElevenLabs Creative / Avatars (52s, warm palette) | travel-orb on grid rails, one-card→many multiplication grid, "consistent identity" scatter cluster, prompt composer with @-mention chips, node-graph wiring, portrait/orb carousel march |
| `eleven-flows-agent.mp4` | ElevenLabs Flows Agent (49s, painterly full-bleed ground) | giant kinetic type with caret ("3 colorways · 2 settings · voiceover"), streaming agent log with model-name pills, camera glide across an infinite node canvas, aspect-ratio/resolution chip pops, language pill swapping over full-bleed footage, variant-grid zoom-out |
| `eleven-agents-experiments.mp4` | ElevenLabs Agents Experiments (44s, glass blue) | cube→orb bloom, orb→particle constellation, System-Prompt tree cascade, orbiting labeled satellites (Voice/Tone/Personality), git-style branch/merge rails, glass dashboard cards, gem morph → wordmark |

(Original filenames on Luigi's desktop: `LinkedIn Video.mp4`, `Video Playback (1).mp4`,
`Video Playback (2).mp4`, `Video Playback.mp4`.)

## Motion inventory → runnable demos

Every move below is reproduced in [`motions/index.html`](motions/index.html) in the stage idiom —
pure `seek(t)`, cotufa tokens, copy-paste ready. Open the file to scrub/play it; it implements
the full stage contract, so `render.mjs --stills` exports it like any cut.

| # | Motion | Seen in | Use it for |
|---|---|---|---|
| 01 | `typewriter` — prompt types with caret, send-chip pops | all four | hooks, any "ask the product" beat |
| 02 | `cascade` — rows + checks stagger in while a % counts up | agents-launch | test results, guarantees, checklists |
| 03 | `travel-orb` — orb rides a rail, splits at a fork | agents-launch, experiments | routing, A/B, data flowing through a system |
| 04 | `multiply-grid` — one tile fans out into a full grid | creative-avatars | scale beats ("one policy → 1000 runs") |
| 05 | `chip-pops` — option chips pop in sequence, one selects | flows-agent | configuration moments, variant choices |
| 06 | `draw-line` — chart draws itself, markers pop with values | agents-launch | metrics, before/after, trend beats |
| 07 | `orbit` — labeled satellites circle a hero, emphasis rotates | experiments | dependent settings around one subject |
| 08 | `stream-log` — mono log lines stream in with status pills | flows-agent | agent/pipeline work being done live |
| 09 | `camera-glide` — dolly across a wired node canvas | flows-agent, creative-avatars | pipeline overviews, "the map" beat |
| 10 | `branch-merge` — git-style rails branch out and merge back | experiments | experiments, eval variants, iteration |
| 11 | `label-swap` — floating pill cycles labels over full-bleed | flows-agent | montage variants (languages, robots, envs) |
| 12 | `morph-logo` — scattered dots gather → pause bars → wordmark | all four | the closer, always |

The demo file is also a scene-grammar sampler: paper and ink grounds alternate the way
[decisions.md](../skills/launch-video/references/decisions.md) prescribes.

# Writing the script

**Write the script first and get explicit sign-off before building anything.** The script fixes
the scene count, the runtime, the footage you need, and every timing target downstream. Copy
rewrites after the stage exists cost a full re-render each; on the Kite Evals launch, five of the
review rounds were copy, not craft.

Deliver the script as a beat sheet (format below), in chat, and ask for line-level approval.

## 1. Interview first

Don't draft until you can answer these. Ask them together, in one message:

- **Who is watching, and what do they already believe?** (robotics engineers who accept that
  evaluation is painful ≠ execs who don't know the category exists)
- **What is the one thing they should remember?** One sentence. If there are three, the video fails.
- **What is the ask?** The last line of the video is the ask — "Bring one policy" is a different
  video from "Book a demo" or "Read the docs".
- **What can we actually show?** Real product recordings and sim clips available *today*. Footage
  constrains the script far more than the script should constrain footage.
- **What claims are defensible?** Any number in the VO (success rates, wall-clock, cohort size)
  must be real. See rules below.
- **Runtime and channel** — default 50–60s, 16:9 master, content centered so a 9:16 crop survives.

## 2. The arc

Five beats. This order is load-bearing: the problem must land before the mechanism, and the proof
must land before the ask.

| Beat | Job | Length |
|---|---|---|
| **Hook** | Their problem, in their words. No product yet. | ~9s |
| **Mechanism** | What the product does, one idea per line. | ~10s |
| **Payoff** | The thing they actually want (insight, not output). | ~8s |
| **Proof** | Real UI, real data. The only beat that proves it exists. | ~10s |
| **Variety + ask** | Range of what it covers, then the ask. | ~15s |

- **Hook = the user's job, not the tool's mechanism.** First draft was "You changed one thing in
  your policy. You book the robot. You watch." — rejected: that's a workflow, not a pain. Shipped:
  *"Testing a policy means babysitting a robot. Hours of watching every run. And you still don't
  know where it breaks."* Deliver it tired, not excited; it lands because it's familiar.
- **Give the proof beat the most time.** It's the only part that shows the product is real.
- **Pause before the ask.** Don't soften it with "if you're interested".

## 3. Pacing math

- **~2.4 words/sec.** 55s of continuous VO ≈ 130 words. Count before you build.
- Per line: 8–14 words. Longer lines don't fit a headline and read rushed.
- **The hook gets one VO segment per on-screen line** (`vo0a/b/c`) so voice and text land together.
- Mark the safest cut line in the beat sheet ("if long, cut X") — decide it while writing, not
  while re-rendering.

## 4. Beat sheet format

Give each beat a timecode, the VO verbatim, the visual, and a **note explaining the craft reason**
(the note is what makes the sheet reviewable rather than a wish list):

```
0:00–0:09 · HOOK (ink)
VO:     "Testing a policy means babysitting a robot. / Hours of watching every run. /
         And you still don't know where it breaks."
Visual: Lines type in left. Right: real HF robot datasets shuffling on every beat.
Note:   Three separate takes, one per line, so voice and text land together. Tired delivery.

0:09–0:14 · MECHANISM (paper)
VO:     "Kite Evals runs a thousand simulations at once."
Visual: Policy tile fans out into a 40×25 grid that fills left-to-right.
Note:   Headline on screen matches the VO wording exactly here — it's the product claim.
```

## 5. Line-level rules

Each of these is a real rewrite from this project:

- **Every line must make sense standing alone.** ✗ "Kite Evals runs it a thousand ways instead"
  ("it"/"instead" depend on the previous line) → ✓ "Kite Evals runs a thousand simulations at once."
- **No unverified specifics.** ✗ "Thirty minutes, not a week" → ✓ "Every condition you care about
  is tested." If a number isn't confirmed, cut it; the video outlives the benchmark.
- **No AI-flavored aphorisms.** ✗ "And you don't get a score. You get the reasons." → ✓ "You get a
  full report on the reasons your policy failed." Write the sentence a person would say out loud.
- **Slide text complements VO, never contradicts it.** Headline and VO can differ in wording, but
  if the footage shows a bottle, the VO can't say "mugs".
- **Name the audience concretely in the ask.** "teams across manufacturing, logistics, lab
  automation and retail" beats "teams everywhere".
- **No page furniture in copy** — no corner labels, dates, or version stamps.

## 6. Handing the script to the pipeline

The approved script becomes `SEGMENTS` in `audio/eleven.mjs` — one entry per VO segment, in order:

```js
{ id: 'vo0a', slotStart: 0.35, text: `Testing a policy means babysitting a robot.`, settings: TIRED },
{ id: 'vo1',  slotStart: 7.45, text: `Kite Evals runs a thousand simulations at once.` },
```

- `id` — hook lines are `vo0a/b/c`; then one per scene (`vo1`, `vo2`, …). Adding a beat means
  adding a scene window in the stage's `W` and a target length in `compute-timing.mjs`'s `TGT`.
- `slotStart` — nominal stage-time offset; the exact placement is recomputed from measured durations.
- `settings` — use the low-style `TIRED` preset for the hook, default elsewhere.
- On-screen headlines live in the stage and should be updated in the same edit as the VO text, so
  they can't drift apart.

## 7. Worked example — the shipped script (~56s, 138 words)

```
HOOK       Testing a policy means babysitting a robot.
           Hours of watching every run.
           And you still don't know where it breaks.
MECHANISM  Kite Evals runs a thousand simulations at once.
           Every condition you care about is tested.
PAYOFF     You get a full report on the reasons your policy failed.
           Every rollout comes back labeled, and agents cluster the failures for you.
PROOF      Open any run. Twenty-three percent success — and exactly which objects it
           dropped, and when.
VARIETY    Then change the objects, the lighting — even the robot — and run it all again.
ASK        We're in early access, with teams across manufacturing, logistics, lab
           automation, and retail. Bring one policy. We'll show you where it breaks.
```

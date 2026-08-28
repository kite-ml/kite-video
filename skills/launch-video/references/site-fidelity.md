# Match the live site

When the video is about a *shipped* page — a benchmark, a launch post, a product surface — don't
invent a look. Reproduce the product's own page in motion. The stage becomes a faithful, animated
version of what a viewer will land on, which reads as the product; an approximation reads as fake.

This is the default whenever the source material is a live URL. It composes with everything in
[decisions.md](decisions.md) and [script-writing.md](script-writing.md) — it doesn't replace them.

## 1. Screenshot the live pages first — they are the design target

Before authoring a single scene, pull up the deployed page(s) the video is about and study them:
the exact components, tokens, spacing, the cover image, and the one accent color.

```bash
# from a dir with playwright-core installed; system Chrome via channel:'chrome'
node -e '
import("playwright-core").then(async ({chromium})=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:2});
  await p.goto("https://kiteml.com/blog/benchmark",{waitUntil:"networkidle"});
  await p.waitForTimeout(1500);
  await p.screenshot({path:"/tmp/target.png",fullPage:true}); await b.close();
})'
```

## 2. Reproduce the real components, don't approximate

The site's components are the star of the video. Read their source (cotufa `graphics/src/*`, the
blog's `components/`) and **port each one to vanilla JS that `seek(t)` can drive** — same class
names, dimensions, colors, and brand marks. You have the code; use it.

- **Keep a shared kit** both stages include:
  - `stage/kit.css` — the design tokens (copied from `graphics/dist/theme.css`, never retyped)
    plus the component styles, translated from the components' Tailwind classes.
  - `stage/components.js` — builders that each return `{ el, render(tl) }`, so a scene just calls
    `component.render(sceneLocalTime)`. One kit, many scenes, two videos.
- **Provider / brand badges** are a white circle + the real brand mark (the SVG path or logo PNG
  from the site), never an emoji or a plain colored dot.
- Reproduce the actual chart shapes: the vertical-column leaderboard with badges in the bars, the
  cost-vs-accuracy scatter with logo dots, the big-number metric spotlight, the keyframes/video
  sampling strip. Pixel-match the resting state, then animate from there.

## 3. Open on the real cover thumbnail

Start the video on the page's **actual cover image** (the gradient/hero the post already ships),
with the title and the maker badges over it, then dissolve into the content. It ties the video to
the page the viewer will open and needs zero new art. Add the Kite mark in a corner if the cover
doesn't already carry it.

## 4. Charts: center them, and animate the argument

- **Auto-range both axes from the data** (with padding), never a fixed range. A fixed cost axis
  strands the cheap models in a corner and spills the expensive ones off the right edge; ranging
  from `min…max` of the actual values (± a little) keeps the cloud centered horizontally *and*
  vertically. Drop tick marks that fall outside the ranged window.
- **Animate the story, not just the entrance:**
  - a metric toggle that **re-sorts** (columns slide so the new leader moves to the left) *is* the
    "the winner flips with the approach" beat;
  - a spotlight bar that **fills from the old value to the new** (grey base → dark gain, with the
    prior value marked) *is* the "the collapse is gone" beat.
- **Emphasize with a glass overlay, not just color.** To spotlight one or two series, frost the
  rest under a `backdrop-filter: blur()` panel and lift the highlighted points above it (higher
  `z-index`), so the eye goes exactly where the VO is.

## 5. One accent, on the graphic it owns

Use the product's single accent (Kite's is the leaderboard blue `#4285F4`) only for the data
graphic that already owns it — here, the keyframes/video sampling strips. Keep the grounds, the
type, and the closing frame **monochrome** (black on near-white). The accent earns its meaning by
appearing in one place; spread across the closer too, it just reads as decoration.

## 6. On-screen copy

The content and title policies (no all-caps, no em-dashes on screen, less text / bigger titles,
numbers verbatim) live with the rest of the copy rules in
[script-writing.md](script-writing.md) §5 — apply them here too.

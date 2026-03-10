# Webflow Scripts

This repository contains standalone JavaScript snippets intended for use in Webflow projects.

## Script Inventory

### `nav_pill.js`

**Purpose**
- Draws an SVG rounded-pill background for each nav pill item.
- Morphs that shape into a bubble-tail variant on hover, then morphs back on mouse leave.
- Scales the hovered pill slightly to reinforce interaction.
- Rebuilds geometry on resize so the path stays aligned with label content.

**Dependencies**
- `gsap` (GreenSock Animation Platform) must be present on `window`.
- `MorphSVGPlugin` must be present on `window`.
- Browser API: `ResizeObserver`.

**Required Webflow classes/selectors**
- Required by script logic:
  - Pill wrapper: `.nav-pill`
  - SVG element inside each pill: `.pill-bg`
  - Path inside SVG: `.pill-path`
  - Label/content element inside each pill: `.pill-label`

**Expected HTML structure**
```html
<a class="nav-pill">
  <svg class="pill-bg" aria-hidden="true" focusable="false">
    <path class="pill-path"></path>
  </svg>
  <span class="pill-label">Label</span>
</a>
```

Notes:
- The script expects one `.pill-bg`, `.pill-path`, and `.pill-label` per `.nav-pill`.
- If any required child is missing, that pill is skipped.

**Where it should be loaded**
- Load on pages that include `.nav-pill` markup.
- Ensure GSAP + MorphSVGPlugin load **before** this script.
- Best location: page/footer custom code so DOM exists and dependencies are already loaded.

**Setup notes**
- The script waits for `window.load`.
- Shape dimensions are based on each pill’s live `getBoundingClientRect()` values.
- The SVG `viewBox` includes extra height for tail depth during morph.
- Corner rounding is controlled by:
  - `radiusRatio` (`0.5` = fully pill-shaped ends, based on body height)
  - `minRadius` (keeps small pills from looking too square)
- Radius is clamped to safe geometry bounds before path generation.
- Tail base anchors are clamped inside the bottom straight segment between rounded corners.
- The rest-state pill path keeps a collapsed tail segment so it shares segment topology with the bubble path, reducing right-edge bulge artifacts during morph.
- Rest-state tail points are pulled partway toward center using:
  - `liquidMorphBasePull` (base-anchor pull)
  - `liquidMorphTipPull` (tip x-position pull)
- The script builds an intermediate liquid path (`data-liquid`) using:
  - `liquidMorphTailMix` (how close intermediate geometry is to full bubble)
  - `liquidMorphTailDepth` (intermediate tail depth as a fraction of full tail height)
- Right edge curvature is controlled per state with:
  - `pillSideWave`
  - `liquidSideWave`
  - `bubbleSideWave`
- Hover/leave use two-step GSAP timelines (`pill -> liquid -> bubble` and reverse) for a smoother S-curve style morph.

**Assumptions**
- `.nav-pill` integration CSS positions/overlays the SVG behind label content (for example using relative/absolute stacking and `pointer-events` handling).
- `.nav-pill` elements are hoverable desktop targets; touch-only interactions are not handled by this script.

---

### `shape_morph_faq.js`

**Purpose**
- Adds an animated SVG "speech bubble" background to FAQ accordion items.
- Morphs the bubble shape and fill color when an item opens/closes.
- Transition includes an absorbed midpoint where the original tail smoothly merges into the bottom edge.
- During open, the bubble completes its height resize before the open tail reappears, then the tail pops out, slightly overshoots, and settles.
- Tracks Webflow dropdown state and size changes so the bubble stays aligned.

**Dependencies**
- `gsap` (GreenSock Animation Platform) must be present on `window`.
- `MorphSVGPlugin` must be present on `window`.
- Browser APIs: `ResizeObserver`, `MutationObserver`, `requestAnimationFrame`.

**Required Webflow classes/selectors**
- Required by script logic:
  - Container per FAQ item: `.accordion-item`
  - Toggle inside each item: `.w-dropdown-toggle` or `.dropdown-toggle`
  - Answer/list inside each item: `.answer` or `.w-dropdown-list`
  - Open state classes observed: `.w--open` (Webflow-managed)
- Recommended for the current visual integration:
  - `.faq-shell`
  - `.faq-bubble-embed`
  - `.faq-bubble-svg`
  - `.faq-bubble-path`

**Expected HTML structure**
```html
<div class="faq-shell">
  <div class="accordion-item">
    <div class="faq-bubble-embed">
      <svg class="faq-bubble-svg" aria-hidden="true" focusable="false">
        <path class="faq-bubble-path"></path>
      </svg>
    </div>
    <div class="w-dropdown-toggle dropdown-toggle">Question</div>
    <div class="w-dropdown-list answer">Answer content...</div>
  </div>
</div>
```

Notes:
- The script expects one toggle and one answer element inside each `.accordion-item`.
- The script will auto-insert:
  - `<svg class="faq-bubble-svg">`
  - `<path class="faq-bubble-path">`
- Any `.faq-bubble-svg` not inside `.accordion-item` is hidden by the script.
- If you pre-add `.faq-bubble-embed`/SVG markup, keep it inside each `.accordion-item`.

**Where it should be loaded**
- Load on pages that contain the FAQ accordion markup above.
- Ensure GSAP + MorphSVGPlugin load **before** this script.
- Best location: page/footer custom code so DOM exists and dependencies are already loaded.

**Setup notes**
- The script already waits for `window.load`.
- It guards duplicate initialization with `window.__faqBubbleMorphInit`.
- Visual tuning values are in the top-level `CONFIG` object:
  - bubble radii, tail geometry, insets, min heights, open fill color.
  - open-only tail pop/overshoot controls under `openTailOvershoot`.
- Inline code comments in `CONFIG` mark the main future tuning points for:
  - closed-tail shape
  - open-tail shape
  - open-tail pop/overshoot amount and timing
- It applies inline positioning/z-index styles to keep bubble behind content.
- Open resize uses live geometry each frame for `0.44s`, so height growth starts immediately and runs in sync with tail absorb/radius changes.
- Opening sequence is staged as:
  - absorb initial tail while resizing (`0.22s`)
  - finish resizing in a flat-tail state (`0.22s`)
  - wait until observed item height is stable (about `120ms` stable window, capped at `900ms`)
  - tail pop-out at final height (`0.12s`)
  - subtle tail overshoot (`0.08s`) and settle (`0.16s`)
- Current tuning uses a slightly stronger open-tail overshoot amplitude than previous revisions.
- Close timing remains unchanged (`0.36s` total).
- During active morph, resize updates still refresh geometry data so the top edge stays stable and does not snap upward at completion.
- Add this CSS in the page/project `<head>` for wrapper layout and stroke styling:
```html
<style>
  .faq-shell{
    position: relative;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .faq-bubble-embed{
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .faq-bubble-svg{
    width: 100%;
    height: 100%;
    overflow: visible;
    display: block;
  }

  .faq-bubble-path{
    fill: transparent;
    stroke: #000;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .faq-shell .accordion-item{
    position: relative;
    z-index: 2;
  }
</style>
```

**Assumptions**
- `.faq-shell` / `.faq-bubble-embed` are integration conventions for this project setup rather than hard runtime requirements of the JS logic itself.
- Each `.accordion-item` has exactly one toggle target and one answer target (derived from first matches for `.w-dropdown-toggle, .dropdown-toggle` and `.answer, .w-dropdown-list`).

---

## Maintenance

If any script changes (selectors, behavior, dependencies, load order, or expected markup), update this README in the same change set.

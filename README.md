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
- On load it logs a version marker to the browser console: ``[nav_pill] v<version> loaded (morph-mode: liquid-s-concave-settle-v12-explicit-leave-speed)``.
- Shape dimensions are based on each pill’s live `getBoundingClientRect()` values.
- Tail size derives from the measured `.nav-pill` height, so changes to Webflow pill padding and text size automatically retune tail length, width, and horizontal pull.
- Optional inherited CSS custom property `--_nav---tail-scale` can art-direct the tail globally or per pill (`1` = default, `0.85` = smaller tail, `1.15` = larger tail).
- The resting pill path maps to the live `.nav-pill` wrapper width/height exactly, but the script renders the SVG box larger than the wrapper with configurable overflow padding so the hover morph can extend past the pill without shrinking the base outline.
- Overflow padding defaults are controlled by `overflowPadXRatio`/`overflowPadXMin`, `overflowPadTopRatio`/`overflowPadTopMin`, and `overflowPadBottomTailFactor`/`overflowPadBottomMin`; bottom padding scales with the derived tail height.
- The SVG sets `preserveAspectRatio="none"` and is offset upward/leftward to keep the base outline aligned with the wrapper while exposing extra drawable area around it.
- Current spacing defaults set `sideInset`, `topInset`, and `bottomInset` to `0`, so the pill body uses the full measured wrapper box.
- Corner rounding is controlled by:
  - `radiusRatio` (`0.5` = fully pill-shaped ends, based on body height)
  - `minRadius` (keeps small pills from looking too square)
- Radius is clamped to safe geometry bounds before path generation.
- Bubble-tail softening is controlled by:
  - `rightCornerGuard` (keeps right-side tail geometry away from the corner arc)
  - `tailHeightRatio`/`tailHeightMin`/`tailHeightMax`, `tailWidthRatio`/`tailWidthMin`/`tailWidthMax`, `tailOffsetXRatio`/`tailOffsetXMin`/`tailOffsetXMax`, and `tailTipOffsetXRatio`/`tailTipOffsetXMin`/`tailTipOffsetXMax` (all derived from live pill height)
  - `--_nav---tail-scale` (optional multiplier applied after those derived dimensions)
  - `minTailSpan` (minimum base width so the tail keeps a liquid pull, scaled with derived tail size)
- Bubble right-side protrusion compensation is controlled by:
  - `bubbleRightInsetRatio` (inset amount derived from current radius)
  - `bubbleRightInsetMin` and `bubbleRightInsetMax` (bounds for that inset)
- Entry squeeze stage (first hover stage) is controlled by:
  - `entrySqueezeStageRadiusRatio` (immediately drops radius at morph start)
  - `entrySqueezeStageTailDepthRatio`, `entrySqueezeStageRightInsetBoost`, `entrySqueezeStageTailTipOffsetAdjust`
  - `entrySqueezeWaveRatio`, `entrySqueezeWaveMin`, `entrySqueezeWaveMax`
  - `entrySqueezeWaveInFactor1`, `entrySqueezeWaveInFactor2` (inward concave pull strength)
- Intermediate S-wave bridge stage is controlled by:
  - `liquidStageTailDepthRatio` (temporary tail depth in the bridge state)
  - `liquidStageRadiusRatio` (partially restores radius after entry squeeze)
  - `liquidStageRightInsetBoost` (extra right inset during bridge state)
  - `liquidStageTailTipOffsetAdjust` (temporary tip x adjustment during bridge)
  - `liquidWaveRatio`, `liquidWaveMin`, `liquidWaveMax` (S-wave amplitude)
  - `liquidWaveOutFactor`, `liquidWaveInFactor` (how strongly the S-wave bows out/in)
  - `liquidWaveMaxOutwardPx`, `waveRightEnvelopeInsetPx` (caps convex overshoot to prevent harsh bulge)
- Concave settle stage is controlled by:
  - `concaveStageTailDepthRatio`, `concaveStageRadiusRatio`, `concaveStageRightInsetBoost`, `concaveStageTailTipOffsetAdjust`
  - `concaveWaveRatio`, `concaveWaveMin`, `concaveWaveMax`
  - `concaveWaveInFactor1`, `concaveWaveInFactor2` (inward pull strength before settle)
  - `bubbleStageRadiusRatio`, `stageRadiusMinPx` (keeps the final bubble stage at a reduced radius and sets lower radius bound)
  - `finalCornerLiftStageRadiusRatio`, `finalCornerLiftDurationEnter` (adds a final, slight corner-round increase only after hover morph reaches bubble endpoint)
  - `morphWaveMinSideSpanRatio`, `morphWaveMinSideSpanPx` (ensures wave stages stay visible when radius is capsule-like)
  - `entrySqueezeDurationEnter`, `liquidStageDurationEnter`, `concaveStageDurationEnter`, `finalStageDurationEnter`, `finalCornerLiftDurationEnter`
- Hover/leave use direct string morph targets (`morphSVG: pathData`) in a staged timeline (`pill -> squeeze -> liquid -> concave -> bubble -> bubbleCornerLift`, then exact reverse on leave).
- Current defaults strongly exaggerate the mid-transition wave/concave stages for visual tuning, so you can dial values back after confirming the motion profile.
- `morphSlowMotionFactor` scales hover-enter path-morph stage durations; current default is `3.0` (`1` is normal speed).
- `morphSlowMotionFactorLeave` scales mouseleave path-morph stage durations; current default is `10.0`.

**Assumptions**
- `.nav-pill` integration CSS positions/overlays the SVG behind label content (for example using relative/absolute stacking and `pointer-events` handling).
- `.nav-pill` and surrounding nav layout allow visible overflow if the hover tail is meant to extend outside the pill wrapper.
- If `--_nav---tail-scale` is set, it resolves to a positive numeric value.
- `.nav-pill` elements are hoverable desktop targets; touch-only interactions are not handled by this script.

---

### `dynamic_nav.js`

**Purpose**
- Switches nav theme between light/dark based on which themed section is currently under the nav line in the viewport.
- Adds nav state hooks so your pill styles can swap stroke/text/fill colors without duplicating nav components.
- Optionally marks the matching nav link as active for section-based fill states.

**Dependencies**
- No third-party libraries required.
- Browser APIs used: `requestAnimationFrame`.
- Browser API used when available: `ResizeObserver` (for nav/section size-change updates).

**Required Webflow classes/selectors**
- Required by script logic:
  - Themed sections: `[data-nav-theme]` with value `dark` or `light` (also accepts `black`/`white` aliases).
  - Nav root (recommended): `[data-dynamic-nav]`.
- Fallback nav discovery (if `[data-dynamic-nav]` is missing):
  - First `.w-nav`, otherwise first `<nav>`.
- Optional active-link mapping:
  - Section key: `data-nav-section="some-key"` or `id="some-key"` on the section.
  - Nav link target: `data-nav-target="some-key"` or `href="#some-key"` on links inside nav.

**Expected HTML structure**
```html
<nav class="w-nav" data-dynamic-nav data-nav-probe-offset="2">
  <a class="nav-pill" href="#about">
    <svg class="pill-bg" aria-hidden="true" focusable="false">
      <path class="pill-path"></path>
    </svg>
    <span class="pill-label">About</span>
  </a>
  <a class="nav-pill" data-nav-target="work">
    <svg class="pill-bg" aria-hidden="true" focusable="false">
      <path class="pill-path"></path>
    </svg>
    <span class="pill-label">Work</span>
  </a>
</nav>

<section id="about" data-nav-theme="light"></section>
<section id="work" data-nav-theme="dark"></section>
```

Notes:
- `data-nav-probe-offset` is optional and numeric; it adjusts the sample line below the nav bottom edge.
- If no section key (`id`/`data-nav-section`) exists, theme switching still works, but active-link mapping is skipped.

**Where it should be loaded**
- Load on pages that contain the nav + themed sections.
- Best location: page/footer custom code so nav/sections exist before initialization.
- If used with `nav_pill.js`, load both scripts in footer after markup; either order is fine because they target different responsibilities.

**Setup notes**
- The script waits for `window.load`.
- On load it logs ``[dynamic_nav] v<version> loaded``.
- Runtime state hooks it writes:
  - On nav element:
    - `data-nav-theme="dark|light"`
    - `data-nav-section-active="<section-key>"`
    - class `is-nav-theme-dark` or `is-nav-theme-light`
  - On `<html>`:
    - `data-nav-theme="dark|light"`
  - On matched nav link:
    - class `is-nav-section-active`
    - `aria-current="true"`
- Add this CSS in Webflow Project/Page `<head>` to swap black/white outlines/text and allow future fill states:
```html
<style>
  [data-dynamic-nav] .pill-path{
    fill: var(--pill-fill, transparent);
    stroke: var(--pill-stroke, #000);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
    transition: stroke .25s ease, fill .25s ease;
  }

  [data-dynamic-nav] .pill-label{
    position: relative;
    z-index: 1;
    padding: 0 40px;
    color: var(--pill-text, #000);
    font-size: 18px;
    line-height: 14px;
    transition: color .25s ease;
  }

  [data-dynamic-nav].is-nav-theme-light{
    --pill-stroke: #000;
    --pill-text: #000;
    --pill-fill: transparent;
    --pill-active-fill: rgba(0, 0, 0, 0.08);
  }

  [data-dynamic-nav].is-nav-theme-dark{
    --pill-stroke: #fff;
    --pill-text: #fff;
    --pill-fill: transparent;
    --pill-active-fill: rgba(255, 255, 255, 0.2);
  }

  [data-dynamic-nav] .nav-pill.is-nav-section-active .pill-path{
    fill: var(--pill-active-fill);
  }

  [data-dynamic-nav] .nav-pill:hover .pill-path{
    fill: var(--pill-active-fill);
  }
</style>
```
- Migration note from static color CSS:
  - Replace hard-coded `.pill-path` stroke and `.pill-label` color values with CSS variables as above.
  - Keep one nav component; section attributes now drive the theme.

**Assumptions**
- Assumption: The nav is fixed or sticky near the top; the script samples a line at nav bottom + offset to decide theme.
- Assumption: Themed sections represent non-overlapping vertical regions in scroll order for predictable switching.
- Assumption: If `[data-dynamic-nav]` is not set, the first `.w-nav`/`nav` in DOM is the intended target.

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

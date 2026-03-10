# Webflow Scripts

This repository contains standalone JavaScript snippets intended for use in Webflow projects.

## Script Inventory

### `shape_morph_faq.js`

**Purpose**
- Adds an animated SVG "speech bubble" background to FAQ accordion items.
- Morphs the bubble shape and fill color when an item opens/closes.
- Transition includes an absorbed midpoint where the original tail smoothly merges into the bottom edge.
- During open, the bubble first resizes to full height with the tail absorbed, then the open tail pops out, slightly overshoots, and settles.
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
- It applies inline positioning/z-index styles to keep bubble behind content.
- Opening sequence is staged as:
  - resize to full height with tail absorbed (`0.44s`)
  - tail pop-out at final height (`0.12s`)
  - subtle tail overshoot (`0.08s`) and settle (`0.16s`)
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

window.addEventListener("load", () => {
  const SCRIPT_VERSION = "2026.03.10.2";
  console.log(`[nav_pill] v${SCRIPT_VERSION} loaded`);

  if (!window.gsap || !window.MorphSVGPlugin) {
    console.warn(`[nav_pill] v${SCRIPT_VERSION} missing GSAP or MorphSVGPlugin.`);
    return;
  }

  gsap.registerPlugin(MorphSVGPlugin);

  const CONFIG = {
    // 0.5 = fully pill-shaped ends (radius = half body height)
    radiusRatio: 0.5,
    // keeps very small pills from becoming too square
    minRadius: 14,
    tailWidth: 25,
    tailHeight: 30,
    tailOffsetX: 18,
    // how much the resting tail points are pulled toward center (0-1)
    liquidMorphBasePull: 0.32,
    liquidMorphTipPull: 0.5,
    // intermediate liquid state between rest and full bubble
    liquidMorphTailMix: 0.7,
    liquidMorphTailDepth: 0.58,
    liquidSideWave: 8,
    pillSideWave: 0,
    bubbleSideWave: 0.8,
    hoverScale: 1.04,

    // visual spacing around the body shape
    sideInset: 0,
    topInset: 10,
    bottomInset: 10,

    // keeps the body centered in the taller SVG canvas
    tailCenterCompensation: 0.3
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + ((b - a) * t);
  }

  function resolveSideWave(sideWave, radius) {
    const maxWave = Math.max(1.5, Math.min(9, radius * 0.55));
    return clamp(sideWave, 0, maxWave);
  }

  function getRightSideCurve(right, top, bottom, r, sideWave) {
    const startY = top + r;
    const endY = bottom - r;
    const span = Math.max(0, endY - startY);
    const safeWave = Math.max(0, sideWave);

    return {
      startY,
      endY,
      cp1X: right + (safeWave * 0.45),
      cp1Y: startY + (span * 0.34),
      cp2X: right - (safeWave * 0.85),
      cp2Y: startY + (span * 0.72)
    };
  }

  function getTailGeometry(w, r, tailWidth, tailOffsetX, sideInset) {
    const left = sideInset;
    const right = w - sideInset;
    const centerX = w / 2 + tailOffsetX;
    const rawTailBaseLeft = centerX - (tailWidth * 0.55);
    const rawTailBaseRight = centerX + (tailWidth * 0.75);
    const minBaseX = left + r;
    const maxBaseX = right - r;
    const availableBaseWidth = Math.max(0, maxBaseX - minBaseX);

    let tailBaseLeft = clamp(rawTailBaseLeft, minBaseX, maxBaseX);
    let tailBaseRight = clamp(rawTailBaseRight, minBaseX, maxBaseX);

    if (availableBaseWidth === 0) {
      tailBaseLeft = minBaseX;
      tailBaseRight = minBaseX;
    } else {
      const minTailSpan = Math.min(8, availableBaseWidth);
      if ((tailBaseRight - tailBaseLeft) < minTailSpan) {
        const clampedCenter = Math.min(
          maxBaseX - (minTailSpan / 2),
          Math.max(minBaseX + (minTailSpan / 2), centerX)
        );
        tailBaseLeft = clampedCenter - (minTailSpan / 2);
        tailBaseRight = clampedCenter + (minTailSpan / 2);
      }
    }

    const tipX = clamp(centerX + 20, minBaseX, maxBaseX);

    return {
      tailBaseLeft,
      tailBaseRight,
      tipX,
      centerX: clamp(centerX, minBaseX, maxBaseX),
      minBaseX,
      maxBaseX
    };
  }

  function getRestTailGeometry(tailGeometry, basePull, tipPull) {
    const safeBasePull = clamp(basePull, 0, 1);
    const safeTipPull = clamp(tipPull, 0, 1);
    const {
      tailBaseLeft,
      tailBaseRight,
      tipX,
      centerX,
      minBaseX,
      maxBaseX
    } = tailGeometry;

    let restTailBaseLeft =
      tailBaseLeft + ((centerX - tailBaseLeft) * safeBasePull);
    let restTailBaseRight =
      tailBaseRight + ((centerX - tailBaseRight) * safeBasePull);
    let restTipX = tipX + ((centerX - tipX) * safeTipPull);

    restTailBaseLeft = clamp(restTailBaseLeft, minBaseX, maxBaseX);
    restTailBaseRight = clamp(restTailBaseRight, minBaseX, maxBaseX);
    restTipX = clamp(restTipX, minBaseX, maxBaseX);

    const availableBaseWidth = Math.max(0, maxBaseX - minBaseX);
    const minTailSpan = Math.min(6, availableBaseWidth);

    if ((restTailBaseRight - restTailBaseLeft) < minTailSpan) {
      const halfSpan = minTailSpan / 2;
      const clampedCenter = clamp(centerX, minBaseX + halfSpan, maxBaseX - halfSpan);
      restTailBaseLeft = clampedCenter - halfSpan;
      restTailBaseRight = clampedCenter + halfSpan;
    }

    return {
      tailBaseLeft: restTailBaseLeft,
      tailBaseRight: restTailBaseRight,
      tipX: restTipX
    };
  }

  function interpolateTailGeometry(fromTail, toTail, mix) {
    const t = clamp(mix, 0, 1);
    return {
      tailBaseLeft: lerp(fromTail.tailBaseLeft, toTail.tailBaseLeft, t),
      tailBaseRight: lerp(fromTail.tailBaseRight, toTail.tailBaseRight, t),
      tipX: lerp(fromTail.tipX, toTail.tipX, t)
    };
  }

  function makePillPath(w, bodyH, r, topInset, sideInset, tailGeometry, sideWave) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset;
    const bottom = top + bodyH;
    const { tailBaseLeft, tailBaseRight, tipX } = tailGeometry;
    const rightSide = getRightSideCurve(right, top, bottom, r, sideWave);

    return `
      M ${left + r} ${top}
      H ${right - r}
      Q ${right} ${top} ${right} ${rightSide.startY}
      C ${rightSide.cp1X} ${rightSide.cp1Y} ${rightSide.cp2X} ${rightSide.cp2Y} ${right} ${rightSide.endY}
      Q ${right} ${bottom} ${right - r} ${bottom}
      H ${tailBaseRight}
      L ${tipX} ${bottom}
      L ${tailBaseLeft} ${bottom}
      H ${left + r}
      Q ${left} ${bottom} ${left} ${bottom - r}
      V ${top + r}
      Q ${left} ${top} ${left + r} ${top}
      Z
    `.replace(/\s+/g, " ").trim();
  }

  function makeBubblePath(w, bodyH, r, tailHeight, topInset, sideInset, tailGeometry, sideWave) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset;
    const bodyBottom = top + bodyH;
    const { tailBaseLeft, tailBaseRight, tipX } = tailGeometry;
    const tipY = bodyBottom + tailHeight;
    const rightSide = getRightSideCurve(right, top, bodyBottom, r, sideWave);

    return `
      M ${left + r} ${top}
      H ${right - r}
      Q ${right} ${top} ${right} ${rightSide.startY}
      C ${rightSide.cp1X} ${rightSide.cp1Y} ${rightSide.cp2X} ${rightSide.cp2Y} ${right} ${rightSide.endY}
      Q ${right} ${bodyBottom} ${right - r} ${bodyBottom}
      H ${tailBaseRight}
      L ${tipX} ${tipY}
      L ${tailBaseLeft} ${bodyBottom}
      H ${left + r}
      Q ${left} ${bodyBottom} ${left} ${bodyBottom - r}
      V ${top + r}
      Q ${left} ${top} ${left + r} ${top}
      Z
    `.replace(/\s+/g, " ").trim();
  }

  function setupPill(pill) {
    const svg = pill.querySelector(".pill-bg");
    const path = pill.querySelector(".pill-path");
    const label = pill.querySelector(".pill-label");
    if (!svg || !path || !label) return;
    let morphTl = null;

    function measure() {
      const rect = pill.getBoundingClientRect();

      const w = Math.max(80, Math.round(rect.width + 20));
      const visibleH = Math.max(44, Math.round(rect.height + 18));

      return { w, visibleH };
    }

    function buildPaths() {
      const { w, visibleH } = measure();

      // fixed body height, regardless of tail height
      const bodyH = visibleH - CONFIG.topInset - CONFIG.bottomInset;

      // total svg height increases when tail gets deeper
      const svgH = visibleH + CONFIG.tailHeight;

      // push both pill and bubble body down by half the tail height
      // so the body stays visually centered around the label
      const adjustedTopInset =
        CONFIG.topInset + (CONFIG.tailHeight * CONFIG.tailCenterCompensation);
      const maxRadius = Math.min(
        bodyH / 2,
        (w - (CONFIG.sideInset * 2)) / 2
      );
      const radius = Math.min(
        maxRadius,
        Math.max(CONFIG.minRadius, bodyH * CONFIG.radiusRatio)
      );
      const bubbleTailGeometry = getTailGeometry(
        w,
        radius,
        CONFIG.tailWidth,
        CONFIG.tailOffsetX,
        CONFIG.sideInset
      );
      const pillTailGeometry = getRestTailGeometry(
        bubbleTailGeometry,
        CONFIG.liquidMorphBasePull,
        CONFIG.liquidMorphTipPull
      );
      const liquidTailGeometry = interpolateTailGeometry(
        pillTailGeometry,
        bubbleTailGeometry,
        CONFIG.liquidMorphTailMix
      );
      const pillSideWave = resolveSideWave(CONFIG.pillSideWave, radius);
      const liquidSideWave = resolveSideWave(CONFIG.liquidSideWave, radius);
      const bubbleSideWave = resolveSideWave(CONFIG.bubbleSideWave, radius);

      svg.setAttribute("viewBox", `0 0 ${w} ${svgH}`);

      const pillD = makePillPath(
        w,
        bodyH,
        radius,
        adjustedTopInset,
        CONFIG.sideInset,
        pillTailGeometry,
        pillSideWave
      );

      const liquidD = makeBubblePath(
        w,
        bodyH,
        radius,
        CONFIG.tailHeight * CONFIG.liquidMorphTailDepth,
        adjustedTopInset,
        CONFIG.sideInset,
        liquidTailGeometry,
        liquidSideWave
      );

      const bubbleD = makeBubblePath(
        w,
        bodyH,
        radius,
        CONFIG.tailHeight,
        adjustedTopInset,
        CONFIG.sideInset,
        bubbleTailGeometry,
        bubbleSideWave
      );

      path.setAttribute("d", pillD);
      path.dataset.pill = pillD;
      path.dataset.liquid = liquidD;
      path.dataset.bubble = bubbleD;
    }

    buildPaths();

    const ro = new ResizeObserver(() => {
      buildPaths();
    });
    ro.observe(pill);

    pill.addEventListener("mouseenter", () => {
      if (morphTl) morphTl.kill();
      morphTl = gsap.timeline();
      morphTl
        .to(path, {
          duration: 0.2,
          morphSVG: {
            shape: path.dataset.liquid,
            shapeIndex: 0
          },
          ease: "sine.inOut"
        })
        .to(path, {
          duration: 0.28,
          morphSVG: {
            shape: path.dataset.bubble,
            shapeIndex: 0
          },
          ease: "power2.out"
        });

      gsap.to(pill, {
        duration: 0.25,
        scale: CONFIG.hoverScale,
        ease: "power2.out"
      });
    });

    pill.addEventListener("mouseleave", () => {
      if (morphTl) morphTl.kill();
      morphTl = gsap.timeline();
      morphTl
        .to(path, {
          duration: 0.17,
          morphSVG: {
            shape: path.dataset.liquid,
            shapeIndex: 0
          },
          ease: "sine.inOut"
        })
        .to(path, {
          duration: 0.26,
          morphSVG: {
            shape: path.dataset.pill,
            shapeIndex: 0
          },
          ease: "power2.out"
        });

      gsap.to(pill, {
        duration: 0.25,
        scale: 1,
        ease: "power2.out"
      });
    });
  }

  document.querySelectorAll(".nav-pill").forEach(setupPill);
});

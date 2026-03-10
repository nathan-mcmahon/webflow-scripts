window.addEventListener("load", () => {
  const SCRIPT_VERSION = "2026.03.11.6";
  console.log(`[nav_pill] v${SCRIPT_VERSION} loaded (morph-mode: liquid-s-concave-settle-v1)`);

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
    tailTipOffsetX: 18,
    // keeps tail geometry away from the far-right corner to soften arc bulge
    rightCornerGuard: 7,
    minTailSpan: 7,
    // inward bubble-side compensation so large radii do not protrude during morph
    bubbleRightInsetRatio: 0.18,
    bubbleRightInsetMin: 1.5,
    bubbleRightInsetMax: 4,
    // temporary S-curve bridge stage used during morph
    liquidStageTailDepthRatio: 0.66,
    liquidStageRightInsetBoost: 1.4,
    liquidStageTailTipOffsetAdjust: -2,
    liquidWaveRatio: 0.78,
    liquidWaveMin: 3,
    liquidWaveMax: 9,
    liquidWaveOutFactor: 0.72,
    liquidWaveInFactor: 1.15,
    // quick concave brake stage just before settle
    concaveStageTailDepthRatio: 0.9,
    concaveStageRightInsetBoost: 1.9,
    concaveStageTailTipOffsetAdjust: -1,
    concaveWaveRatio: 0.52,
    concaveWaveMin: 2,
    concaveWaveMax: 7,
    concaveWaveInFactor1: 0.58,
    concaveWaveInFactor2: 1.38,
    liquidStageDurationEnter: 0.17,
    concaveStageDurationEnter: 0.1,
    finalStageDurationEnter: 0.21,
    concaveStageDurationExit: 0.1,
    liquidStageDurationExit: 0.15,
    finalStageDurationExit: 0.24,
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

  function makePillPath(w, bodyH, r, topInset, sideInset) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset;
    const bottom = top + bodyH;

    return `
      M ${left + r} ${top}
      H ${right - r}
      Q ${right} ${top} ${right} ${top + r}
      V ${bottom - r}
      Q ${right} ${bottom} ${right - r} ${bottom}
      H ${left + r}
      Q ${left} ${bottom} ${left} ${bottom - r}
      V ${top + r}
      Q ${left} ${top} ${left + r} ${top}
      Z
    `.replace(/\s+/g, " ").trim();
  }

  function getSoftBubbleTailGeometry(w, r, tailWidth, tailOffsetX, tailTipOffsetX, sideInset, rightCornerGuard, minTailSpan, bubbleRightInset) {
    const left = sideInset;
    const right = w - sideInset - bubbleRightInset;
    const centerX = (w / 2) + tailOffsetX;

    const rawTailBaseLeft = centerX - (tailWidth * 0.55);
    const rawTailBaseRight = centerX + (tailWidth * 0.75);

    const baseMin = left + r;
    const baseMax = Math.max(baseMin, right - r - rightCornerGuard);

    let tailBaseLeft = clamp(rawTailBaseLeft, baseMin, baseMax);
    let tailBaseRight = clamp(rawTailBaseRight, baseMin, baseMax);

    const availableBaseWidth = Math.max(0, baseMax - baseMin);
    if (availableBaseWidth > 0) {
      const requiredTailSpan = Math.min(minTailSpan, availableBaseWidth);
      if ((tailBaseRight - tailBaseLeft) < requiredTailSpan) {
        const centeredTail = clamp(
          centerX,
          baseMin + (requiredTailSpan / 2),
          baseMax - (requiredTailSpan / 2)
        );
        tailBaseLeft = centeredTail - (requiredTailSpan / 2);
        tailBaseRight = centeredTail + (requiredTailSpan / 2);
      }
    }

    const tipMin = baseMin;
    const tipMax = Math.max(tipMin, right - r - (rightCornerGuard * 0.35));
    const tipX = clamp(centerX + tailTipOffsetX, tipMin, tipMax);

    return {
      tailBaseLeft,
      tailBaseRight,
      tipX
    };
  }

  function makeBubblePath(w, bodyH, r, tailHeight, topInset, sideInset, tailGeometry, bubbleRightInset) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset - bubbleRightInset;
    const bodyBottom = top + bodyH;

    const { tailBaseLeft, tailBaseRight, tipX } = tailGeometry;
    const tipY = bodyBottom + tailHeight;

    return `
      M ${left + r} ${top}
      H ${right - r}
      Q ${right} ${top} ${right} ${top + r}
      V ${bodyBottom - r}
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

  function makeLiquidWavePath(
    w,
    bodyH,
    r,
    tailHeight,
    topInset,
    sideInset,
    tailGeometry,
    liquidRightInset,
    liquidWave,
    waveOutFactor,
    waveInFactor
  ) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset - liquidRightInset;
    const bodyBottom = top + bodyH;
    const { tailBaseLeft, tailBaseRight, tipX } = tailGeometry;
    const tipY = bodyBottom + tailHeight;

    const startY = top + r;
    const endY = bodyBottom - r;
    const sideSpan = Math.max(0, endY - startY);
    const wave = clamp(liquidWave, 0, sideSpan * 0.45);

    const cp1X = right + (wave * waveOutFactor);
    const cp1Y = startY + (sideSpan * 0.36);
    const cp2X = right - (wave * waveInFactor);
    const cp2Y = startY + (sideSpan * 0.72);

    return `
      M ${left + r} ${top}
      H ${right - r}
      Q ${right} ${top} ${right} ${startY}
      C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${right} ${endY}
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

  function makeConcaveSettlePath(
    w,
    bodyH,
    r,
    tailHeight,
    topInset,
    sideInset,
    tailGeometry,
    concaveRightInset,
    concaveWave,
    concaveInFactor1,
    concaveInFactor2
  ) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset - concaveRightInset;
    const bodyBottom = top + bodyH;
    const { tailBaseLeft, tailBaseRight, tipX } = tailGeometry;
    const tipY = bodyBottom + tailHeight;

    const startY = top + r;
    const endY = bodyBottom - r;
    const sideSpan = Math.max(0, endY - startY);
    const wave = clamp(concaveWave, 0, sideSpan * 0.5);

    const cp1X = right - (wave * concaveInFactor1);
    const cp1Y = startY + (sideSpan * 0.38);
    const cp2X = right - (wave * concaveInFactor2);
    const cp2Y = startY + (sideSpan * 0.73);

    return `
      M ${left + r} ${top}
      H ${right - r}
      Q ${right} ${top} ${right} ${startY}
      C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${right} ${endY}
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
      const bubbleRightInset = clamp(
        radius * CONFIG.bubbleRightInsetRatio,
        CONFIG.bubbleRightInsetMin,
        CONFIG.bubbleRightInsetMax
      );
      const liquidRightInset = bubbleRightInset + CONFIG.liquidStageRightInsetBoost;
      const concaveRightInset = bubbleRightInset + CONFIG.concaveStageRightInsetBoost;
      const liquidWave = clamp(
        radius * CONFIG.liquidWaveRatio,
        CONFIG.liquidWaveMin,
        CONFIG.liquidWaveMax
      );
      const concaveWave = clamp(
        radius * CONFIG.concaveWaveRatio,
        CONFIG.concaveWaveMin,
        CONFIG.concaveWaveMax
      );

      const bubbleTailGeometry = getSoftBubbleTailGeometry(
        w,
        radius,
        CONFIG.tailWidth,
        CONFIG.tailOffsetX,
        CONFIG.tailTipOffsetX,
        CONFIG.sideInset,
        CONFIG.rightCornerGuard,
        CONFIG.minTailSpan,
        bubbleRightInset
      );
      const liquidTailGeometry = getSoftBubbleTailGeometry(
        w,
        radius,
        CONFIG.tailWidth,
        CONFIG.tailOffsetX,
        CONFIG.tailTipOffsetX + CONFIG.liquidStageTailTipOffsetAdjust,
        CONFIG.sideInset,
        CONFIG.rightCornerGuard,
        CONFIG.minTailSpan,
        liquidRightInset
      );
      const concaveTailGeometry = getSoftBubbleTailGeometry(
        w,
        radius,
        CONFIG.tailWidth,
        CONFIG.tailOffsetX,
        CONFIG.tailTipOffsetX + CONFIG.concaveStageTailTipOffsetAdjust,
        CONFIG.sideInset,
        CONFIG.rightCornerGuard,
        CONFIG.minTailSpan,
        concaveRightInset
      );

      svg.setAttribute("viewBox", `0 0 ${w} ${svgH}`);

      const pillD = makePillPath(
        w,
        bodyH,
        radius,
        adjustedTopInset,
        CONFIG.sideInset
      );

      const bubbleD = makeBubblePath(
        w,
        bodyH,
        radius,
        CONFIG.tailHeight,
        adjustedTopInset,
        CONFIG.sideInset,
        bubbleTailGeometry,
        bubbleRightInset
      );
      const liquidD = makeLiquidWavePath(
        w,
        bodyH,
        radius,
        CONFIG.tailHeight * CONFIG.liquidStageTailDepthRatio,
        adjustedTopInset,
        CONFIG.sideInset,
        liquidTailGeometry,
        liquidRightInset,
        liquidWave,
        CONFIG.liquidWaveOutFactor,
        CONFIG.liquidWaveInFactor
      );
      const concaveD = makeConcaveSettlePath(
        w,
        bodyH,
        radius,
        CONFIG.tailHeight * CONFIG.concaveStageTailDepthRatio,
        adjustedTopInset,
        CONFIG.sideInset,
        concaveTailGeometry,
        concaveRightInset,
        concaveWave,
        CONFIG.concaveWaveInFactor1,
        CONFIG.concaveWaveInFactor2
      );

      path.setAttribute("d", pillD);
      path.dataset.pill = pillD;
      path.dataset.liquid = liquidD;
      path.dataset.concave = concaveD;
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
          duration: CONFIG.liquidStageDurationEnter,
          morphSVG: path.dataset.liquid,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: CONFIG.concaveStageDurationEnter,
          morphSVG: path.dataset.concave,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: CONFIG.finalStageDurationEnter,
          morphSVG: path.dataset.bubble,
          ease: "sine.out",
          overwrite: true
        });

      gsap.to(pill, {
        duration: 0.25,
        scale: CONFIG.hoverScale,
        ease: "power2.out",
        overwrite: true
      });
    });

    pill.addEventListener("mouseleave", () => {
      if (morphTl) morphTl.kill();
      morphTl = gsap.timeline();
      morphTl
        .to(path, {
          duration: CONFIG.concaveStageDurationExit,
          morphSVG: path.dataset.concave,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: CONFIG.liquidStageDurationExit,
          morphSVG: path.dataset.liquid,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: CONFIG.finalStageDurationExit,
          morphSVG: path.dataset.pill,
          ease: "sine.out",
          overwrite: true
        });

      gsap.to(pill, {
        duration: 0.25,
        scale: 1,
        ease: "power2.out",
        overwrite: true
      });
    });
  }

  document.querySelectorAll(".nav-pill").forEach(setupPill);
});

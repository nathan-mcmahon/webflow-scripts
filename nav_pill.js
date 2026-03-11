window.addEventListener("load", () => {
  const SCRIPT_VERSION = "2026.03.11.21";
  console.log(`[nav_pill] v${SCRIPT_VERSION} loaded (morph-mode: liquid-s-concave-settle-v12-explicit-leave-speed)`);

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
    // entry squeeze stage: sharply reduce corner radius and pull right edge inward
    // at morph start, then progressively restore roundness.
    entrySqueezeStageTailDepthRatio: 0.74,
    entrySqueezeStageRightInsetBoost: 1.4,
    entrySqueezeStageTailTipOffsetAdjust: -7,
    entrySqueezeWaveRatio: 1.4,
    entrySqueezeWaveMin: 8,
    entrySqueezeWaveMax: 24,
    entrySqueezeWaveInFactor1: 1.55,
    entrySqueezeWaveInFactor2: 3.6,
    // temporary S-curve bridge stage used during morph
    liquidStageTailDepthRatio: 0.74,
    liquidStageRightInsetBoost: 0.5,
    liquidStageTailTipOffsetAdjust: -3,
    liquidWaveRatio: 1.25,
    liquidWaveMin: 7,
    liquidWaveMax: 18,
    liquidWaveOutFactor: 1.15,
    liquidWaveInFactor: 1.65,
    // cap convex overshoot so liquid stage stays wavy without hard bulge
    liquidWaveMaxOutwardPx: 1.1,
    waveRightEnvelopeInsetPx: 0.8,
    // intentionally shrink corner radius during early stages, then restore by settle
    entrySqueezeStageRadiusRatio: 0.08,
    liquidStageRadiusRatio: 0.28,
    concaveStageRadiusRatio: 0.5,
    bubbleStageRadiusRatio: 0.58,
    // final hover endpoint: round corners up slightly after bubble fully forms
    finalCornerLiftStageRadiusRatio: 0.76,
    stageRadiusMinPx: 2,
    // quick concave brake stage just before settle
    concaveStageTailDepthRatio: 0.96,
    concaveStageRightInsetBoost: 0.9,
    concaveStageTailTipOffsetAdjust: -4,
    concaveWaveRatio: 0.9,
    concaveWaveMin: 5,
    concaveWaveMax: 14,
    concaveWaveInFactor1: 1.0,
    concaveWaveInFactor2: 2.2,
    // when pill radius reaches half-height, right-side span collapses to 0;
    // force a small transition span so S/concave stages are visually expressed
    morphWaveMinSideSpanRatio: 0.34,
    morphWaveMinSideSpanPx: 10,
    entrySqueezeDurationEnter: 0.03,
    liquidStageDurationEnter: 0.2,
    concaveStageDurationEnter: 0.14,
    finalStageDurationEnter: 0.24,
    finalCornerLiftDurationEnter: 0.1,
    // test knobs to inspect path behavior in slow motion (1 = normal speed)
    morphSlowMotionFactor: 3.0,
    morphSlowMotionFactorLeave: 10.0,
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

  function morphDuration(baseSeconds, slowFactor) {
    return baseSeconds * slowFactor;
  }

  function resolveStageRadius(baseRadius, radiusRatio, bodyH, width, sideInset, rightInset, minRadiusPx) {
    const left = sideInset;
    const right = width - sideInset - rightInset;
    const maxByHeight = bodyH / 2;
    const maxByWidth = (right - left) / 2;
    const stageMax = Math.max(0, Math.min(maxByHeight, maxByWidth));
    const desired = baseRadius * radiusRatio;
    return clamp(desired, Math.min(minRadiusPx, stageMax), stageMax);
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

  function getWaveSpanGuide(top, bottom, r, minSideSpan) {
    const naturalStart = top + r;
    const naturalEnd = bottom - r;
    const naturalSpan = naturalEnd - naturalStart;

    if (naturalSpan >= minSideSpan) {
      return {
        startY: naturalStart,
        endY: naturalEnd
      };
    }

    const centerY = (top + bottom) / 2;
    const halfSpan = minSideSpan / 2;
    const clampedStart = Math.max(top, centerY - halfSpan);
    const clampedEnd = Math.min(bottom, centerY + halfSpan);

    return {
      startY: clampedStart,
      endY: clampedEnd
    };
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
    waveInFactor,
    maxOutwardPx,
    rightEnvelopeInsetPx,
    minWaveSideSpan
  ) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset - liquidRightInset;
    const bodyBottom = top + bodyH;
    const { tailBaseLeft, tailBaseRight, tipX } = tailGeometry;
    const tipY = bodyBottom + tailHeight;

    const waveGuide = getWaveSpanGuide(top, bodyBottom, r, minWaveSideSpan);
    const startY = waveGuide.startY;
    const endY = waveGuide.endY;
    const sideSpan = Math.max(0, endY - startY);
    const wave = clamp(liquidWave, 0, sideSpan * 0.45);

    const cp1Raw = right + (wave * waveOutFactor);
    const cp1MaxByWave = right + maxOutwardPx;
    const cp1MaxByEnvelope = (w - sideInset) - rightEnvelopeInsetPx;
    const cp1X = Math.min(cp1Raw, cp1MaxByWave, cp1MaxByEnvelope);
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
    concaveInFactor2,
    minWaveSideSpan
  ) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset - concaveRightInset;
    const bodyBottom = top + bodyH;
    const { tailBaseLeft, tailBaseRight, tipX } = tailGeometry;
    const tipY = bodyBottom + tailHeight;

    const waveGuide = getWaveSpanGuide(top, bodyBottom, r, minWaveSideSpan);
    const startY = waveGuide.startY;
    const endY = waveGuide.endY;
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
      const minWaveSideSpan = Math.max(
        CONFIG.morphWaveMinSideSpanPx,
        bodyH * CONFIG.morphWaveMinSideSpanRatio
      );
      const bubbleRightInset = clamp(
        radius * CONFIG.bubbleRightInsetRatio,
        CONFIG.bubbleRightInsetMin,
        CONFIG.bubbleRightInsetMax
      );
      const liquidRightInset = bubbleRightInset + CONFIG.liquidStageRightInsetBoost;
      const concaveRightInset = bubbleRightInset + CONFIG.concaveStageRightInsetBoost;
      const entrySqueezeRightInset = bubbleRightInset + CONFIG.entrySqueezeStageRightInsetBoost;
      const liquidWave = clamp(
        radius * CONFIG.liquidWaveRatio,
        CONFIG.liquidWaveMin,
        CONFIG.liquidWaveMax
      );
      const entrySqueezeWave = clamp(
        radius * CONFIG.entrySqueezeWaveRatio,
        CONFIG.entrySqueezeWaveMin,
        CONFIG.entrySqueezeWaveMax
      );
      const concaveWave = clamp(
        radius * CONFIG.concaveWaveRatio,
        CONFIG.concaveWaveMin,
        CONFIG.concaveWaveMax
      );
      const entrySqueezeStageRadius = resolveStageRadius(
        radius,
        CONFIG.entrySqueezeStageRadiusRatio,
        bodyH,
        w,
        CONFIG.sideInset,
        entrySqueezeRightInset,
        CONFIG.stageRadiusMinPx
      );
      const bubbleStageRadius = resolveStageRadius(
        radius,
        CONFIG.bubbleStageRadiusRatio,
        bodyH,
        w,
        CONFIG.sideInset,
        bubbleRightInset,
        CONFIG.stageRadiusMinPx
      );
      const finalCornerLiftStageRadius = resolveStageRadius(
        radius,
        CONFIG.finalCornerLiftStageRadiusRatio,
        bodyH,
        w,
        CONFIG.sideInset,
        bubbleRightInset,
        CONFIG.stageRadiusMinPx
      );
      const liquidStageRadius = resolveStageRadius(
        radius,
        CONFIG.liquidStageRadiusRatio,
        bodyH,
        w,
        CONFIG.sideInset,
        liquidRightInset,
        CONFIG.stageRadiusMinPx
      );
      const concaveStageRadius = resolveStageRadius(
        radius,
        CONFIG.concaveStageRadiusRatio,
        bodyH,
        w,
        CONFIG.sideInset,
        concaveRightInset,
        CONFIG.stageRadiusMinPx
      );

      const entrySqueezeTailGeometry = getSoftBubbleTailGeometry(
        w,
        entrySqueezeStageRadius,
        CONFIG.tailWidth,
        CONFIG.tailOffsetX,
        CONFIG.tailTipOffsetX + CONFIG.entrySqueezeStageTailTipOffsetAdjust,
        CONFIG.sideInset,
        CONFIG.rightCornerGuard,
        CONFIG.minTailSpan,
        entrySqueezeRightInset
      );
      const bubbleTailGeometry = getSoftBubbleTailGeometry(
        w,
        bubbleStageRadius,
        CONFIG.tailWidth,
        CONFIG.tailOffsetX,
        CONFIG.tailTipOffsetX,
        CONFIG.sideInset,
        CONFIG.rightCornerGuard,
        CONFIG.minTailSpan,
        bubbleRightInset
      );
      const finalCornerLiftTailGeometry = getSoftBubbleTailGeometry(
        w,
        finalCornerLiftStageRadius,
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
        liquidStageRadius,
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
        concaveStageRadius,
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
        bubbleStageRadius,
        CONFIG.tailHeight,
        adjustedTopInset,
        CONFIG.sideInset,
        bubbleTailGeometry,
        bubbleRightInset
      );
      const bubbleCornerLiftD = makeBubblePath(
        w,
        bodyH,
        finalCornerLiftStageRadius,
        CONFIG.tailHeight,
        adjustedTopInset,
        CONFIG.sideInset,
        finalCornerLiftTailGeometry,
        bubbleRightInset
      );
      const squeezeD = makeConcaveSettlePath(
        w,
        bodyH,
        entrySqueezeStageRadius,
        CONFIG.tailHeight * CONFIG.entrySqueezeStageTailDepthRatio,
        adjustedTopInset,
        CONFIG.sideInset,
        entrySqueezeTailGeometry,
        entrySqueezeRightInset,
        entrySqueezeWave,
        CONFIG.entrySqueezeWaveInFactor1,
        CONFIG.entrySqueezeWaveInFactor2,
        minWaveSideSpan
      );
      const liquidD = makeLiquidWavePath(
        w,
        bodyH,
        liquidStageRadius,
        CONFIG.tailHeight * CONFIG.liquidStageTailDepthRatio,
        adjustedTopInset,
        CONFIG.sideInset,
        liquidTailGeometry,
        liquidRightInset,
        liquidWave,
        CONFIG.liquidWaveOutFactor,
        CONFIG.liquidWaveInFactor,
        CONFIG.liquidWaveMaxOutwardPx,
        CONFIG.waveRightEnvelopeInsetPx,
        minWaveSideSpan
      );
      const concaveD = makeConcaveSettlePath(
        w,
        bodyH,
        concaveStageRadius,
        CONFIG.tailHeight * CONFIG.concaveStageTailDepthRatio,
        adjustedTopInset,
        CONFIG.sideInset,
        concaveTailGeometry,
        concaveRightInset,
        concaveWave,
        CONFIG.concaveWaveInFactor1,
        CONFIG.concaveWaveInFactor2,
        minWaveSideSpan
      );

      path.setAttribute("d", pillD);
      path.dataset.pill = pillD;
      path.dataset.squeeze = squeezeD;
      path.dataset.liquid = liquidD;
      path.dataset.concave = concaveD;
      path.dataset.bubble = bubbleD;
      path.dataset.bubbleCornerLift = bubbleCornerLiftD;
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
          duration: morphDuration(CONFIG.entrySqueezeDurationEnter, CONFIG.morphSlowMotionFactor),
          morphSVG: path.dataset.squeeze,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: morphDuration(CONFIG.liquidStageDurationEnter, CONFIG.morphSlowMotionFactor),
          morphSVG: path.dataset.liquid,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: morphDuration(CONFIG.concaveStageDurationEnter, CONFIG.morphSlowMotionFactor),
          morphSVG: path.dataset.concave,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: morphDuration(CONFIG.finalStageDurationEnter, CONFIG.morphSlowMotionFactor),
          morphSVG: path.dataset.bubble,
          ease: "sine.out",
          overwrite: true
        })
        .to(path, {
          duration: morphDuration(CONFIG.finalCornerLiftDurationEnter, CONFIG.morphSlowMotionFactor),
          morphSVG: path.dataset.bubbleCornerLift,
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
          duration: morphDuration(CONFIG.finalCornerLiftDurationEnter, CONFIG.morphSlowMotionFactorLeave),
          morphSVG: path.dataset.bubble,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: morphDuration(CONFIG.finalStageDurationEnter, CONFIG.morphSlowMotionFactorLeave),
          morphSVG: path.dataset.concave,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: morphDuration(CONFIG.concaveStageDurationEnter, CONFIG.morphSlowMotionFactorLeave),
          morphSVG: path.dataset.liquid,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: morphDuration(CONFIG.liquidStageDurationEnter, CONFIG.morphSlowMotionFactorLeave),
          morphSVG: path.dataset.squeeze,
          ease: "sine.inOut",
          overwrite: true
        })
        .to(path, {
          duration: morphDuration(CONFIG.entrySqueezeDurationEnter, CONFIG.morphSlowMotionFactorLeave),
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

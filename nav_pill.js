window.addEventListener("load", () => {
  if (!window.gsap || !window.MorphSVGPlugin) {
    console.warn("GSAP or MorphSVGPlugin missing.");
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
    hoverScale: 1.04,

    // visual spacing around the body shape
    sideInset: 0,
    topInset: 10,
    bottomInset: 10,

    // keeps the body centered in the taller SVG canvas
    tailCenterCompensation: 0.3
  };

  function getTailGeometry(w, r, tailWidth, tailOffsetX, sideInset) {
    const left = sideInset;
    const right = w - sideInset;
    const centerX = w / 2 + tailOffsetX;
    const rawTailBaseLeft = centerX - (tailWidth * 0.55);
    const rawTailBaseRight = centerX + (tailWidth * 0.75);
    const minBaseX = left + r;
    const maxBaseX = right - r;
    const availableBaseWidth = Math.max(0, maxBaseX - minBaseX);

    let tailBaseLeft = Math.min(maxBaseX, Math.max(minBaseX, rawTailBaseLeft));
    let tailBaseRight = Math.min(maxBaseX, Math.max(minBaseX, rawTailBaseRight));

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

    const tipX = Math.min(maxBaseX, Math.max(minBaseX, centerX + 20));

    return {
      tailBaseLeft,
      tailBaseRight,
      tipX
    };
  }

  function makePillPath(w, bodyH, r, topInset, sideInset, tailGeometry) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset;
    const bottom = top + bodyH;
    const { tailBaseLeft, tailBaseRight, tipX } = tailGeometry;

    return `
      M ${left + r} ${top}
      H ${right - r}
      Q ${right} ${top} ${right} ${top + r}
      V ${bottom - r}
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

  function makeBubblePath(w, bodyH, r, tailHeight, topInset, sideInset, tailGeometry) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset;
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

  function setupPill(pill) {
    const svg = pill.querySelector(".pill-bg");
    const path = pill.querySelector(".pill-path");
    const label = pill.querySelector(".pill-label");
    if (!svg || !path || !label) return;

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
      const tailGeometry = getTailGeometry(
        w,
        radius,
        CONFIG.tailWidth,
        CONFIG.tailOffsetX,
        CONFIG.sideInset
      );

      svg.setAttribute("viewBox", `0 0 ${w} ${svgH}`);

      const pillD = makePillPath(
        w,
        bodyH,
        radius,
        adjustedTopInset,
        CONFIG.sideInset,
        tailGeometry
      );

      const bubbleD = makeBubblePath(
        w,
        bodyH,
        radius,
        CONFIG.tailHeight,
        adjustedTopInset,
        CONFIG.sideInset,
        tailGeometry
      );

      path.setAttribute("d", pillD);
      path.dataset.pill = pillD;
      path.dataset.bubble = bubbleD;
    }

    buildPaths();

    const ro = new ResizeObserver(() => {
      buildPaths();
    });
    ro.observe(pill);

    pill.addEventListener("mouseenter", () => {
      gsap.to(path, {
        duration: 0.45,
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
      gsap.to(path, {
        duration: 0.45,
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

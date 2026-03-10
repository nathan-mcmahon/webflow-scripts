window.addEventListener("load", () => {
  if (!window.gsap || !window.MorphSVGPlugin) {
    console.warn("GSAP or MorphSVGPlugin missing.");
    return;
  }

  gsap.registerPlugin(MorphSVGPlugin);

  const CONFIG = {
    radius: 14,
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

  function makeBubblePath(w, bodyH, r, tailWidth, tailHeight, tailOffsetX, topInset, sideInset) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset;
    const bodyBottom = top + bodyH;

    const centerX = w / 2 + tailOffsetX;
    const tailBaseLeft = centerX - (tailWidth * 0.55);
    const tailBaseRight = centerX + (tailWidth * 0.75);
    const tipX = centerX + 20;
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

      svg.setAttribute("viewBox", `0 0 ${w} ${svgH}`);

      const pillD = makePillPath(
        w,
        bodyH,
        CONFIG.radius,
        adjustedTopInset,
        CONFIG.sideInset
      );

      const bubbleD = makeBubblePath(
        w,
        bodyH,
        CONFIG.radius,
        CONFIG.tailWidth,
        CONFIG.tailHeight,
        CONFIG.tailOffsetX,
        adjustedTopInset,
        CONFIG.sideInset
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
        morphSVG: path.dataset.bubble,
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
        morphSVG: path.dataset.pill,
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
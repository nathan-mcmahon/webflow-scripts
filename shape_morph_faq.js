
window.addEventListener("load", () => {
  // Guard against duplicate embed/script instances on the same page.
  if (window.__faqBubbleMorphInit) return;
  window.__faqBubbleMorphInit = true;

  if (!window.gsap || !window.MorphSVGPlugin) {
    console.warn("GSAP or MorphSVGPlugin missing.");
    return;
  }

  gsap.registerPlugin(MorphSVGPlugin);

  const CONFIG = {
    closed: {
      radius: 20,
      tailWidth: 35,
      tailHeight: 20,
      tailOffsetX: 300,
      tailLeftRatio: 0.5,
      tailRightRatio: 0.5,
      tipNudgeX: 1,
      tipNudgeY: 0,
      tailCurveSkew: 0.08
    },
    open: {
      radius: 33,
      tailWidth: 42,
      tailHeight: 45,
      tailOffsetX: -300,
      tailLeftRatio: 0.72,
      tailRightRatio: 0.28,
      tipNudgeX: -18,
      tipNudgeY: 0,
      tailCurveSkew: -0.26
    },
    minFrameHeight: 90,
    frameHeightPad: 20,
    sideInset: 6,
    topInset: 8,
    bottomInset: 8,
    openFill: "#d5ff87"
  };

  function makeBubblePath(
    w,
    h,
    r,
    tailWidth,
    tailHeight,
    tailOffsetX,
    tailLeftRatio,
    tailRightRatio,
    tipNudgeX,
    tipNudgeY,
    tailCurveSkew,
    bodyBottom,
    topInset,
    sideInset,
    bottomInset
  ) {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset;
    const maxR = Math.max(6, Math.min(((right - left) / 2) - 2, ((bodyBottom - top) / 2) - 2));
    const rr = clamp(r, 6, maxR);
    const bodyY = clamp(bodyBottom, top + rr + 2, h - bottomInset - 1);

    // Reduce extreme tail offsets on small widths to prevent side spikes.
    const halfSpan = (right - left) / 2;
    const offsetLimit = Math.max(0, halfSpan - rr - 6);
    const safeOffsetX = clamp(tailOffsetX, -offsetLimit, offsetLimit);

    const centerX = clamp((left + right) / 2 + safeOffsetX, left + rr + 4, right - rr - 4);
    const rawTailBaseLeft = centerX - (tailWidth * tailLeftRatio);
    const rawTailBaseRight = centerX + (tailWidth * tailRightRatio);
    const tailBaseLeftMin = left + rr + 2;
    const tailBaseLeftMax = right - rr - 8;
    const tailBaseRightMin = left + rr + 8;
    const tailBaseRightMax = right - rr - 2;
    let tailBaseLeft = clamp(rawTailBaseLeft, tailBaseLeftMin, tailBaseLeftMax);
    let tailBaseRight = clamp(rawTailBaseRight, tailBaseRightMin, tailBaseRightMax);

    // Keep a valid base gap on narrow/small boxes to avoid side spikes at animation start.
    const minBaseGap = Math.max(2, Math.min(8, tailWidth * 0.5));
    if (tailBaseRight - tailBaseLeft < minBaseGap) {
      const mid = clamp(
        centerX,
        tailBaseLeftMin + (minBaseGap / 2),
        tailBaseRightMax - (minBaseGap / 2)
      );
      tailBaseLeft = clamp(mid - (minBaseGap / 2), tailBaseLeftMin, tailBaseLeftMax);
      tailBaseRight = clamp(mid + (minBaseGap / 2), tailBaseRightMin, tailBaseRightMax);
    }
    if (tailBaseRight <= tailBaseLeft) {
      tailBaseRight = Math.min(tailBaseRightMax, tailBaseLeft + minBaseGap);
      tailBaseLeft = Math.max(tailBaseLeftMin, tailBaseRight - minBaseGap);
    }

    const tipX = clamp(centerX + tipNudgeX, left + rr + 1, right - rr - 1);
    const tipY = clamp(
      bodyY + tailHeight + tipNudgeY,
      bodyY + 2,
      h - bottomInset
    );

    const ctrlShift = tailWidth * tailCurveSkew;
    let outCtrlX = tailBaseRight - tailWidth * 0.28 + ctrlShift;
    const outCtrlY = bodyY + tailHeight * 0.44;
    let inCtrlX = tailBaseLeft + tailWidth * 0.34 + ctrlShift;
    const inCtrlY = bodyY + tailHeight * 0.72;
    const ctrlMin = tailBaseLeft + 1;
    const ctrlMax = tailBaseRight - 1;
    outCtrlX = clamp(outCtrlX, ctrlMin, ctrlMax);
    inCtrlX = clamp(inCtrlX, ctrlMin, ctrlMax);
    if (inCtrlX > outCtrlX) {
      const mid = (inCtrlX + outCtrlX) / 2;
      inCtrlX = mid - 0.5;
      outCtrlX = mid + 0.5;
    }

    return `
      M ${left + rr} ${top}
      H ${right - rr}
      Q ${right} ${top} ${right} ${top + rr}
      V ${bodyY - rr}
      Q ${right} ${bodyY} ${right - rr} ${bodyY}
      H ${tailBaseRight}
      Q ${outCtrlX} ${outCtrlY} ${tipX} ${tipY}
      Q ${inCtrlX} ${inCtrlY} ${tailBaseLeft} ${bodyY}
      H ${left + rr}
      Q ${left} ${bodyY} ${left} ${bodyY - rr}
      V ${top + rr}
      Q ${left} ${top} ${left + rr} ${top}
      Z
    `.replace(/\s+/g, " ").trim();
  }

  function ensureBubbleForItem(accordionItem) {
    let svg = accordionItem.querySelector(".faq-bubble-svg");
    let path = accordionItem.querySelector(".faq-bubble-path");

    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "faq-bubble-svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      accordionItem.prepend(svg);
    } else if (svg.parentNode === accordionItem && accordionItem.firstElementChild !== svg) {
      accordionItem.insertBefore(svg, accordionItem.firstChild);
    }

    if (!path) {
      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "faq-bubble-path");
      svg.appendChild(path);
    } else if (path.parentNode !== svg) {
      svg.appendChild(path);
    }

    if (getComputedStyle(accordionItem).position === "static") {
      accordionItem.style.position = "relative";
    }
    accordionItem.style.isolation = "isolate";

    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.zIndex = "0";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";

    return { svg, path };
  }

  function setupFaqItem(accordionItem) {
    const toggle = accordionItem.querySelector(".w-dropdown-toggle, .dropdown-toggle");
    const answer = accordionItem.querySelector(".answer, .w-dropdown-list");
    if (!accordionItem || !toggle || !answer) return;

    if (getComputedStyle(toggle).position === "static") {
      toggle.style.position = "relative";
    }
    if (!toggle.style.zIndex) {
      toggle.style.zIndex = "1";
    }
    if (getComputedStyle(answer).position === "static") {
      answer.style.position = "relative";
    }
    if (!answer.style.zIndex) {
      answer.style.zIndex = "1";
    }

    const bubble = ensureBubbleForItem(accordionItem);
    const svg = bubble?.svg;
    const path = bubble?.path;

    if (!svg || !path) return;
    if (accordionItem.dataset.faqBubbleInit === "1") return;
    accordionItem.dataset.faqBubbleInit = "1";

    let currentOpen = null;
    let tl = null;
    let isAnimating = false;

    function getIsOpen() {
      return (
        toggle.getAttribute("aria-expanded") === "true" ||
        toggle.classList.contains("w--open") ||
        answer.classList.contains("w--open") ||
        accordionItem.classList.contains("w--open")
      );
    }

    function buildPathSet() {
      const itemRect = accordionItem.getBoundingClientRect();
      const toggleRect = toggle.getBoundingClientRect();
      const lerp = (a, b, t) => a + ((b - a) * t);

      const w = Math.max(80, Math.round(itemRect.width));
      const baseFrameH = Math.round(toggleRect.height + CONFIG.frameHeightPad);
      const h = Math.max(CONFIG.minFrameHeight, baseFrameH, Math.round(itemRect.height));
      const maxBodyBottom = h - CONFIG.bottomInset - 1;
      const minClosedBodyBottom = CONFIG.topInset + CONFIG.closed.radius + 2;
      const closedBodyBottom = Math.max(
        minClosedBodyBottom,
        Math.min(
          h - CONFIG.bottomInset - 1,
          baseFrameH - CONFIG.closed.tailHeight - CONFIG.bottomInset
        )
      );
      const openBodyBottom = Math.max(
        closedBodyBottom,
        Math.min(maxBodyBottom, h - CONFIG.open.tailHeight - CONFIG.bottomInset)
      );
      const bodyAt = (t) => Math.round(
        closedBodyBottom + ((openBodyBottom - closedBodyBottom) * t)
      );
      const absorbT = 0.56;
      const absorbedRadius = Math.round(lerp(CONFIG.closed.radius, CONFIG.open.radius, 0.42));
      const absorbedTailWidth = Math.max(
        6,
        Math.round(lerp(CONFIG.closed.tailWidth, CONFIG.open.tailWidth, 0.24) * 0.2)
      );
      const absorbedTailOffsetX = Math.round(
        lerp(CONFIG.closed.tailOffsetX, CONFIG.open.tailOffsetX, absorbT)
      );
      const absorbedTipNudgeX = Math.round(
        lerp(CONFIG.closed.tipNudgeX, CONFIG.open.tipNudgeX, absorbT)
      );
      const openOvershootTailWidth = Math.round(CONFIG.open.tailWidth * 1.08);
      const openOvershootTailHeight = CONFIG.open.tailHeight + 6;
      const openOvershootTailOffsetX = CONFIG.open.tailOffsetX - 18;
      const openOvershootTipNudgeX = CONFIG.open.tipNudgeX - 5;
      const openOvershootTipNudgeY = CONFIG.open.tipNudgeY + 3;

      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("width", `${w}`);
      svg.setAttribute("height", `${h}`);

      return {
        closed: makeBubblePath(
          w, h,
          CONFIG.closed.radius,
          CONFIG.closed.tailWidth,
          CONFIG.closed.tailHeight,
          CONFIG.closed.tailOffsetX,
          CONFIG.closed.tailLeftRatio,
          CONFIG.closed.tailRightRatio,
          CONFIG.closed.tipNudgeX,
          CONFIG.closed.tipNudgeY,
          CONFIG.closed.tailCurveSkew,
          bodyAt(0),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        absorbed: makeBubblePath(
          w, h,
          absorbedRadius,
          absorbedTailWidth,
          0.7,
          absorbedTailOffsetX,
          0.5,
          0.5,
          absorbedTipNudgeX,
          0,
          0,
          bodyAt(absorbT),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        openOvershoot: makeBubblePath(
          w, h,
          CONFIG.open.radius,
          openOvershootTailWidth,
          openOvershootTailHeight,
          openOvershootTailOffsetX,
          CONFIG.open.tailLeftRatio,
          CONFIG.open.tailRightRatio,
          openOvershootTipNudgeX,
          openOvershootTipNudgeY,
          CONFIG.open.tailCurveSkew * 1.08,
          bodyAt(1),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        open: makeBubblePath(
          w, h,
          CONFIG.open.radius,
          CONFIG.open.tailWidth,
          CONFIG.open.tailHeight,
          CONFIG.open.tailOffsetX,
          CONFIG.open.tailLeftRatio,
          CONFIG.open.tailRightRatio,
          CONFIG.open.tipNudgeX,
          CONFIG.open.tipNudgeY,
          CONFIG.open.tailCurveSkew,
          bodyAt(1),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        )
      };
    }

    function storePathSet(paths) {
      path.dataset.closed = paths.closed;
      path.dataset.absorbed = paths.absorbed;
      path.dataset.openOvershoot = paths.openOvershoot;
      path.dataset.open = paths.open;
    }

    function morphStep(targetShape, duration, ease) {
      return {
        duration,
        morphSVG: {
          shape: targetShape,
          shapeIndex: "auto",
          type: "linear",
          map: "position"
        },
        ease
      };
    }

    function applyStatic(isOpen) {
      const paths = buildPathSet();
      storePathSet(paths);
      path.setAttribute("d", isOpen ? paths.open : paths.closed);
      path.setAttribute("fill", isOpen ? CONFIG.openFill : "transparent");
      gsap.set(svg, { scaleX: 1, scaleY: 1, transformOrigin: "50% 50%" });
    }

    function refreshPathDataOnly() {
      const paths = buildPathSet();
      storePathSet(paths);
    }

    function animateToState(isOpen, fromOpen) {
      refreshPathDataOnly();
      path.setAttribute("d", fromOpen ? path.dataset.open : path.dataset.closed);

      if (tl) tl.kill();
      isAnimating = true;

      tl = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          isAnimating = false;
          applyStatic(isOpen);
        }
      });

      if (isOpen) {
        tl.to(path, morphStep(path.dataset.absorbed, 0.22, "sine.inOut"), 0)
        .to(path, morphStep(path.dataset.openOvershoot, 0.12, "sine.out"), 0.22)
        .to(path, morphStep(path.dataset.open, 0.1, "sine.in"), 0.34)
        .to(path, {
          duration: 0.22,
          fill: CONFIG.openFill,
          ease: "sine.out"
        }, 0.18);
      } else {
        tl.to(path, morphStep(path.dataset.absorbed, 0.18, "sine.inOut"), 0)
        .to(path, morphStep(path.dataset.closed, 0.18, "sine.inOut"), 0.18)
        .to(path, {
          duration: 0.2,
          fill: "transparent",
          ease: "sine.out"
        }, 0);
      }
    }

    function syncState(animate = true) {
      const isOpen = getIsOpen();

      if (currentOpen === null) {
        currentOpen = isOpen;
        applyStatic(isOpen);
        return;
      }

      if (isOpen === currentOpen) return;

      const previousOpen = currentOpen;
      currentOpen = isOpen;

      if (animate) {
        animateToState(isOpen, previousOpen);
      } else {
        applyStatic(isOpen);
      }
    }

    // initial state
    syncState(false);

    // keep path data matched to live size, but don't flatten active animation
    const ro = new ResizeObserver(() => {
      if (isAnimating) {
        // Keep geometry/viewBox in sync with live height during morph.
        // This avoids top-edge drift followed by a snap at animation end.
        refreshPathDataOnly();
        return;
      } else {
        applyStatic(getIsOpen());
      }
    });

    ro.observe(accordionItem);
    ro.observe(toggle);
    ro.observe(answer);

    // observe actual Webflow dropdown state
    const mo = new MutationObserver(() => {
      syncState(true);
    });

    mo.observe(toggle, {
      attributes: true,
      attributeFilter: ["class", "aria-expanded"]
    });

    mo.observe(answer, {
      attributes: true,
      attributeFilter: ["class", "style", "hidden"]
    });

    mo.observe(accordionItem, {
      attributes: true,
      attributeFilter: ["class"]
    });

    // allow Webflow to finish its own state updates first
    toggle.addEventListener("click", () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncState(true);
        });
      });
    });

    document.addEventListener("click", () => {
      requestAnimationFrame(() => {
        syncState(true);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        requestAnimationFrame(() => {
          syncState(true);
        });
      }
    });
  }

  document.querySelectorAll(".faq-bubble-svg").forEach((svg) => {
    if (!svg.closest(".accordion-item")) {
      svg.style.display = "none";
    }
  });

  document.querySelectorAll(".accordion-item").forEach((item) => {
    setupFaqItem(item);
  });
});

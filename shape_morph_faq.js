<script>
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
    glide1: {
      radius: 22,
      tailWidth: 30,
      tailHeight: 18,
      tailOffsetX: 170,
      tailLeftRatio: 0.52,
      tailRightRatio: 0.48,
      tipNudgeX: 2,
      tipNudgeY: 0,
      tailCurveSkew: 0.03
    },
    glide2: {
      radius: 24,
      tailWidth: 0,
      tailHeight: 0,
      tailOffsetX: 35,
      tailLeftRatio: 0.54,
      tailRightRatio: 0.46,
      tipNudgeX: 0,
      tipNudgeY: 0,
      tailCurveSkew: -0.02
    },
    glide3: {
      radius: 28,
      tailWidth: 0,
      tailHeight: 0,
      tailOffsetX: -140,
      tailLeftRatio: 0.6,
      tailRightRatio: 0.4,
      tipNudgeX: -6,
      tipNudgeY: 0,
      tailCurveSkew: -0.12
    },
    open: {
      radius: 35,
      tailWidth: 42,
      tailHeight: 45,
      tailOffsetX: -300,
      tailLeftRatio: 0.72,
      tailRightRatio: 0.28,
      tipNudgeX: -18,
      tipNudgeY: 0,
      tailCurveSkew: -0.26
    },
    overshoot: {
      radius: 35,
      tailWidth: 48,
      tailHeight: 48,
      tailOffsetX: -300,
      tailLeftRatio: 0.73,
      tailRightRatio: 0.27,
      tipNudgeX: -22,
      tipNudgeY: 0,
      tailCurveSkew: -0.29
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

    const centerX = clamp(w / 2 + tailOffsetX, left + r + 4, right - r - 4);
    const rawTailBaseLeft = centerX - (tailWidth * tailLeftRatio);
    const rawTailBaseRight = centerX + (tailWidth * tailRightRatio);
    const tailBaseLeftMin = left + r + 2;
    const tailBaseLeftMax = right - r - 8;
    const tailBaseRightMin = left + r + 8;
    const tailBaseRightMax = right - r - 2;
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

    const tipX = clamp(centerX + tipNudgeX, left + r + 1, right - r - 1);
    const tipY = clamp(
      bodyBottom + tailHeight + tipNudgeY,
      bodyBottom + 2,
      h - bottomInset
    );

    const ctrlShift = tailWidth * tailCurveSkew;
    let outCtrlX = tailBaseRight - tailWidth * 0.28 + ctrlShift;
    const outCtrlY = bodyBottom + tailHeight * 0.44;
    let inCtrlX = tailBaseLeft + tailWidth * 0.34 + ctrlShift;
    const inCtrlY = bodyBottom + tailHeight * 0.72;
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
      M ${left + r} ${top}
      H ${right - r}
      Q ${right} ${top} ${right} ${top + r}
      V ${bodyBottom - r}
      Q ${right} ${bodyBottom} ${right - r} ${bodyBottom}
      H ${tailBaseRight}
      Q ${outCtrlX} ${outCtrlY} ${tipX} ${tipY}
      Q ${inCtrlX} ${inCtrlY} ${tailBaseLeft} ${bodyBottom}
      H ${left + r}
      Q ${left} ${bodyBottom} ${left} ${bodyBottom - r}
      V ${top + r}
      Q ${left} ${top} ${left + r} ${top}
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
        glide1: makeBubblePath(
          w, h,
          CONFIG.glide1.radius,
          CONFIG.glide1.tailWidth,
          CONFIG.glide1.tailHeight,
          CONFIG.glide1.tailOffsetX,
          CONFIG.glide1.tailLeftRatio,
          CONFIG.glide1.tailRightRatio,
          CONFIG.glide1.tipNudgeX,
          CONFIG.glide1.tipNudgeY,
          CONFIG.glide1.tailCurveSkew,
          bodyAt(0.24),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        glide2: makeBubblePath(
          w, h,
          CONFIG.glide2.radius,
          CONFIG.glide2.tailWidth,
          CONFIG.glide2.tailHeight,
          CONFIG.glide2.tailOffsetX,
          CONFIG.glide2.tailLeftRatio,
          CONFIG.glide2.tailRightRatio,
          CONFIG.glide2.tipNudgeX,
          CONFIG.glide2.tipNudgeY,
          CONFIG.glide2.tailCurveSkew,
          bodyAt(0.5),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        glide3: makeBubblePath(
          w, h,
          CONFIG.glide3.radius,
          CONFIG.glide3.tailWidth,
          CONFIG.glide3.tailHeight,
          CONFIG.glide3.tailOffsetX,
          CONFIG.glide3.tailLeftRatio,
          CONFIG.glide3.tailRightRatio,
          CONFIG.glide3.tipNudgeX,
          CONFIG.glide3.tipNudgeY,
          CONFIG.glide3.tailCurveSkew,
          bodyAt(0.78),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        absorb: makeBubblePath(
          w,
          h,
          24,
          2,
          1,
          220,
          0.5,
          0.5,
          0,
          0,
          0,
          bodyAt(0.62),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        preOpen: makeBubblePath(
          w,
          h,
          32,
          2,
          1,
          -250,
          0.52,
          0.48,
          -1,
          0,
          -0.04,
          bodyAt(0.9),
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
        ),
        overshoot: makeBubblePath(
          w, h,
          CONFIG.overshoot.radius,
          CONFIG.overshoot.tailWidth,
          CONFIG.overshoot.tailHeight,
          CONFIG.overshoot.tailOffsetX,
          CONFIG.overshoot.tailLeftRatio,
          CONFIG.overshoot.tailRightRatio,
          CONFIG.overshoot.tipNudgeX,
          CONFIG.overshoot.tipNudgeY,
          CONFIG.overshoot.tailCurveSkew,
          bodyAt(1),
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        )
      };
    }

    function storePathSet(paths) {
      path.dataset.closed = paths.closed;
      path.dataset.glide1 = paths.glide1;
      path.dataset.glide2 = paths.glide2;
      path.dataset.glide3 = paths.glide3;
      path.dataset.absorb = paths.absorb;
      path.dataset.preOpen = paths.preOpen;
      path.dataset.open = paths.open;
      path.dataset.overshoot = paths.overshoot;
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
        tl.to(path, morphStep(path.dataset.open, 0.42, "sine.inOut"), 0)
        .to(path, morphStep(path.dataset.overshoot, 0.02, "sine.out"))
        .to(path, morphStep(path.dataset.open, 0.06, "sine.out"))
        .to(path, {
          duration: 0.22,
          fill: CONFIG.openFill,
          ease: "sine.out"
        }, 0.16);
      } else {
        tl.to(path, morphStep(path.dataset.closed, 0.34, "sine.inOut"), 0)
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
</script>

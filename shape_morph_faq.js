<script>
window.addEventListener("load", () => {
  if (!window.gsap || !window.MorphSVGPlugin) {
    console.warn("GSAP or MorphSVGPlugin missing.");
    return;
  }

  gsap.registerPlugin(MorphSVGPlugin);

  const CONFIG = {
    closed: {
      radius: 12,
      tailWidth: 12,
      tailHeight: 8,
      tailOffsetX: 96,
      tailLeftRatio: 0.5,
      tailRightRatio: 0.5,
      tipNudgeX: 10,
      tipNudgeY: 0,
      tailCurveSkew: 0.08
    },
    glide1: {
      radius: 12,
      tailWidth: 14,
      tailHeight: 11,
      tailOffsetX: 74,
      tailLeftRatio: 0.54,
      tailRightRatio: 0.46,
      tipNudgeX: 6,
      tipNudgeY: 0,
      tailCurveSkew: 0.02
    },
    glide2: {
      radius: 14,
      tailWidth: 18,
      tailHeight: 15,
      tailOffsetX: 38,
      tailLeftRatio: 0.58,
      tailRightRatio: 0.42,
      tipNudgeX: 0,
      tipNudgeY: 0,
      tailCurveSkew: -0.06
    },
    glide3: {
      radius: 16,
      tailWidth: 24,
      tailHeight: 20,
      tailOffsetX: -18,
      tailLeftRatio: 0.64,
      tailRightRatio: 0.36,
      tipNudgeX: -8,
      tipNudgeY: 0,
      tailCurveSkew: -0.14
    },
    open: {
      radius: 24,
      tailWidth: 34,
      tailHeight: 26,
      tailOffsetX: -96,
      tailLeftRatio: 0.72,
      tailRightRatio: 0.28,
      tipNudgeX: -18,
      tipNudgeY: 0,
      tailCurveSkew: -0.26
    },
    overshoot: {
      radius: 26,
      tailWidth: 40,
      tailHeight: 30,
      tailOffsetX: -106,
      tailLeftRatio: 0.76,
      tailRightRatio: 0.24,
      tipNudgeX: -24,
      tipNudgeY: 0,
      tailCurveSkew: -0.34
    },
    minFrameHeight: 80,
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
    const tailBaseLeft = clamp(rawTailBaseLeft, left + r + 2, right - r - 8);
    const tailBaseRight = clamp(rawTailBaseRight, left + r + 8, right - r - 2);
    const tipX = centerX + tipNudgeX;
    const tipY = clamp(
      bodyBottom + tailHeight + tipNudgeY,
      bodyBottom + 2,
      h - bottomInset
    );

    const ctrlShift = tailWidth * tailCurveSkew;
    const outCtrlX = tailBaseRight - tailWidth * 0.28 + ctrlShift;
    const outCtrlY = bodyBottom + tailHeight * 0.44;
    const inCtrlX = tailBaseLeft + tailWidth * 0.34 + ctrlShift;
    const inCtrlY = bodyBottom + tailHeight * 0.72;

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

  function setupFaqShell(shell) {
    const accordionItem = shell.querySelector(".accordion-item");
    const toggle = shell.querySelector(".w-dropdown-toggle, .dropdown-toggle");
    const answer = shell.querySelector(".answer, .w-dropdown-list");
    const svg = shell.querySelector(".faq-bubble-svg");
    const path = shell.querySelector(".faq-bubble-path");

    if (!accordionItem || !toggle || !answer || !svg || !path) return;

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
      const shellRect = shell.getBoundingClientRect();
      const toggleRect = toggle.getBoundingClientRect();

      const w = Math.max(
        80,
        Math.round(Math.max(itemRect.width, shellRect.width, toggleRect.width))
      );
      const baseFrameH = Math.max(
        CONFIG.minFrameHeight,
        Math.round(toggleRect.height + CONFIG.frameHeightPad)
      );
      const h = Math.max(baseFrameH, Math.round(shellRect.height));
      const maxBodyBottom = h - CONFIG.bottomInset - 1;
      const closedBodyBottom = Math.min(
        h - CONFIG.bottomInset - 1,
        baseFrameH - CONFIG.closed.tailHeight - CONFIG.bottomInset
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
          bodyAt(1.04),
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
      path.dataset.open = paths.open;
      path.dataset.overshoot = paths.overshoot;
    }

    function morphStep(targetShape, duration, ease) {
      return {
        duration,
        morphSVG: {
          shape: targetShape,
          shapeIndex: 0,
          type: "rotational",
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

    function animateToState(isOpen) {
      refreshPathDataOnly();

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
        tl.to(path, morphStep(path.dataset.glide1, 0.10, "sine.inOut"), 0)
        .to(svg, {
          duration: 0.10,
          scaleX: 1.006,
          scaleY: 0.998,
          transformOrigin: "50% 50%",
          ease: "sine.inOut"
        }, 0)
        .to(path, morphStep(path.dataset.glide2, 0.11, "sine.inOut"))
        .to(path, morphStep(path.dataset.glide3, 0.13, "sine.inOut"))
        .to(path, morphStep(path.dataset.overshoot, 0.16, "sine.out"))
        .to(svg, {
          duration: 0.16,
          scaleX: 1.015,
          scaleY: 1.006,
          ease: "sine.out"
        }, "<")
        .to(path, morphStep(path.dataset.open, 0.18, "sine.inOut"))
        .to(svg, {
          duration: 0.18,
          scaleX: 1,
          scaleY: 1,
          ease: "sine.inOut"
        }, "<")
        .to(path, {
          duration: 0.18,
          fill: CONFIG.openFill,
          ease: "sine.out"
        }, 0.05);
      } else {
        tl.to(path, morphStep(path.dataset.glide3, 0.14, "sine.inOut"), 0)
        .to(svg, {
          duration: 0.14,
          scaleX: 1.004,
          scaleY: 1.004,
          transformOrigin: "50% 50%",
          ease: "sine.inOut"
        }, 0)
        .to(path, morphStep(path.dataset.glide2, 0.13, "sine.inOut"))
        .to(path, morphStep(path.dataset.glide1, 0.12, "sine.inOut"))
        .to(path, morphStep(path.dataset.closed, 0.2, "sine.out"))
        .to(path, {
          duration: 0.18,
          fill: "transparent",
          ease: "sine.out"
        }, 0)
        .to(svg, {
          duration: 0.2,
          scaleX: 1,
          scaleY: 1,
          ease: "sine.out"
        }, "<");
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

      currentOpen = isOpen;

      if (animate) {
        animateToState(isOpen);
      } else {
        applyStatic(isOpen);
      }
    }

    // initial state
    syncState(false);

    // keep path data matched to live size, but don't flatten active animation
    const ro = new ResizeObserver(() => {
      if (isAnimating) {
        refreshPathDataOnly();
      } else {
        applyStatic(getIsOpen());
      }
    });

    ro.observe(shell);
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

  document.querySelectorAll(".faq-shell").forEach(setupFaqShell);
});
</script>

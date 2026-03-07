
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
      tailWidth: 16,
      tailHeight: 8,
      tailOffsetX: 58,
      tailLeftRatio: 0.42,
      tailRightRatio: 0.58,
      tipNudgeX: 4
    },
    open: {
      radius: 28,
      tailWidth: 38,
      tailHeight: 24,
      tailOffsetX: -78,
      tailLeftRatio: 0.72,
      tailRightRatio: 0.28,
      tipNudgeX: -8
    },
    overshoot: {
      radius: 32,
      tailWidth: 44,
      tailHeight: 30,
      tailOffsetX: -92,
      tailLeftRatio: 0.78,
      tailRightRatio: 0.22,
      tipNudgeX: -12
    },
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
    topInset,
    sideInset,
    bottomInset
  ) {
    const left = sideInset;
    const top = topInset;
    const right = w - sideInset;
    const bodyBottom = h - tailHeight - bottomInset;

    const centerX = w / 2 + tailOffsetX;
    const tailBaseLeft = centerX - (tailWidth * tailLeftRatio);
    const tailBaseRight = centerX + (tailWidth * tailRightRatio);
    const tipX = centerX + tipNudgeX;
    const tipY = h - bottomInset;

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

  function setupFaqShell(shell) {
    const accordionItem = shell.querySelector(".accordion-item");
    const toggle = shell.querySelector(".w-dropdown-toggle, .dropdown-toggle");
    const answer = shell.querySelector(".answer, .w-dropdown-list");
    const svg = shell.querySelector(".faq-bubble-svg");
    const path = shell.querySelector(".faq-bubble-path");

    if (!accordionItem || !toggle || !answer || !svg || !path) return;

    let currentOpen = null;
    let tl = null;

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

      const w = Math.round(itemRect.width);
      const h = Math.max(80, Math.round(shellRect.height));

      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

      return {
        closed: makeBubblePath(
          w,
          h,
          CONFIG.closed.radius,
          CONFIG.closed.tailWidth,
          CONFIG.closed.tailHeight,
          CONFIG.closed.tailOffsetX,
          CONFIG.closed.tailLeftRatio,
          CONFIG.closed.tailRightRatio,
          CONFIG.closed.tipNudgeX,
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        open: makeBubblePath(
          w,
          h,
          CONFIG.open.radius,
          CONFIG.open.tailWidth,
          CONFIG.open.tailHeight,
          CONFIG.open.tailOffsetX,
          CONFIG.open.tailLeftRatio,
          CONFIG.open.tailRightRatio,
          CONFIG.open.tipNudgeX,
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        ),
        overshoot: makeBubblePath(
          w,
          h,
          CONFIG.overshoot.radius,
          CONFIG.overshoot.tailWidth,
          CONFIG.overshoot.tailHeight,
          CONFIG.overshoot.tailOffsetX,
          CONFIG.overshoot.tailLeftRatio,
          CONFIG.overshoot.tailRightRatio,
          CONFIG.overshoot.tipNudgeX,
          CONFIG.topInset,
          CONFIG.sideInset,
          CONFIG.bottomInset
        )
      };
    }

    function applyStatic(isOpen) {
      const paths = buildPathSet();
      path.dataset.closed = paths.closed;
      path.dataset.open = paths.open;
      path.dataset.overshoot = paths.overshoot;
      path.setAttribute("d", isOpen ? paths.open : paths.closed);
      path.setAttribute("fill", isOpen ? CONFIG.openFill : "transparent");
      svg.style.transform = "scale(1)";
    }

    function animateToState(isOpen) {
      const paths = buildPathSet();
      path.dataset.closed = paths.closed;
      path.dataset.open = paths.open;
      path.dataset.overshoot = paths.overshoot;

      if (tl) tl.kill();
      tl = gsap.timeline({ defaults: { overwrite: "auto" } });

      if (isOpen) {
        tl.to(path, {
          duration: 0.12,
          morphSVG: path.dataset.overshoot,
          ease: "power3.out"
        }, 0)
        .to(svg, {
          duration: 0.12,
          scale: 1.025,
          transformOrigin: "50% 50%",
          ease: "power3.out"
        }, 0)
        .to(path, {
          duration: 0.30,
          morphSVG: path.dataset.open,
          ease: "back.out(1.6)"
        })
        .to(svg, {
          duration: 0.30,
          scale: 1,
          ease: "expo.out"
        }, "<")
        .to(path, {
          duration: 0.18,
          fill: CONFIG.openFill,
          ease: "power2.out"
        }, 0.08);
      } else {
        tl.to(path, {
          duration: 0.10,
          morphSVG: path.dataset.overshoot,
          ease: "power2.in"
        }, 0)
        .to(svg, {
          duration: 0.10,
          scale: 0.992,
          transformOrigin: "50% 50%",
          ease: "power2.in"
        }, 0)
        .to(path, {
          duration: 0.24,
          morphSVG: path.dataset.closed,
          ease: "expo.out"
        })
        .to(path, {
          duration: 0.14,
          fill: "transparent",
          ease: "power2.out"
        }, 0)
        .to(svg, {
          duration: 0.24,
          scale: 1,
          ease: "expo.out"
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

    // keep path matched to live size
    const ro = new ResizeObserver(() => {
      applyStatic(getIsOpen());
    });
    ro.observe(shell);
    ro.observe(accordionItem);
    ro.observe(answer);

    // watch actual Webflow dropdown state changes
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

    // extra safety: let Webflow finish its own click handling first
    toggle.addEventListener("click", () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncState(true);
        });
      });
    });

    // outside clicks / escape / other dropdown interactions
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

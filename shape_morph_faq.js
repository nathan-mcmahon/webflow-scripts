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
    // extra intermediate states for a more liquid morph
    openPre: {
      radius: 20,
      tailWidth: 24,
      tailHeight: 14,
      tailOffsetX: -18,
      tailLeftRatio: 0.58,
      tailRightRatio: 0.42,
      tipNudgeX: -1
    },
    closePre: {
      radius: 22,
      tailWidth: 28,
      tailHeight: 16,
      tailOffsetX: -30,
      tailLeftRatio: 0.62,
      tailRightRatio: 0.38,
      tipNudgeX: -3
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

  function buildVariantPath(w, h, variant) {
    return makeBubblePath(
      w,
      h,
      variant.radius,
      variant.tailWidth,
      variant.tailHeight,
      variant.tailOffsetX,
      variant.tailLeftRatio,
      variant.tailRightRatio,
      variant.tipNudgeX,
      CONFIG.topInset,
      CONFIG.sideInset,
      CONFIG.bottomInset
    );
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
        closed: buildVariantPath(w, h, CONFIG.closed),
        open: buildVariantPath(w, h, CONFIG.open),
        overshoot: buildVariantPath(w, h, CONFIG.overshoot),
        openPre: buildVariantPath(w, h, CONFIG.openPre),
        closePre: buildVariantPath(w, h, CONFIG.closePre)
      };
    }

    function applyStatic(isOpen) {
      const paths = buildPathSet();
      path.dataset.closed = paths.closed;
      path.dataset.open = paths.open;
      path.dataset.overshoot = paths.overshoot;
      path.dataset.openPre = paths.openPre;
      path.dataset.closePre = paths.closePre;

      path.setAttribute("d", isOpen ? paths.open : paths.closed);
      path.setAttribute("fill", isOpen ? CONFIG.openFill : "transparent");
      gsap.set(svg, { scale: 1, transformOrigin: "50% 50%" });
    }

    function animateToState(isOpen) {
      const paths = buildPathSet();
      path.dataset.closed = paths.closed;
      path.dataset.open = paths.open;
      path.dataset.overshoot = paths.overshoot;
      path.dataset.openPre = paths.openPre;
      path.dataset.closePre = paths.closePre;

      if (tl) tl.kill();
      tl = gsap.timeline({ defaults: { overwrite: "auto" } });

      if (isOpen) {
        tl.to(path, {
          duration: 0.10,
          morphSVG: path.dataset.openPre,
          ease: "power2.out"
        }, 0)
        .to(svg, {
          duration: 0.10,
          scaleX: 1.01,
          scaleY: 0.985,
          transformOrigin: "50% 50%",
          ease: "power2.out"
        }, 0)
        .to(path, {
          duration: 0.12,
          morphSVG: path.dataset.overshoot,
          ease: "power3.out"
        })
        .to(svg, {
          duration: 0.12,
          scaleX: 1.025,
          scaleY: 1.01,
          ease: "power3.out"
        }, "<")
        .to(path, {
          duration: 0.26,
          morphSVG: path.dataset.open,
          ease: "back.out(1.4)"
        })
        .to(svg, {
          duration: 0.26,
          scaleX: 1,
          scaleY: 1,
          ease: "expo.out"
        }, "<")
        .to(path, {
          duration: 0.18,
          fill: CONFIG.openFill,
          ease: "power2.out"
        }, 0.12);
      } else {
        tl.to(path, {
          duration: 0.08,
          morphSVG: path.dataset.closePre,
          ease: "power2.in"
        }, 0)
        .to(svg, {
          duration: 0.08,
          scaleX: 0.995,
          scaleY: 1.005,
          transformOrigin: "50% 50%",
          ease: "power2.in"
        }, 0)
        .to(path, {
          duration: 0.10,
          morphSVG: path.dataset.overshoot,
          ease: "power2.in"
        })
        .to(svg, {
          duration: 0.10,
          scaleX: 0.99,
          scaleY: 0.995,
          ease: "power2.in"
        }, "<")
        .to(path, {
          duration: 0.22,
          morphSVG: path.dataset.closed,
          ease: "expo.out"
        })
        .to(path, {
          duration: 0.14,
          fill: "transparent",
          ease: "power2.out"
        }, 0)
        .to(svg, {
          duration: 0.22,
          scaleX: 1,
          scaleY: 1,
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

    // initial
    syncState(false);

    // keep matched to live size
    const ro = new ResizeObserver(() => {
      applyStatic(getIsOpen());
    });
    ro.observe(shell);
    ro.observe(accordionItem);
    ro.observe(answer);

    // watch real Webflow dropdown state
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

    // allow Webflow to finish first
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

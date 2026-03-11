window.addEventListener("load", () => {
  const SCRIPT_VERSION = "2026.03.11.1";
  console.log(`[dynamic_nav] v${SCRIPT_VERSION} loaded`);

  const nav =
    document.querySelector("[data-dynamic-nav]") ||
    document.querySelector(".w-nav") ||
    document.querySelector("nav");

  if (!nav) {
    console.warn(`[dynamic_nav] v${SCRIPT_VERSION} no nav element found.`);
    return;
  }

  const rawSections = Array.from(document.querySelectorAll("[data-nav-theme]"));
  if (!rawSections.length) {
    console.warn(
      `[dynamic_nav] v${SCRIPT_VERSION} no [data-nav-theme] sections found.`
    );
    return;
  }

  function normalizeTheme(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "dark" || normalized === "black") return "dark";
    if (normalized === "light" || normalized === "white") return "light";
    return "";
  }

  const sections = rawSections
    .map((el, index) => {
      const theme = normalizeTheme(el.getAttribute("data-nav-theme"));
      const key = (el.getAttribute("data-nav-section") || el.id || "").trim();

      if (!theme) {
        console.warn(
          `[dynamic_nav] v${SCRIPT_VERSION} skipped section #${index + 1} with invalid data-nav-theme value.`
        );
        return null;
      }

      return { el, theme, key };
    })
    .filter(Boolean);

  if (!sections.length) {
    console.warn(
      `[dynamic_nav] v${SCRIPT_VERSION} all [data-nav-theme] values were invalid.`
    );
    return;
  }

  const navLinks = Array.from(
    nav.querySelectorAll("a[data-nav-target], a[href^='#']")
  );

  function getLinkTarget(link) {
    const explicitTarget = (link.getAttribute("data-nav-target") || "").trim();
    if (explicitTarget) return explicitTarget;

    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#")) return "";

    try {
      return decodeURIComponent(href.slice(1)).trim();
    } catch {
      return href.slice(1).trim();
    }
  }

  function syncActiveLink(sectionKey) {
    navLinks.forEach((link) => {
      const target = getLinkTarget(link);
      const isActive = Boolean(sectionKey) && target === sectionKey;
      link.classList.toggle("is-nav-section-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else if (link.getAttribute("aria-current") === "true") {
        link.removeAttribute("aria-current");
      }
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getProbeY() {
    const navRect = nav.getBoundingClientRect();
    const rawOffset = Number(nav.getAttribute("data-nav-probe-offset"));
    const offset = Number.isFinite(rawOffset) ? rawOffset : 2;
    const viewportBottom = Math.max(0, window.innerHeight - 1);
    return clamp(navRect.bottom + offset, 0, viewportBottom);
  }

  function pickSectionForProbeY(probeY) {
    let containing = null;
    let nearestAfter = null;
    let nearestBefore = null;

    for (const section of sections) {
      const rect = section.el.getBoundingClientRect();

      if (rect.top <= probeY && rect.bottom > probeY) {
        containing = section;
        break;
      }

      if (rect.top > probeY) {
        if (!nearestAfter || rect.top < nearestAfter.rect.top) {
          nearestAfter = { section, rect };
        }
        continue;
      }

      if (!nearestBefore || rect.bottom > nearestBefore.rect.bottom) {
        nearestBefore = { section, rect };
      }
    }

    if (containing) return containing;
    if (nearestAfter) return nearestAfter.section;
    if (nearestBefore) return nearestBefore.section;
    return null;
  }

  let currentTheme = "";
  let currentSectionKey = "";
  let rafId = 0;

  function applyState(theme, sectionKey) {
    if (theme !== currentTheme) {
      nav.dataset.navTheme = theme;
      nav.classList.toggle("is-nav-theme-dark", theme === "dark");
      nav.classList.toggle("is-nav-theme-light", theme === "light");
      document.documentElement.dataset.navTheme = theme;
      currentTheme = theme;
    }

    if (sectionKey !== currentSectionKey) {
      nav.dataset.navSectionActive = sectionKey;
      syncActiveLink(sectionKey);
      currentSectionKey = sectionKey;
    }
  }

  function updateFromViewport() {
    const probeY = getProbeY();
    const activeSection = pickSectionForProbeY(probeY);
    if (!activeSection) return;
    applyState(activeSection.theme, activeSection.key);
  }

  function scheduleUpdate() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      updateFromViewport();
    });
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("orientationchange", scheduleUpdate);

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(nav);
    sections.forEach((section) => ro.observe(section.el));
  }

  updateFromViewport();
});

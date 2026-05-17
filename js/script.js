const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

const initNavMenu = () => {
  const toggle = navbar?.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');
  const backdrop = navbar?.querySelector('.nav-backdrop');
  if (!navbar || !toggle || !menu) return;

  const mobileNavQuery = window.matchMedia('(max-width: 1120px)');
  const root = document.documentElement;
  let scrollLockY = 0;
  let scrollLocked = false;

  const getScrollPaddingTop = () => {
    const value = parseFloat(getComputedStyle(root).scrollPaddingTop);
    return Number.isFinite(value) ? value : 0;
  };

  const scrollToSection = (target) => {
    const top = target.getBoundingClientRect().top + window.scrollY - getScrollPaddingTop();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const lockScroll = () => {
    scrollLockY = window.scrollY;
    scrollLocked = true;
    root.style.setProperty('--nav-scroll-lock-top', `-${scrollLockY}px`);
    root.classList.add('nav-menu-open');
    root.style.setProperty('--vv-offset-top', '0px');
  };

  const unlockScroll = () => {
    if (!scrollLocked) return;
    scrollLocked = false;
    root.classList.remove('nav-menu-open');
    root.style.removeProperty('--nav-scroll-lock-top');
    window.scrollTo(0, scrollLockY);
    if (typeof syncMobileViewportOffset === 'function') {
      syncMobileViewportOffset();
    }
  };

  const setOpen = (open) => {
    const isOpen = navbar.classList.contains('nav-open');
    if (open === isOpen) return;

    navbar.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    if (backdrop) backdrop.setAttribute('aria-hidden', String(!open));

    if (open && mobileNavQuery.matches) {
      lockScroll();
    } else if (!open) {
      unlockScroll();
    }
  };

  const closeMenu = () => setOpen(false);

  toggle.addEventListener('click', () => {
    setOpen(!navbar.classList.contains('nav-open'));
  });

  backdrop?.addEventListener('click', closeMenu);

  menu.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const id = link.getAttribute('href')?.slice(1);
      const target = id ? document.getElementById(id) : null;
      closeMenu();
      if (!target) return;
      window.requestAnimationFrame(() => {
        scrollToSection(target);
      });
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  const onViewportChange = () => {
    if (!mobileNavQuery.matches) closeMenu();
  };

  if (mobileNavQuery.addEventListener) {
    mobileNavQuery.addEventListener('change', onViewportChange);
  } else if (mobileNavQuery.addListener) {
    mobileNavQuery.addListener(onViewportChange);
  }
  window.addEventListener('resize', onViewportChange);
};

initNavMenu();

const mobileViewportQuery = window.matchMedia('(max-width: 1120px)');
const syncMobileViewportOffset = () => {
  if (document.documentElement.classList.contains('nav-menu-open')) {
    return;
  }
  if (!mobileViewportQuery.matches) {
    document.documentElement.style.setProperty('--vv-offset-top', '0px');
    return;
  }
  const vv = window.visualViewport;
  const rawOffset = vv ? vv.offsetTop : 0;
  const clampedOffset = Math.min(76, Math.max(0, rawOffset));
  const currentOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vv-offset-top')) || 0;
  if (Math.abs(clampedOffset - currentOffset) < 2) return;
  document.documentElement.style.setProperty('--vv-offset-top', `${clampedOffset}px`);
};

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncMobileViewportOffset);
  window.visualViewport.addEventListener('scroll', syncMobileViewportOffset);
}
window.addEventListener('resize', syncMobileViewportOffset);
window.addEventListener('orientationchange', syncMobileViewportOffset);
if (mobileViewportQuery.addEventListener) {
  mobileViewportQuery.addEventListener('change', syncMobileViewportOffset);
} else if (mobileViewportQuery.addListener) {
  mobileViewportQuery.addListener(syncMobileViewportOffset);
}
syncMobileViewportOffset();

const currentYearEl = document.getElementById('current-year');
if (currentYearEl) {
  currentYearEl.textContent = String(new Date().getFullYear());
}

const initPubAbstractToggles = () => {
  const wraps = document.querySelectorAll('#publications .pub-abstract-wrap');
  if (wraps.length === 0) return;

  const CLAMP_LINES = 3;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getLineHeight = (abstract) => {
    const lineHeight = parseFloat(getComputedStyle(abstract).lineHeight);
    if (Number.isFinite(lineHeight)) return lineHeight;
    const fontSize = parseFloat(getComputedStyle(abstract).fontSize);
    return Number.isFinite(fontSize) ? fontSize * 1.65 : 23;
  };

  const getCollapsedHeight = (abstract) => Math.ceil(getLineHeight(abstract) * CLAMP_LINES);
  const getFullHeight = (abstract) => abstract.scrollHeight;

  const setPanelHeight = (panel, height, animate) => {
    if (!animate) panel.style.transition = 'none';
    panel.style.maxHeight = `${height}px`;
    if (!animate) {
      panel.offsetHeight;
      panel.style.transition = '';
    }
  };

  const applyState = (wrap, animate = true) => {
    const panel = wrap.querySelector('.pub-abstract-panel');
    const abstract = wrap.querySelector('.pub-abstract');
    const toggle = wrap.querySelector('.pub-abstract-toggle');
    if (!panel || !abstract || !toggle) return;

    const collapsed = wrap.classList.contains('is-collapsed');
    const fullHeight = getFullHeight(abstract);
    const collapsedHeight = getCollapsedHeight(abstract);

    if (collapsed) {
      setPanelHeight(panel, collapsedHeight, animate);
      toggle.hidden = fullHeight <= collapsedHeight + 1;
    } else {
      setPanelHeight(panel, fullHeight, animate);
      toggle.hidden = false;
    }
  };

  wraps.forEach((wrap) => {
    const toggle = wrap.querySelector('.pub-abstract-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      wrap.classList.toggle('is-collapsed');
      const isCollapsed = wrap.classList.contains('is-collapsed');
      toggle.setAttribute('aria-expanded', String(!isCollapsed));
      toggle.setAttribute('aria-label', isCollapsed ? 'Show full abstract' : 'Collapse abstract');
      applyState(wrap, !prefersReducedMotion);
    });

    applyState(wrap, false);
  });

  requestAnimationFrame(() => {
    wraps.forEach((wrap) => applyState(wrap, false));
  });
  window.addEventListener('load', () => {
    wraps.forEach((wrap) => applyState(wrap, false));
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      wraps.forEach((wrap) => applyState(wrap, false));
    }, 150);
  });
};

initPubAbstractToggles();

const reveals = document.querySelectorAll('.reveal');
if (reveals.length > 0) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), index * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach((el) => observer.observe(el));
}

// Fetch yearly contributions and current-month commits.
// Keeps fallback values if request or parsing fails.
const contributionsEl = document.getElementById('github-contributions');
const monthlyCommitsEl = document.getElementById('github-monthly-commits');

const markFallback = () => {
  if (contributionsEl) contributionsEl.dataset.source = 'fallback';
  if (monthlyCommitsEl) monthlyCommitsEl.dataset.source = 'fallback';
  window.__githubStatsSource = 'fallback';
};

if (contributionsEl || monthlyCommitsEl) {
  markFallback();

  fetch('https://github-contributions-api.jogruber.de/v4/dionisisdiamantis?y=last')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch contributions');
      return res.json();
    })
    .then((data) => {
      let hasLiveData = false;

      if (contributionsEl) {
        const total = typeof data?.total?.lastYear === 'number'
          ? data.total.lastYear
          : data?.total?.[0]?.count;
        if (typeof total === 'number' && total >= 0) {
          contributionsEl.innerHTML = `${total}<span>+</span>`;
          contributionsEl.dataset.source = 'live';
          hasLiveData = true;
        }
      }

      if (monthlyCommitsEl) {
        const entries = Array.isArray(data?.contributions) ? data.contributions : [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthCommits = entries
          .filter((entry) => {
            const date = new Date(entry.date);
            return !Number.isNaN(date.valueOf()) &&
              date.getFullYear() === currentYear &&
              date.getMonth() === currentMonth;
          })
          .reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);

        monthlyCommitsEl.innerHTML = `${monthCommits}<span>+</span>`;
        monthlyCommitsEl.dataset.source = 'live';
        hasLiveData = true;
      }

      window.__githubStatsSource = hasLiveData ? 'live' : 'fallback';
      console.info('[stats] source:', window.__githubStatsSource);
    })
    .catch((err) => {
      markFallback();
      console.warn('[stats] fallback mode:', err.message);
    });
}

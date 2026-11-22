const navbar = document.getElementById('navbar');
if (navbar) {
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 16);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

const initNavMenu = () => {
  const toggle = navbar?.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');
  const backdrop = navbar?.querySelector('.nav-backdrop');
  if (!navbar || !toggle || !menu) return;

  const mobileNavQuery = window.matchMedia('(max-width: 860px)');
  const root = document.documentElement;

  const getScrollPaddingTop = () => {
    const value = parseFloat(getComputedStyle(root).scrollPaddingTop);
    return Number.isFinite(value) ? value : 0;
  };

  const scrollToSection = (target) => {
    const top = target.getBoundingClientRect().top + window.scrollY - getScrollPaddingTop();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const setOpen = (open) => {
    const isOpen = navbar.classList.contains('nav-open');
    if (open === isOpen) return;

    navbar.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    if (backdrop) backdrop.setAttribute('aria-hidden', String(!open));
    root.classList.toggle('nav-menu-open', open && mobileNavQuery.matches);
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
};

initNavMenu();

// Highlight the nav link of the section currently in view.
const initActiveSection = () => {
  const links = Array.from(document.querySelectorAll('#nav-menu a[href^="#"]:not(.nav-cta)'));
  const sections = links
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);
  if (sections.length === 0 || !('IntersectionObserver' in window)) return;

  const setActive = (id) => {
    links.forEach((link) => {
      if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((section) => observer.observe(section));
};

initActiveSection();

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

  // The total covers the previous calendar year; the current year is fetched too for this month's commits.
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  fetch(`https://github-contributions-api.jogruber.de/v4/dionisisdiamantis?y=${previousYear}&y=${currentYear}`)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch contributions');
      return res.json();
    })
    .then((data) => {
      let hasLiveData = false;

      if (contributionsEl) {
        const total = data?.total?.[previousYear];
        if (typeof total === 'number' && total >= 0) {
          contributionsEl.innerHTML = `${total}<span>+</span>`;
          contributionsEl.dataset.source = 'live';
          hasLiveData = true;
        }
      }

      if (monthlyCommitsEl) {
        const entries = Array.isArray(data?.contributions) ? data.contributions : [];
        const currentMonth = new Date().getMonth();

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
// 3D depth: cards tilt toward the pointer, and the hero layer stack turns with it.
// Mouse/trackpad only, and off when the visitor prefers reduced motion.
const initDepth = () => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reducedMotion) return;

  const MAX_TILT = 7;
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', `${(x - 0.5) * MAX_TILT * 2}deg`);
      card.style.setProperty('--rx', `${(0.5 - y) * MAX_TILT * 2}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  const hero = document.getElementById('hero');
  const stack = hero?.querySelector('.stack');
  if (!hero || !stack) return;
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    stack.style.setProperty('--tilt-z', `${x * 16}deg`);
    stack.style.setProperty('--tilt-x', `${y * -10}deg`);
  });
  hero.addEventListener('pointerleave', () => {
    stack.style.setProperty('--tilt-z', '0deg');
    stack.style.setProperty('--tilt-x', '0deg');
  });
};

initDepth();

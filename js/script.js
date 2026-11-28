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

// Layers of the hero stack link to their card in "What I work with".
// With a mouse, hover reveals the tools and a click jumps to the card.
// On touch, the first tap reveals the tools and a second tap jumps.
const initStackLayers = () => {
  const slabs = document.querySelectorAll('.stack .slab');
  if (!slabs.length) return;
  const canHover = window.matchMedia('(hover: hover)').matches;

  const jumpTo = (slab) => {
    const card = document.getElementById(slab.dataset.target);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('is-flash');
    void card.offsetWidth; // restart the flash if it is already running
    card.classList.add('is-flash');
    card.addEventListener('animationend', () => card.classList.remove('is-flash'), { once: true });
  };

  slabs.forEach((slab) => {
    slab.addEventListener('click', (event) => {
      event.stopPropagation();
      const wasActive = slab.classList.contains('is-active');
      if (canHover || wasActive) {
        slabs.forEach((s) => s.classList.remove('is-active'));
        jumpTo(slab);
        return;
      }
      slabs.forEach((s) => s.classList.remove('is-active'));
      slab.classList.add('is-active');
    });
  });
  document.addEventListener('click', () => slabs.forEach((s) => s.classList.remove('is-active')));
};

initStackLayers();

// The hero stack's request cycle. Every cycle (one iteration of the request packet's CSS
// animation, 10s) this picks what the request will do:
//   - Backend: the handler calls the endpoint that belongs to the agent that was picked
//   - AI Agents: the orchestrator picks one of 3 agents, the agent one of its 2 tools
//   - Data: the query reads 2–4 different cells
//   - the response rises faster or slower depending on how many cells were read
// Timings are fractions of the cycle and match the keyframes in css/styles.css.
const initStackCycle = () => {
  const stack = document.querySelector('.stack');
  const request = stack?.querySelector('.packet--req:not(.packet--ghost)');
  if (!stack || !request) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const CYCLE = 10000;
  const treeParts = stack.querySelectorAll('.art-tree [data-a]');
  const endpointParts = stack.querySelectorAll('.art-backend [data-e]');
  const cells = [...stack.querySelectorAll('.art-cell')];
  const responses = [...stack.querySelectorAll('.packet--res')];

  let lastRoute = '';
  let timers = [];

  const pickRoute = () => {
    let a;
    let b;
    do {
      a = Math.floor(Math.random() * 3);
      b = Math.floor(Math.random() * 2);
    } while (`${a}${b}` === lastRoute); // never the same route twice in a row
    lastRoute = `${a}${b}`;
    treeParts.forEach((el) => {
      const sameAgent = Number(el.dataset.a) === a;
      const picked = el.dataset.b === undefined ? sameAgent : sameAgent && Number(el.dataset.b) === b;
      el.classList.toggle('is-picked', picked);
    });
    return a;
  };

  const pickCells = (count) => {
    const order = cells.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
    cells.forEach((cell) => cell.classList.remove('is-hit'));
    order.forEach((index, k) => {
      cells[index].classList.add('is-hit');
      cells[index].style.setProperty('--k', k);
    });
    return count;
  };

  const at = (fraction, fn) => timers.push(setTimeout(fn, fraction * CYCLE));

  // the response rises from `fromLayer` (0 = Data, 1 = Backend) up to the Frontend
  const riseResponse = (fromLayer, duration) => {
    const gap = stack.querySelector('.stack-scene').offsetWidth * 0.42; // --gap
    const from = gap * fromLayer;
    const top = gap * 3;
    responses.forEach((packet) => {
      const g = Number(packet.style.getPropertyValue('--g')) || 0;
      packet.animate(
        [
          { transform: `translateZ(${from}px)`, opacity: 0 },
          { transform: `translateZ(${from}px)`, opacity: 1, offset: 0.06 },
          { transform: `translateZ(${top}px)`, opacity: 1, offset: 0.9 },
          { transform: `translateZ(${top}px)`, opacity: 0 },
        ],
        { duration, delay: g * 45, easing: 'ease-in-out' }
      );
    });
  };

  const runCycle = () => {
    timers.forEach(clearTimeout);
    timers = [];
    const agent = pickRoute();
    endpointParts.forEach((el) => el.classList.toggle('is-picked', Number(el.dataset.e) === agent));

    const rows = 2 + Math.floor(Math.random() * 3);
    pickCells(rows);
    const riseMs = 900 + rows * 330; // 2 cells ≈ 1.6s … 4 cells ≈ 2.2s
    at(0.72, () => riseResponse(0, riseMs));
  };

  request.addEventListener('animationstart', runCycle);
  request.addEventListener('animationiteration', runCycle);
};

initStackCycle();

// Light/dark theme. Follows the system until the visitor picks one, then remembers it.
const initThemeToggle = () => {
  const button = document.querySelector('.theme-toggle');
  if (!button) return;
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches);

  const sync = () => {
    const dark = isDark();
    button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', dark ? '#0b1120' : '#ffffff');
    });
  };

  button.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch (e) {
      // storage blocked: the choice still applies for this visit
    }
    sync();
  });
  systemDark.addEventListener('change', sync);
  sync();
};

initThemeToggle();

// On phones and tablets the hero stack turns as the device is tilted, the way it follows
// the pointer on desktop. The angle the device is held at counts as level, and slowly
// re-centres if the visitor changes how they hold it. iOS asks for permission, which can
// only be requested from a tap, so it is requested on the first touch.
const initMotionTilt = () => {
  const stack = document.querySelector('.stack');
  if (!stack || !('DeviceOrientationEvent' in window)) return;
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX_Z = 16; // degrees, left/right tilt → turn
  const MAX_X = 10; // degrees, forward/back tilt → pitch
  const clamp = (v, max) => Math.max(-max, Math.min(max, v));
  let base = null;
  let frame = 0;
  let next = { x: 0, z: 0 };

  const onOrientation = (event) => {
    if (event.beta === null || event.gamma === null) return;
    if (!base) base = { beta: event.beta, gamma: event.gamma };
    base.beta += (event.beta - base.beta) * 0.01; // drift back to level over a few seconds
    base.gamma += (event.gamma - base.gamma) * 0.01;
    next = {
      z: clamp((event.gamma - base.gamma) * 0.7, MAX_Z),
      x: clamp((event.beta - base.beta) * -0.45, MAX_X),
    };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      stack.style.setProperty('--tilt-z', `${next.z.toFixed(2)}deg`);
      stack.style.setProperty('--tilt-x', `${next.x.toFixed(2)}deg`);
    });
  };

  const listen = () => window.addEventListener('deviceorientation', onOrientation);
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    window.addEventListener(
      'touchend',
      () => {
        DeviceOrientationEvent.requestPermission()
          .then((state) => state === 'granted' && listen())
          .catch(() => {});
      },
      { once: true }
    );
  } else {
    listen();
  }
};

initMotionTilt();

// Layout diagnostics, shown only when the address ends in ?debug. It reports what this
// browser measures for the screen, the page and the top bar, and lists anything wider
// than the screen, so a layout problem on a real phone can be read off one screenshot.
const initLayoutDebug = () => {
  if (!new URLSearchParams(window.location.search).has('debug')) return;
  const box = document.createElement('pre');
  box.style.cssText =
    'position:fixed;left:0;bottom:0;z-index:9999;box-sizing:border-box;width:100vw;max-height:60vh;overflow:auto;margin:0;padding:8px;' +
    'background:#111;color:#7CFC9A;font:11px/1.35 monospace;white-space:pre-wrap;word-break:break-all';
  document.body.append(box);

  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('class') ? `.${el.getAttribute('class').trim().split(/\s+/).join('.')}` : ''}`;
  const report = () => {
    const doc = document.documentElement;
    const screenW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const nav = document.querySelector('nav').getBoundingClientRect();
    const wide = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (el === box) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > screenW + 1 || r.left < -1)) wide.push([r.right - r.left, `${describe(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`]);
      else if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && getComputedStyle(el).overflowX === 'visible') wide.push([el.scrollWidth, `${describe(el)} scrolls ${el.clientWidth}->${el.scrollWidth}`]);
    });
    wide.sort((a, b) => b[0] - a[0]);
    box.textContent = [
      navigator.userAgent,
      `screen ${window.screen.width}x${window.screen.height} dpr ${window.devicePixelRatio}`,
      `innerWidth ${window.innerWidth} | visualViewport ${window.visualViewport ? `${Math.round(window.visualViewport.width)} scale ${window.visualViewport.scale.toFixed(2)}` : 'n/a'}`,
      `html client ${doc.clientWidth} scroll ${doc.scrollWidth} | body scroll ${document.body.scrollWidth}`,
      `nav ${Math.round(nav.left)}..${Math.round(nav.right)}`,
      wide.length ? `wider than screen (${wide.length}):` : 'nothing is wider than the screen',
      ...wide.slice(0, 12).map((w) => `  ${w[1]}`),
    ].join('\n');
  };
  report();
  setInterval(report, 1500);
};

initLayoutDebug();

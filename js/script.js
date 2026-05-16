const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

const mobileViewportQuery = window.matchMedia('(max-width: 1120px)');
const syncMobileViewportOffset = () => {
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

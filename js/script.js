const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

const currentYearEl = document.getElementById('current-year');
if (currentYearEl) {
  currentYearEl.textContent = String(new Date().getFullYear());
}

// Prevent hash-based refresh jumps (e.g. #contact) and always start at top.
if (window.location.hash) {
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  window.scrollTo(0, 0);
}

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

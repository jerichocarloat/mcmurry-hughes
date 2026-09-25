/* =========================================================================
   McMURRY & HUGHES — motion.js
   The primitives, and nothing else in the system is allowed to animate.

     reveal()       a block fades up once as it arrives — no stagger
     drift()        every person square wanders a small seeded path
     rail()         the page rail records where the reader is

   THE RULES THIS FILE KEEPS (brand book, part eight; production notes)
     Nothing flashes. The one continuous motion is the drift of the people
     squares — every one on the site (drift() below, CSS in components.css),
     a deliberate departure from the production notes' "nothing loops", at
     the owner's request. It pauses off screen and stops under reduced
     motion. Everything else moves only when the reader
     scrolls, points or clicks, and every entrance happens once. No parallax, no counters, no staggered reveals, no type that
     arrives a line at a time, no magnetic buttons. Markers never slide and
     never scale.
     The one build — "the window widens" — lives with the demonstration in
     market-map.js, because it is part of what the demonstration shows.
     Nothing on the site tilts towards the pointer. Everything here is a
     no-op under prefers-reduced-motion.
   ========================================================================= */

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ── reveal ───────────────────────────────────────────────────────────── */
/* Elements carrying [data-reveal] fade up into place once, together, as
   they arrive. The class that hides them is added by CSS only when the
   inline .js flag is set, so a page without JavaScript is fully visible. */

export function reveal(root = document) {
  const items = [...root.querySelectorAll('[data-reveal]')];
  if (!items.length) return;

  if (reduced.matches) { items.forEach((el) => el.classList.add('is-in')); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach((el) => io.observe(el));
}

/* ── drift ────────────────────────────────────────────────────────────── */
/* Gives every square matching `selector` its own seeded three-point path
   (CSS does the moving: .drift in components.css). Each field pauses while
   it is off screen. Under reduced motion the CSS never runs, so this only
   writes a few custom properties. */

export function drift(selector, { amp = 8, seed = 1, min = 3.8, max = 5.6 } = {}) {
  let s = seed >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const els = [...document.querySelectorAll(selector)];
  const hosts = new Set();
  els.forEach((el) => {
    const dur = min + r() * (max - min);
    /* every leg covers at least half the range, on both axes, so no square
       ever sits nearly still; the two legs head in different directions */
    const v = () => ((r() < 0.5 ? -1 : 1) * amp * (0.5 + r() * 0.5)).toFixed(1);
    const ax = v(), ay = v();
    el.style.setProperty('--ax', `${ax}px`); el.style.setProperty('--ay', `${ay}px`);
    el.style.setProperty('--bx', `${(-Math.sign(ax) * Math.abs(v())).toFixed(1)}px`);
    el.style.setProperty('--by', `${(-Math.sign(ay) * Math.abs(v())).toFixed(1)}px`);
    el.style.setProperty('--dur', `${dur.toFixed(1)}s`);
    el.style.setProperty('--dl', `-${(r() * dur).toFixed(1)}s`);
    el.classList.add('drift');
    hosts.add(el.closest('.window, .mini, .map__plot, .compare__plot, .sheet__mini') || el.parentElement);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-still', !e.isIntersecting));
  }, { rootMargin: '10% 0px' });
  hosts.forEach((h) => { h.classList.add('is-still'); io.observe(h); });
}

/* ── the rail ─────────────────────────────────────────────────────────── */
/* The book's page rail (the search trace), made functional. One tick per
   section; the vermilion tick is the section in view — the one vermilion
   mark the approved device carries. It is a visual aid only: the rail is
   aria-hidden and its ticks are not in the tab order, because the page's
   headings already carry the same structure. */

export function rail() {
  const el = document.querySelector('.rail');
  if (!el) return;
  const sections = [...document.querySelectorAll('[data-rail]')];
  if (!sections.length) { el.remove(); return; }

  const ticks = el.querySelector('.rail__ticks');
  const label = el.querySelector('.rail__label');
  const num = el.querySelector('.rail__n');

  const made = sections.map((s, i) => {
    if (!s.id) s.id = `section-${i + 1}`;
    const a = document.createElement('a');
    a.className = 'rail__tick';
    a.href = `#${s.id}`;
    a.tabIndex = -1;
    a.style.top = `${(i / Math.max(sections.length - 1, 1)) * 100}%`;
    ticks.appendChild(a);
    return a;
  });

  const set = (i) => {
    made.forEach((t, j) => t.classList.toggle('is-on', j === i));
    label.textContent = sections[i].dataset.rail;
    num.textContent = String(i + 1).padStart(2, '0');
    // the rail inverts over ink sections so it stays legible
    el.classList.toggle('rail--rev', sections[i].dataset.railRev === 'true');
  };

  /* The section in view is the one under the middle of the screen, measured
     on scroll. (An IntersectionObserver with a root margin did this before,
     but a browser ignores root margins inside a cross-origin frame — which
     is how a preview of the site is shown — and the label went stale.) */
  let current = -1, ticking = false;
  const measure = () => {
    ticking = false;
    const mid = window.innerHeight / 2;
    let i = sections.findIndex((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= mid && r.bottom > mid;
    });
    if (i < 0) i = window.scrollY < 10 ? 0 : current;
    if (i !== current && i >= 0) { current = i; set(i); }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(measure); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  set(0); current = 0; measure();

  const foot = document.querySelector('.foot');
  if (foot) new IntersectionObserver((e) => el.classList.toggle('rail--off', e[0].isIntersecting))
    .observe(foot);
}

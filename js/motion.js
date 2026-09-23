/* =========================================================================
   McMURRY & HUGHES — motion.js
   The primitives, and nothing else in the system is allowed to animate.

     reveal()     opacity + an 18px rise, or a left-to-right wipe
     lines()      a statement arrives one line at a time
     depth()      a pointer moves a paper object a few degrees, no more
     parallax()   a photograph moves slower than the page it is cut into
     arrive()     the people appear one at a time, not all at once
     drift()      the people are never quite still
     magnet()     the pointer near a person is noticed by that person
     tilt()       a flat field gains depth under the pointer

   The last four are what makes the people on this site read as people rather
   than as dots. The rule they keep: a marker NEVER changes what it means. It
   drifts within about three pixels of where it was counted, it notices a
   pointer, and it returns. It does not travel, swap places, bounce, orbit or
   re-flow, and a filter still changes only its state.

   Everything is slow. The drift cycles run 9–17 seconds; nothing in the
   system moves fast enough to be caught doing it. All of it is a no-op under
   prefers-reduced-motion.
   ========================================================================= */

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
export const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

const raf = (fn) => {
  let ticking = false, last = null;
  return (arg) => {
    last = arg;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; fn(last); });
  };
};

/* ── the loop ─────────────────────────────────────────────────────────── */
/* One requestAnimationFrame for the whole page, shared by every ambient
   animation, and stopped the moment nothing is on screen. A second loop
   would cost a frame and buy nothing. */

const jobs = new Set();
let looping = false;

function loop(t) {
  if (!jobs.size) { looping = false; return; }
  jobs.forEach((fn) => fn(t));
  requestAnimationFrame(loop);
}
export function addJob(fn) {
  jobs.add(fn);
  if (!looping) { looping = true; requestAnimationFrame(loop); }
}
export function removeJob(fn) { jobs.delete(fn); }

/* Deterministic pseudo-random, so a marker's drift is the same on every load
   and for every visitor. A market that reshuffles is not evidence. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ── reveal ───────────────────────────────────────────────────────────── */
/* Elements carrying [data-reveal] rise into place once. Siblings inside a
   [data-stagger] container are delayed in sequence — the "staggered evidence
   appearance" — capped so a long list never feels like a queue. */

export function reveal(root = document) {
  const items = [...root.querySelectorAll('[data-reveal]')];
  if (!items.length) return;

  if (reduced.matches) { items.forEach((el) => el.classList.add('is-in')); return; }

  root.querySelectorAll('[data-stagger]').forEach((group) => {
    const step = Number(group.dataset.stagger) || 90;
    [...group.querySelectorAll('[data-reveal]')].forEach((el, i) => {
      el.style.setProperty('--d', `${Math.min(i * step, 560)}ms`);
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  items.forEach((el) => io.observe(el));
}

/* ── lines ────────────────────────────────────────────────────────────── */
/* Splits a statement into its rendered lines and masks each one. Re-splits on
   resize, because the line breaks are the browser's, not ours. If this never
   runs the text is simply visible — the masking class is added here, not in
   the markup. */

export function lines(root = document) {
  const targets = [...root.querySelectorAll('[data-lines]')];
  if (!targets.length || reduced.matches) return;

  const split = (el) => {
    if (!el.dataset.text) el.dataset.text = el.textContent.trim();
    const words = el.dataset.text.split(/\s+/);
    el.textContent = '';
    const probes = words.map((w, i) => {
      const s = document.createElement('span');
      s.textContent = i === words.length - 1 ? w : `${w} `;
      s.style.display = 'inline-block';
      el.appendChild(s);
      return s;
    });

    const rows = [];
    let top = null;
    probes.forEach((s) => {
      const t = Math.round(s.offsetTop);
      if (t !== top) { rows.push([]); top = t; }
      rows[rows.length - 1].push(s.textContent);
    });

    el.textContent = '';
    el.classList.add('lines');
    rows.forEach((row, i) => {
      const ln = document.createElement('span');
      ln.className = 'ln';
      const inner = document.createElement('span');
      inner.textContent = row.join('');
      inner.style.setProperty('--d', `${i * 85}ms`);
      ln.appendChild(inner);
      el.appendChild(ln);
    });
  };

  targets.forEach(split);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  targets.forEach((el) => io.observe(el));

  let t;
  let w = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === w) return;          // ignore mobile URL-bar resizes
    w = window.innerWidth;
    clearTimeout(t);
    t = setTimeout(() => targets.forEach((el) => { split(el); el.classList.add('is-in'); }), 180);
  }, { passive: true });
}

/* ── depth ────────────────────────────────────────────────────────────── */
/* The pointer tilts an object a few degrees and moves its shadow with it.
   Maximum rotation is small on purpose: this is a document on a table seen
   slightly from the side, not an object in a game. Touch and reduced motion
   get the resting state, which is the correct state. */

export function depth(el, opts = {}) {
  if (!el || reduced.matches || !fine.matches) return;
  const { max = 4, shadow = 10, area = el, scale = 1 } = opts;

  const apply = raf(({ x, y }) => {
    el.style.setProperty('--ry', `${(x * max * scale).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-y * max * scale).toFixed(2)}deg`);
    el.style.setProperty('--sx', `${(-x * shadow).toFixed(1)}px`);
    el.style.setProperty('--sy', `${(-y * shadow * 0.6).toFixed(1)}px`);
  });

  const move = (e) => {
    const r = area.getBoundingClientRect();
    apply({
      x: ((e.clientX - r.left) / r.width - 0.5) * 2,
      y: ((e.clientY - r.top) / r.height - 0.5) * 2,
    });
  };
  const enter = () => el.classList.add('is-live');
  const leave = () => {
    el.classList.remove('is-live');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--sx', '0px');
    el.style.setProperty('--sy', '0px');
  };

  area.addEventListener('pointerenter', enter);
  area.addEventListener('pointermove', move, { passive: true });
  area.addEventListener('pointerleave', leave);
  el.addEventListener('focusin', enter);
  el.addEventListener('focusout', leave);
}

export function depthAll(selector, opts) {
  document.querySelectorAll(selector).forEach((el) => depth(el, opts));
}

/* ── parallax ─────────────────────────────────────────────────────────── */
/* Photographs only, and only ones cut by an edge. A single scroll listener
   drives every plate on the page; plates outside the viewport are skipped. */

export function parallax(root = document) {
  const imgs = [...root.querySelectorAll('img[data-parallax]')];
  if (!imgs.length || reduced.matches) return;

  const live = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target)));
    if (live.size) frame();
  }, { rootMargin: '10% 0px' });
  imgs.forEach((i) => io.observe(i));

  const frame = raf(() => {
    const h = window.innerHeight;
    live.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      const p = (r.top + r.height / 2 - h / 2) / h;          // -1 … 1
      const range = Number(img.dataset.parallax) || 42;
      img.style.setProperty('--py', `${(-p * range - range * 0.5).toFixed(1)}px`);
    });
  });

  window.addEventListener('scroll', frame, { passive: true });
  window.addEventListener('resize', frame, { passive: true });
  frame();
}

/* ── the rail ─────────────────────────────────────────────────────────── */
/* The book's page rail, made functional. One tick per section of the
   argument; the vermilion tick is the section in view. It is a record of
   where the reader is, not a progress bar, and it never animates on its own. */

export function rail() {
  const el = document.querySelector('.rail');
  if (!el) return;
  const sections = [...document.querySelectorAll('[data-rail]')];
  if (!sections.length) { el.remove(); return; }

  const ticks = el.querySelector('.rail__ticks');
  const label = el.querySelector('.rail__label');
  const num = el.querySelector('.rail__n');

  const made = sections.map((s, i) => {
    const a = document.createElement('a');
    a.className = 'rail__tick';
    a.href = `#${s.id}`;
    a.style.top = `${(i / Math.max(sections.length - 1, 1)) * 100}%`;
    a.setAttribute('aria-label', s.dataset.rail);
    ticks.appendChild(a);
    return a;
  });

  const set = (i) => {
    made.forEach((t, j) => t.setAttribute('aria-current', String(j === i)));
    label.textContent = sections[i].dataset.rail;
    num.textContent = String(i + 1).padStart(2, '0');
    // the rail inverts over ink sections so it stays legible
    el.classList.toggle('rail--rev', sections[i].dataset.railRev === 'true');
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      set(sections.indexOf(e.target));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });

  sections.forEach((s) => io.observe(s));
  set(0);
}

/* ── arrive ───────────────────────────────────────────────────────────── */
/* The people do not fade in with the layout. They appear one at a time,
   from nothing, in the order they were counted — the same gesture as a map
   being plotted. The frame and the searched field are already there; what
   arrives is what the search was missing. */

export function arrive(el, { step = 90, start = 0, max = 1400 } = {}) {
  if (!el) return;
  const people = [...el.children];
  if (reduced.matches) { el.classList.add('is-arrived'); return; }

  people.forEach((p, i) => {
    p.style.setProperty('--d', `${Math.min(start + i * step, start + max)}ms`);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      el.classList.add('is-arrived');
      io.disconnect();
      /* once everyone is here, drop the stagger delay, or the pointer would
         be answered a second and a half late */
      setTimeout(() => people.forEach((p) => p.style.setProperty('--d', '0ms')),
        start + max + 900);
    });
  }, { threshold: 0.2 });
  io.observe(el);
}

/* ── drift ────────────────────────────────────────────────────────────── */
/* Two sine waves per marker, at different periods, so no two markers are
   ever in step and the field never pulses. Amplitude is 2–4px and the slowest
   cycle is seventeen seconds: you notice that the field is alive, not that
   anything is moving. Markers pause the instant they leave the viewport. */

export function drift(selector, { amp = 6, root = document, period = 7000 } = {}) {
  const els = [...root.querySelectorAll(selector)];
  if (!els.length || reduced.matches) return;

  const rnd = seeded(20260922);
  const parts = els.map((el) => ({
    el,
    ax: amp * (0.6 + rnd() * 0.8),
    ay: amp * (0.6 + rnd() * 0.8),
    px: period + rnd() * period * 0.9,        // ~7-13s at the default
    py: period * 1.25 + rnd() * period * 0.7,
    o: rnd() * 20000,
  }));

  const TAU = Math.PI * 2;
  const tick = (t) => {
    for (const p of parts) {
      p.el.style.setProperty('--dx', `${(Math.sin(((t + p.o) / p.px) * TAU) * p.ax).toFixed(2)}px`);
      p.el.style.setProperty('--dy', `${(Math.cos(((t + p.o) / p.py) * TAU) * p.ay).toFixed(2)}px`);
    }
  };

  /* only run while the field is actually on screen */
  const hosts = [...new Set(els.map((e) => e.closest('.window, .map__plot, .compare__plot, .sheet') || e.parentElement))];
  let visible = 0;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { visible += e.isIntersecting ? 1 : -1; });
    visible = Math.max(visible, 0);
    if (visible > 0) addJob(tick); else removeJob(tick);
  }, { rootMargin: '15% 0px' });
  hosts.forEach((h) => h && io.observe(h));
}

/* ── magnet ───────────────────────────────────────────────────────────── */
/* A person near the pointer notices it: they grow, lean a little towards it,
   and the ones further away stay exactly as they were. It is the argument in
   miniature — attention finds the person it is pointed at, and the rest of
   the market carries on unaware. Radius is deliberately small; this is not a
   force field. */

export function magnet(area, selector, { radius = 190, lift = 0.85, pull = 7 } = {}) {
  if (!area || reduced.matches || !fine.matches) return;
  const els = [...area.querySelectorAll(selector)];
  if (!els.length) return;

  let pointer = null;

  const apply = raf(() => {
    const box = area.getBoundingClientRect();
    for (const el of els) {
      /* a marker a filter has excluded does not answer the pointer */
      if (!pointer || el.dataset.state === 'out') {
        el.style.setProperty('--s', '1');
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
        continue;
      }
      const r = el.getBoundingClientRect();
      const dx = pointer.x - (r.left + r.width / 2 - box.left);
      const dy = pointer.y - (r.top + r.height / 2 - box.top);
      const d = Math.hypot(dx, dy);
      const f = d > radius ? 0 : (1 - d / radius) ** 2;     // falls off fast
      el.style.setProperty('--s', (1 + f * lift).toFixed(3));
      el.style.setProperty('--mx', `${(dx * f * (pull / 100)).toFixed(2)}px`);
      el.style.setProperty('--my', `${(dy * f * (pull / 100)).toFixed(2)}px`);
    }
  });

  area.addEventListener('pointermove', (e) => {
    const box = area.getBoundingClientRect();
    pointer = { x: e.clientX - box.left, y: e.clientY - box.top };
    apply();
  }, { passive: true });

  area.addEventListener('pointerleave', () => { pointer = null; apply(); });
}

/* ── tilt ─────────────────────────────────────────────────────────────── */
/* A flat counted field, given a plane. The whole plot leans a degree or two
   under the pointer; the markers sit on three depth planes, so the near ones
   travel further than the far ones and the field reads as a space rather
   than a chart. Two degrees is the whole effect. */

export function tilt(el, { max = 2, area = el } = {}) {
  if (!el || reduced.matches || !fine.matches) return;

  const apply = raf(({ x, y }) => {
    el.style.setProperty('--pry', `${(x * max).toFixed(2)}deg`);
    el.style.setProperty('--prx', `${(-y * max).toFixed(2)}deg`);
  });

  area.addEventListener('pointermove', (e) => {
    const r = area.getBoundingClientRect();
    apply({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
  }, { passive: true });

  area.addEventListener('pointerleave', () => {
    el.style.setProperty('--prx', '0deg');
    el.style.setProperty('--pry', '0deg');
  });
}

/* ── scrollDepth ──────────────────────────────────────────────────────── */
/* The hero object keeps turning as the page leaves it — the view past the
   edge of the search opens a little further as you go. It is one rotation
   over one screen height, and it stops there. */

export function scrollDepth(el, { max = 5, rise = 26 } = {}) {
  if (!el || reduced.matches) return;
  const host = el.closest('.window') || el;

  const tick = () => {
    const r = host.getBoundingClientRect();
    const p = Math.min(Math.max(-r.top / window.innerHeight, 0), 1);   // 0 → 1
    el.style.setProperty('--srx', `${(p * max).toFixed(2)}deg`);
    el.style.setProperty('--sry', `${(p * -max * 0.6).toFixed(2)}deg`);
    el.style.setProperty('--sty', `${(p * -rise).toFixed(1)}px`);
  };
  const onScroll = raf(tick);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { window.addEventListener('scroll', onScroll, { passive: true }); tick(); }
      else window.removeEventListener('scroll', onScroll);
    });
  }, { rootMargin: '20% 0px' });
  io.observe(host);
  tick();
}

/* ── breathe ──────────────────────────────────────────────────────────── */
/* The idle turn. Two very slow, out-of-phase rotations — about a degree,
   over half a minute — so an object nobody is touching is still an object in
   a room rather than a picture of one. It composes with the pointer and the
   scroll rotations rather than replacing them, and it stops when the object
   leaves the screen. */

export function breathe(el, { max = 1.1, px = 26000, py = 34000 } = {}) {
  if (!el || reduced.matches) return;
  const TAU = Math.PI * 2;

  const tick = (t) => {
    el.style.setProperty('--iry', `${(Math.sin((t / px) * TAU) * max).toFixed(3)}deg`);
    el.style.setProperty('--irx', `${(Math.cos((t / py) * TAU) * max * 0.55).toFixed(3)}deg`);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? addJob(tick) : removeJob(tick)));
  }, { rootMargin: '10% 0px' });
  io.observe(el);
}

/* ── cssScroll ────────────────────────────────────────────────────────── */
/* Scroll-driven animations run off the main thread and cannot drift out of
   sync with the scroll position. Where the browser has them, motion.css does
   the parallax and the window's exit rotation and this file stands down. */

export const cssScroll = CSS.supports('animation-timeline: view()');

/* ── reach ────────────────────────────────────────────────────────────── */
/* Hovering one person on the map draws the line between the market the
   client is searching and where that person actually is, with the distance
   stated in the only unit that matters here: outside.

   The line is drawn once per marker, from the corner of the searched field,
   and it is removed the moment the pointer leaves. It is not decoration: it
   is the distance the desk covers. */

export function reach(plot) {
  if (!plot || reduced.matches) return;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'map__reach');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');
  const line = document.createElementNS(NS, 'line');
  const label = document.createElementNS(NS, 'text');
  svg.append(line, label);
  plot.appendChild(svg);

  const field = plot.querySelector('.map__searched');

  const draw = (marker) => {
    const p = plot.getBoundingClientRect();
    const m = marker.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${p.width} ${p.height}`);
    svg.setAttribute('width', p.width);
    svg.setAttribute('height', p.height);

    const x1 = f.right - p.left;
    const y1 = f.top - p.top + f.height * 0.5;
    const x2 = m.left - p.left + m.width / 2;
    const y2 = m.top - p.top + m.height / 2;

    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.style.setProperty('--len', Math.round(Math.hypot(x2 - x1, y2 - y1)));

    label.setAttribute('x', (x1 + x2) / 2);
    label.setAttribute('y', (y1 + y2) / 2 - 10);
    label.setAttribute('text-anchor', 'middle');
    label.textContent = 'Outside your search';

    requestAnimationFrame(() => svg.classList.add('is-on'));
  };

  plot.addEventListener('pointerover', (e) => {
    const m = e.target.closest('.marker');
    if (!m || m.dataset.state === 'out' || m.classList.contains('marker--searched')) return;
    svg.classList.remove('is-on');
    draw(m);
  });
  plot.addEventListener('focusin', (e) => {
    const m = e.target.closest('.marker');
    if (m && m.dataset.state !== 'out' && !m.classList.contains('marker--searched')) {
      svg.classList.remove('is-on');
      draw(m);
    }
  });
  const off = () => svg.classList.remove('is-on');
  plot.addEventListener('pointerleave', off);
  plot.addEventListener('focusout', off);
}

/* ── pull ─────────────────────────────────────────────────────────────── */
/* The primary action leans towards the pointer as it comes near — six
   pixels, released the moment the pointer leaves. Only the action that leads
   to the market does this; a page of magnetic buttons is a toy. */

export function pull(selector, { radius = 120, max = 6 } = {}) {
  if (reduced.matches || !fine.matches) return;
  const btns = [...document.querySelectorAll(selector)];
  if (!btns.length) return;

  const apply = raf((e) => {
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const near = d < radius + Math.max(r.width, r.height) / 2;
      b.classList.toggle('is-pulled', near);
      const f = near ? 1 - d / (radius + Math.max(r.width, r.height) / 2) : 0;
      b.style.setProperty('--bx', `${(dx * f * (max / 60)).toFixed(2)}px`);
      b.style.setProperty('--by', `${(dy * f * (max / 60)).toFixed(2)}px`);
    }
  });

  window.addEventListener('pointermove', apply, { passive: true });
}

/* =========================================================================
   McMURRY & HUGHES — market-map.js
   The signature artefact.

   WHAT IT IS
     A counted field, not a geographic map. There are no pins, no flags, no
     arcs between cities, no globe. The horizontal axis is distance from the
     market the client is already searching. The vertical axis is depth of
     experience. The grey block at the lower left is that searched market —
     the only place on this site where grey is allowed to mean anything.

   HOW IT BEHAVES
     Filters change the count and the state of a marker. Markers never move,
     never slide, never scale, never re-flow and never bounce. A marker that
     falls out of a filter fades to 14% and stops responding. That is the
     whole animation. Hover, focus or tap one marker to read it; the arrow
     keys move between markers, so the map is one tab stop, not seventy-six.

   WHAT IT NEVER SHOWS
     A name. A photograph. A current employer. A contact detail. A claim that
     someone has been contacted when they have not. Every record carries what
     we do not know, beside what we do.

   THE DATA
     Generated here, deterministically and seeded, so the same market
     appears on every load. To connect a counted map, replace `load()` with
     a fetch — see README, "Ready for real data".
   ========================================================================= */

/* ── a small deterministic generator ──────────────────────────────────── */
/* Seeded so the same market appears on every load and for every
   visitor: a map that reshuffles on refresh is a map nobody can trust. */

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PLACES = [
  { city: 'Kraków',    tz: 'CET' }, { city: 'Wrocław',  tz: 'CET' },
  { city: 'Porto',     tz: 'WET' }, { city: 'Valencia', tz: 'CET' },
  { city: 'Timișoara', tz: 'EET' }, { city: 'Brno',     tz: 'CET' },
  { city: 'Gdańsk',    tz: 'CET' }, { city: 'Bratislava', tz: 'CET' },
  { city: 'Lisbon',    tz: 'WET' }, { city: 'Cluj',     tz: 'EET' },
];
const SEARCHED = [{ city: 'Stuttgart', tz: 'CET' }, { city: 'Munich', tz: 'CET' }];

const LANGS = ['German C1', 'German B2', 'German B1', 'English C1'];

const KNOWN = [
  'Two S/4HANA migrations in manufacturing',
  'Finance module, mid-size manufacturer',
  'Cutover lead on one migration',
  'Six years on the same product, one employer',
  'Worked German-language support for a software product',
  'Has been the only consultant on a rollout',
  'Moved from in-house to consultancy in 2024',
  'Named on a published case study',
];
const UNKNOWN = [
  'Whether they are open to moving',
  'Current pay',
  'Notice period',
  'Whether their employer can match an offer',
  'Availability',
  'Whether German is used daily in their current role',
];

function build(insideCount, outsideCount, seed) {
  const r = rng(seed);
  const people = [];
  const count = insideCount + outsideCount;
  for (let i = 0; i < count; i += 1) {
    const inside = i < insideCount;                          // the searched market
    const place = inside
      ? SEARCHED[Math.floor(r() * SEARCHED.length)]
      : PLACES[Math.floor(r() * PLACES.length)];
    const years = 2 + Math.floor(r() * 16);
    const lang = LANGS[Math.floor(r() * LANGS.length)];
    people.push({
      id: i + 1,
      inside,
      role: 'ERP consultant · S/4HANA',
      years,
      city: place.city,
      tz: place.tz,
      lang,
      known: KNOWN[Math.floor(r() * KNOWN.length)],
      unknown: UNKNOWN[Math.floor(r() * UNKNOWN.length)],
      // Position: x is distance from the searched market, y is experience.
      // People already inside that market are plotted inside the grey block,
      // which is a place rather than a level of experience. They occupy the
      // upper band of that block only: the lower band belongs to the label
      // that names it, and a marker must never sit inside a word.
      x: inside ? 3 + r() * 18 : 30 + r() * 66,
      y: inside ? 64 + r() * 16 : 6 + (1 - Math.min(years, 18) / 18) * 78 + (r() * 8 - 4),
    });
  }
  return people;
}

/* The market, fixed: 9 people inside the searched market and 67
   outside it — the same figures as the ERP map in the brand book
   ("Stuttgart · 9", "Porto · Valencia · Kraków · 67"). The count on the page
   is the people OUTSIDE the search, because that is what it is labelled. */
export function load() {
  return build(9, 67, 20260312);
}

/* ── the filters ──────────────────────────────────────────────────────── */

const FILTERS = {
  all:   { label: 'All',        test: () => true },
  c1:    { label: 'German C1',  test: (p) => p.lang === 'German C1' },
  b1:    { label: 'German B1+', test: (p) => p.lang.startsWith('German') },
  y5:    { label: '5+ years',   test: (p) => p.years >= 5 },
  y10:   { label: '10+ years',  test: (p) => p.years >= 10 },
};

/* ── the component ────────────────────────────────────────────────────── */

export class MarketMap {
  constructor(root) {
    this.root = root;
    this.people = load();
    this.active = 'all';
    this.plot = root.querySelector('.map__plot');
    this.read = root.querySelector('.map__read');
    this.count = root.querySelector('[data-count]');
    this.filters = [...root.querySelectorAll('.filter[data-filter]')];
    this.current = null;
    this.render();
    this.bind();
    this.apply('all');
  }

  name(p) {
    return `${p.inside ? 'Inside the searched market' : 'Outside the searched market'}: `
      + `${p.role}, ${p.years} years, ${p.city}, ${p.lang}. Not contacted.`;
  }

  render() {
    const frag = document.createDocumentFragment();
    this.markers = this.people.map((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `marker${p.inside ? ' marker--searched' : ''}`;
      b.style.left = `${p.x}%`;
      b.style.top = `${p.y}%`;
      /* three depth planes, assigned by how far outside the searched market
         a person is. The field leans under the pointer and the near planes
         travel further than the far ones — the market gains a depth the
         count alone cannot show. People inside the searched market sit at
         +1px: on the block rather than behind it. */
      b.style.setProperty('--mz', `${p.inside ? 1 : Math.round((p.x - 30) / 66 * 34) + 4}px`);
      b.dataset.id = String(p.id);
      b.tabIndex = -1;
      // The accessible name carries the same facts the panel does, so the map
      // is readable without sight and without a pointer.
      b.setAttribute('aria-label', this.name(p));
      frag.appendChild(b);
      return b;
    });
    this.plot.appendChild(frag);

    /* the map appears when it is looked at: one fade, all at once */
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        this.plot.classList.add('is-plotted');
        io.disconnect();
        this.nudge();
      });
    }, { threshold: 0.15 });
    io.observe(this.plot);
  }

  /* On a screen narrower than the plot, carry the view across the boundary
     once, slowly, so the first thing a phone shows is not the searched
     market alone. It happens one time, it can be interrupted by a touch,
     and it does not animate for someone who asked for less motion. */
  nudge() {
    const wrap = this.plot.closest('.map__plotwrap');
    if (!wrap) return;
    const over = wrap.scrollWidth - wrap.clientWidth;
    if (over < 40 || wrap.scrollLeft > 4) return;
    wrap.classList.add('is-scrollable');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const to = Math.min(over * 0.42, 260);
    setTimeout(() => {
      wrap.scrollTo({ left: to, behavior: reduced ? 'auto' : 'smooth' });
    }, reduced ? 0 : 1400);
  }

  live() { return this.markers.filter((m) => m.dataset.state === 'in'); }

  /* one tab stop for the whole map: the roving marker */
  rove(to, focus = true) {
    this.markers.forEach((m) => { m.tabIndex = -1; });
    if (!to) return;
    to.tabIndex = 0;
    if (focus) to.focus();
  }

  bind() {
    this.filters.forEach((f) => {
      f.addEventListener('click', () => this.apply(f.dataset.filter));
    });

    const target = (e) => {
      const b = e.target.closest('.marker');
      return b && b.dataset.state !== 'out' ? b : null;
    };
    this.plot.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch') return;          // touch is handled by click
      const b = target(e); if (b) this.show(b);
    });
    /* a tap toggles the read-out (touch has no hover); a mouse click or a
       keyboard activation only ever opens it, because hover already did */
    this.plot.addEventListener('click', (e) => {
      const b = target(e);
      if (!b) { this.hide(); return; }
      const tap = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (tap && this.current === b && this.read.classList.contains('is-open')) this.hide();
      else { this.rove(b, false); this.show(b); }
    });
    this.plot.addEventListener('focusin', (e) => { const b = target(e); if (b) this.show(b); });
    this.plot.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') this.hide(); });
    this.plot.addEventListener('focusout', (e) => {
      if (!this.plot.contains(e.relatedTarget)) this.hide();
    });
    this.plot.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.hide(); return; }
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' };
      if (!(e.key in keys)) return;
      const list = this.live().sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
      if (!list.length) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement);
      const k = keys[e.key];
      const next = k === 'first' ? list[0]
        : k === 'last' ? list[list.length - 1]
          : list[(Math.max(i, 0) + k + list.length) % list.length];
      this.rove(next);
    });
  }

  apply(key) {
    this.active = FILTERS[key] ? key : 'all';
    const test = FILTERS[this.active].test;
    let outside = 0;
    this.people.forEach((p, i) => {
      const on = test(p);
      if (on && !p.inside) outside += 1;
      this.markers[i].dataset.state = on ? 'in' : 'out';
    });
    this.filters.forEach((f) => f.setAttribute('aria-pressed', String(f.dataset.filter === this.active)));
    if (this.count) this.count.textContent = String(outside);
    /* the tab stop moves to the first person outside the search */
    const first = this.live().sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left))
      .find((m) => !m.classList.contains('marker--searched')) || this.live()[0];
    this.rove(first, false);
    this.hide();
  }

  show(btn) {
    const p = this.people[Number(btn.dataset.id) - 1];
    this.current = btn;
    this.read.innerHTML = `
      <span class="label map__readlab">${p.inside ? 'Inside the search' : 'Outside the search'}</span>
      <dl>
        <dt>Role</dt><dd>${p.role}</dd>
        <dt>Years</dt><dd>${p.years}</dd>
        <dt>Where</dt><dd>${p.city} · ${p.tz}</dd>
        <dt>Language</dt><dd>${p.lang}</dd>
        <dt>We know</dt><dd>${p.known}</dd>
        <dt>We don't</dt><dd class="unknown">${p.unknown}</dd>
      </dl>
      <span class="label map__readlab" style="margin-top:14px">Not contacted</span>`;

    const pr = this.plot.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    /* measured, not assumed: the panel must never be cut by the plot's edge */
    const w = this.read.offsetWidth || 250;
    const h = this.read.offsetHeight || 240;
    let left = br.left - pr.left + 20;
    if (left + w > pr.width - 12) left = br.left - pr.left - w - 16;
    const top = Math.min(br.top - pr.top - 12, pr.height - h - 8);
    this.read.style.left = `${Math.max(left, 8)}px`;
    this.read.style.top = `${Math.max(top, 8)}px`;
    this.markers.forEach((m) => m.classList.toggle('is-read', m === btn));
    this.read.classList.add('is-open');
  }

  hide() {
    this.current = null;
    this.read.classList.remove('is-open');
    this.markers?.forEach((m) => m.classList.remove('is-read'));
  }
}

/* ── the demonstration on the home page ───────────────────────────────── */
/* One control, one field. Moving the boundary of the search changes how
   many of the same people are inside it. Nothing is added or removed — the
   market does not change, only the part of it the company can see.

   THE BUILD, TIED TO THE SCROLL (brand book, part eight: "the window
   widens", from the lower left). As the
   demonstration scrolls up into view the boundary widens from 14% to 34%,
   and the people it reaches turn grey; scroll back and it narrows again.
   The reader's scroll is the only clock, so nothing plays on its own. The
   moment the reader touches the slider, the scroll lets go of it for good.
   Under prefers-reduced-motion the boundary is simply drawn at 34%. */


export function comparison(root) {
  const plot = root.querySelector('.compare__plot');
  const input = root.querySelector('.slider');
  const field = root.querySelector('.compare__searched');
  const inCount = root.querySelector('[data-in]');
  const outCount = root.querySelector('[data-out]');

  const r = rng(90210);
  const dots = Array.from({ length: 54 }, () => {
    const d = document.createElement('span');
    d.className = 'compare__dot';
    const x = r() * 96;
    const y = r() * 92;
    d.style.left = `${x}%`;
    d.style.top = `${y}%`;
    d._x = x; d._y = y;
    plot.appendChild(d);
    return d;
  });

  const draw = (v = Number(input.value)) => {         // 8 … 72 — width of the search
    const h = Math.min(22 + v * 0.6, 86);
    field.style.width = `${v}%`;
    field.style.height = `${h}%`;
    let inside = 0;
    dots.forEach((d) => {
      const on = d._x < v && d._y > 100 - h;
      if (on) inside += 1;
      d.dataset.in = String(on);
    });
    inCount.textContent = String(inside);
    outCount.textContent = String(dots.length - inside);
    input.setAttribute('aria-valuetext',
      `Your search covers ${Math.round(v)}% of the width. ${inside} people inside it, ${dots.length - inside} outside it.`);
  };

  let touched = false;
  input.addEventListener('input', () => { touched = true; draw(); });
  draw();

  const FROM = 14, TO = 34;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { input.value = String(TO); draw(); return; }

  let ticking = false, on = false;
  const follow = () => {
    ticking = false;
    if (touched) return;
    const r = plot.getBoundingClientRect();
    const vh = window.innerHeight;
    /* 0 as the plot's top rises past 95% of the screen, 1 once it reaches
       30%. A scrubbed build needs an even curve (smoothstep), not the timed
       build's quick departure, or it is over in the first flick. */
    const p = Math.min(Math.max((vh * 0.95 - r.top) / (vh * 0.65), 0), 1);
    const v = FROM + (TO - FROM) * (p * p * (3 - 2 * p));
    input.value = String(Math.round(v));
    draw(v);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(follow); } };
  root.classList.add('is-widening');                 // the frame loop drives the boundary
  input.addEventListener('input', () => {
    root.classList.remove('is-widening');
    window.removeEventListener('scroll', onScroll);
  }, { once: true });
  new IntersectionObserver((entries) => {
    const vis = entries.some((e) => e.isIntersecting);
    if (vis && !on && !touched) { window.addEventListener('scroll', onScroll, { passive: true }); on = true; follow(); }
    if (!vis && on) { window.removeEventListener('scroll', onScroll); on = false; follow(); }
  }, { rootMargin: '10% 0px' }).observe(plot);
}

/* =========================================================================
   McMURRY & HUGHES — market-map.js
   The signature artefact, live.

   WHAT IT IS
     A counted field, not a geographic map. There are no pins, no flags, no
     arcs between cities, no globe. The horizontal axis is distance from the
     market the client is already searching. The vertical axis is depth of
     experience. The grey block at the lower left is that searched market —
     the only place on this site where grey is allowed to mean anything.

   HOW IT BEHAVES
     Filters change the count and the state of a marker. Markers never move,
     never slide, never re-flow and never bounce. A marker that falls out of
     a filter fades to 14% and stops responding. That is the whole animation.

   WHAT IT NEVER SHOWS
     A name. A photograph. A current employer. A contact detail. A claim that
     someone has been contacted when they have not. Every record carries what
     we do not know, beside what we do.

   THE DATA BELOW IS ILLUSTRATIVE.
     It is generated here, deterministically, so the page can be built and
     tested before a real map exists. It is labelled as illustrative on every
     surface it appears on. Replace `load()` with a fetch of a counted map —
     see README, "Ready for real data".
   ========================================================================= */

/* ── a small deterministic generator ──────────────────────────────────── */
/* Seeded so the same illustrative market appears on every load and for every
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

function build(count, seed) {
  const r = rng(seed);
  const people = [];
  for (let i = 0; i < count; i += 1) {
    const inside = i < Math.round(count * 0.14);           // the searched market
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
      // which is a place rather than a level of experience.
      x: inside ? 3 + r() * 18 : 30 + r() * 66,
      y: inside ? 66 + r() * 26 : 6 + (1 - Math.min(years, 18) / 18) * 78 + (r() * 8 - 4),
    });
  }
  return people;
}

/* Illustrative market, fixed: 67 people, 9 of them inside the searched
   market — the same figures the printed map in the brand book carries. */
export function load() {
  return build(67, 20260312);
}

/* ── the filters ──────────────────────────────────────────────────────── */

const FILTERS = {
  all:   { label: 'All',        test: () => true },
  c1:    { label: 'German C1',  test: (p) => p.lang === 'German C1' },
  b1:    { label: 'German B1',  test: (p) => p.lang === 'German B1' || p.lang === 'German B2' },
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
    this.render();
    this.bind();
    this.apply('all');
  }

  render() {
    const frag = document.createDocumentFragment();
    this.markers = this.people.map((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `marker${p.inside ? ' marker--searched' : ''}`;
      b.style.left = `${p.x}%`;
      b.style.top = `${p.y}%`;
      /* three depth planes, assigned by how far outside the searched market
         a person is. The field leans under the pointer and the near planes
         travel further than the far ones — the market gains a depth the
         count alone cannot show. */
      b.style.setProperty('--mz', `${p.inside ? -14 : Math.round((p.x - 30) / 66 * 34) + 4}px`);
      /* plotted in the order they were counted, not all at once */
      b.style.setProperty('--d', `${Math.min(i * 14, 900)}ms`);
      b.dataset.id = String(p.id);
      b.setAttribute('aria-describedby', this.read.id);
      // The accessible name carries the same facts the panel does, so the map
      // is readable without sight and without a pointer.
      b.setAttribute('aria-label',
        `${p.role}, ${p.years} years, ${p.city}, ${p.lang}. Not contacted.`);
      frag.appendChild(b);
      return b;
    });
    this.plot.appendChild(frag);

    /* one pass of the search, outward from the edge of the client's own
       market — the gesture the whole company is selling, performed once */
    const sweep = document.createElement('span');
    sweep.className = 'map__sweep';
    sweep.setAttribute('aria-hidden', 'true');
    this.plot.appendChild(sweep);

    /* the map plots itself when it is looked at, then the stagger delay is
       dropped so the pointer is answered immediately */
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        this.plot.classList.add('is-plotted');
        io.disconnect();
        setTimeout(() => this.markers.forEach((m) => m.style.setProperty('--d', '0ms')), 1800);
        this.nudge();
      });
    }, { threshold: 0.15 });
    io.observe(this.plot);
  }

  /* On a screen narrower than the plot, carry the view across the boundary
     once, slowly, so the first thing a phone shows is not the searched
     market alone. It happens one time, it can be interrupted by a touch,
     and it does not happen at all for someone who asked for less motion. */
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

  bind() {
    this.filters.forEach((f) => {
      f.addEventListener('click', () => this.apply(f.dataset.filter));
    });

    const open = (e) => {
      const b = e.target.closest('.marker');
      if (!b || b.dataset.state === 'out') return;
      this.show(b);
    };
    this.plot.addEventListener('pointerover', open);
    this.plot.addEventListener('focusin', open);
    this.plot.addEventListener('pointerleave', () => this.hide());
    this.plot.addEventListener('focusout', (e) => {
      if (!this.plot.contains(e.relatedTarget)) this.hide();
    });
    this.plot.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.hide(); e.target.blur?.(); }
    });
  }

  apply(key) {
    this.active = FILTERS[key] ? key : 'all';
    const test = FILTERS[this.active].test;
    let n = 0;
    this.people.forEach((p, i) => {
      const on = test(p);
      if (on) n += 1;
      this.markers[i].dataset.state = on ? 'in' : 'out';
      this.markers[i].tabIndex = on ? 0 : -1;
    });
    this.filters.forEach((f) => f.setAttribute('aria-pressed', String(f.dataset.filter === this.active)));
    if (this.count) this.count.textContent = String(n);
    this.hide();
  }

  show(btn) {
    const p = this.people[Number(btn.dataset.id) - 1];
    this.read.innerHTML = `
      <span class="label label--v">One person</span>
      <dl>
        <dt>Role</dt><dd>${p.role}</dd>
        <dt>Years</dt><dd>${p.years}</dd>
        <dt>Where</dt><dd>${p.city} · ${p.tz}</dd>
        <dt>Language</dt><dd>${p.lang}</dd>
        <dt>We know</dt><dd>${p.known}</dd>
        <dt>We don't</dt><dd class="unknown">${p.unknown}</dd>
      </dl>
      <span class="label" style="margin-top:14px">Not contacted</span>`;

    const pr = this.plot.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const w = 250;
    let left = br.left - pr.left + 20;
    if (left + w > pr.width - 12) left = br.left - pr.left - w - 16;
    const top = Math.min(Math.max(br.top - pr.top - 12, 8), pr.height - 190);
    this.read.style.left = `${Math.max(left, 8)}px`;
    this.read.style.top = `${top}px`;
    this.read.classList.add('is-open');
  }

  hide() { this.read.classList.remove('is-open'); }
}

/* ── the comparison on the home page ──────────────────────────────────── */
/* One control, two fields. Moving the boundary of the search changes how
   many of the same people are inside it. Nothing is added or removed — the
   market does not change, only the part of it the company can see. */

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

  const draw = () => {
    const v = Number(input.value);                 // 8 … 72 — width of the search
    const h = 22 + v * 0.6;
    field.style.width = `${v}%`;
    field.style.height = `${Math.min(h, 86)}%`;
    let inside = 0;
    dots.forEach((d) => {
      const on = d._x < v && d._y > 100 - Math.min(h, 86);
      if (on) inside += 1;
      d.dataset.in = String(on);
    });
    inCount.textContent = String(inside);
    outCount.textContent = String(dots.length - inside);
  };

  input.addEventListener('input', draw);
  draw();
}

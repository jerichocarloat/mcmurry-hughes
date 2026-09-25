/* =========================================================================
   McMURRY & HUGHES — talent.js
   A controlled preview of people we have already spoken to.

   THE RULE THAT GOVERNS THIS FILE
     Anonymous first. Introduction later. No name, no photograph, no current
     employer, no contact detail — not on the page, not in the markup, not in
     this data file. Profiles are numbered. Identity is revealed inside the
     recruitment process, with the person's permission, and not before.
     If a future build breaks this, it breaks the brand.

   This is not a public database. It is a preview, and the only action on it
   is to ask about someone.

   To connect real data, replace `PEOPLE` with a feed from the ATS — see
   README, "Ready for real data". The shape is the contract: id, role, city,
   tz, years, lang, pay, available, spoke.
   ========================================================================= */

export const PEOPLE = [
  { id: '041', role: 'ERP consultant · S/4HANA',   city: 'Kraków',    tz: 'CET', years: 6,  lang: 'German B2',  pay: '€68k expected',        available: 'in 3 months', weeks: 12, spoke: 'Mar 2026' },
  { id: '017', role: 'Backend engineer · Go',      city: 'Wrocław',   tz: 'CET', years: 8,  lang: 'English C1', pay: '€78k expected',        available: 'now',         weeks: 0,  spoke: 'Apr 2026' },
  { id: '029', role: 'Second-line support',        city: 'Kraków',    tz: 'CET', years: 4,  lang: 'German C1',  pay: 'PLN 13k / mo expected', available: 'in 1 month',  weeks: 4,  spoke: 'Feb 2026' },
  { id: '008', role: 'Accountant · German GAAP',   city: 'Porto',     tz: 'WET', years: 9,  lang: 'German B2',  pay: '€54k expected',        available: 'in 2 months', weeks: 8,  spoke: 'Jan 2026' },
  { id: '036', role: 'Magento developer',          city: 'Valencia',  tz: 'CET', years: 5,  lang: 'English C1', pay: '€60k expected',        available: 'now',         weeks: 0,  spoke: 'May 2026' },
  { id: '044', role: 'Customer service · German',  city: 'Wrocław',   tz: 'CET', years: 3,  lang: 'German C1',  pay: 'PLN 10k / mo expected', available: 'in 2 weeks',  weeks: 2,  spoke: 'Jun 2026' },
  { id: '052', role: 'Frontend engineer · Angular',city: 'Brno',      tz: 'CET', years: 7,  lang: 'English C1', pay: '€64k expected',        available: 'in 1 month',  weeks: 4,  spoke: 'Jun 2026' },
  { id: '061', role: 'ERP consultant · S/4HANA',   city: 'Timișoara', tz: 'EET', years: 11, lang: 'German B1',  pay: '€72k expected',        available: 'in 3 months', weeks: 12, spoke: 'Jul 2026' },
  { id: '073', role: 'Project manager · e-commerce', city: 'Lisbon',  tz: 'WET', years: 10, lang: 'English C1', pay: '€70k expected',        available: 'in 2 months', weeks: 8,  spoke: 'Jul 2026' },
  { id: '080', role: 'Accountant · German GAAP',   city: 'Cluj',      tz: 'EET', years: 6,  lang: 'German C1',  pay: '€49k expected',        available: 'now',         weeks: 0,  spoke: 'Aug 2026' },
  { id: '088', role: 'Second-line support',        city: 'Gdańsk',    tz: 'CET', years: 5,  lang: 'German B2',  pay: 'PLN 12k / mo expected', available: 'in 2 weeks',  weeks: 2,  spoke: 'Aug 2026' },
  { id: '094', role: 'Backend engineer · Go',      city: 'Bratislava',tz: 'CET', years: 12, lang: 'English C1', pay: '€84k expected',        available: 'in 1 month',  weeks: 4,  spoke: 'Sep 2026' },
];

const EXPERIENCE = [
  { v: '', l: 'Any experience' },
  { v: '3', l: '3+ years' },
  { v: '5', l: '5+ years' },
  { v: '10', l: '10+ years' },
];
const AVAILABILITY = [
  { v: '', l: 'Any availability' },
  { v: '0', l: 'Now' },
  { v: '4', l: 'Within 1 month' },
  { v: '12', l: 'Within 3 months' },
];

const uniq = (key) => [...new Set(PEOPLE.map((p) => p[key]))].sort();

function card(p) {
  const el = document.createElement('article');
  el.className = 'tcard';
  el.dataset.id = p.id;
  const ref = `Talent #${p.id}`;
  const ask = 'Ask about this candidate';
  el.innerHTML = `
    <span class="label">${ref}</span>
    <h3 class="tcard__role">${p.role}</h3>
    <p class="tcard__meta">${p.city} · ${p.tz}<br>${p.years} years<br>${p.lang}<br>${p.pay}</p>
    <div class="tcard__foot">
      <span class="avail">Available ${p.available}</span>
      <button class="act" type="button" data-ask="${p.id}" aria-label="${ask}: ${ref.toLowerCase()}, ${p.role}">${ask}</button>
    </div>`;
  return el;
}

export function talent(root, opts = {}) {
  const grid = root.querySelector('[data-talent-grid]');
  const countEl = root.querySelector('[data-talent-count]');
  const empty = root.querySelector('[data-talent-empty]');
  const limit = Number(root.dataset.limit) || PEOPLE.length;
  const list = PEOPLE.slice(0, limit);

  const cards = list.map((p) => {
    const el = card(p);
    grid.appendChild(el);
    return el;
  });

  /* filter controls, built from the data so they can never drift out of it */
  const selects = {};
  const bar = root.querySelector('[data-talent-filters]');
  if (bar) {
    const defs = [
      ['role', 'Role', [{ v: '', l: 'Any role' }, ...uniq('role').map((v) => ({ v, l: v }))]],
      ['city', 'Location', [{ v: '', l: 'Any location' }, ...uniq('city').map((v) => ({ v, l: v }))]],
      ['years', 'Experience', EXPERIENCE],
      ['lang', 'Language', [{ v: '', l: 'Any language' }, ...uniq('lang').map((v) => ({ v, l: v }))]],
      ['weeks', 'Availability', AVAILABILITY],
    ];
    defs.forEach(([key, label, options]) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      wrap.style.marginBottom = '0';
      const id = `f-${key}`;
      wrap.innerHTML = `<label class="label" for="${id}">${label}</label>
        <select id="${id}">${options.map((o) => `<option value="${o.v}">${o.l}</option>`).join('')}</select>`;
      bar.appendChild(wrap);
      const sel = wrap.querySelector('select');
      selects[key] = sel;
      sel.addEventListener('change', run);
    });
  }

  function run() {
    let n = 0;
    cards.forEach((el, i) => {
      const p = list[i];
      const ok =
        (!selects.role?.value || p.role === selects.role.value) &&
        (!selects.city?.value || p.city === selects.city.value) &&
        (!selects.lang?.value || p.lang === selects.lang.value) &&
        (!selects.years?.value || p.years >= Number(selects.years.value)) &&
        (!selects.weeks?.value || p.weeks <= Number(selects.weeks.value));
      el.hidden = !ok;
      if (ok) n += 1;
    });
    if (countEl) countEl.textContent = String(n);
    if (empty) empty.hidden = n !== 0;
  }

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask]');
    if (!b) return;
    opts.onAsk?.(b.dataset.ask);
  });

  run();
  return { run };
}

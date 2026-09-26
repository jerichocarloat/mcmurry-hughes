/* =========================================================================
   McMURRY & HUGHES — calculator.js                PROTOTYPE · FOR REVIEW
   The cost of an open role, then a diagnosis of the search.

   WHAT IT IS FOR
     To make the cost of waiting visible in a number a finance person would
     accept, and then to ask the one question that matters to us: is the
     search the constraint, or is something else? It is allowed to tell a
     visitor that we are not the answer.

   THE FORMULA (shown on the page, in full, every time)
     daily cost  = salary x (1 + employer on-cost) / 220 working days x m
     m (value multiplier): low end 1.0 for every role; high end
       2.0 revenue-generating · 1.5 delivery / operational · 1.25 support
     Days open are calendar days, turned into working days at 220 / 365.
     The multiplier never exceeds 2.0 — above that a finance team should be
     involved (Dr John Sullivan, cost-of-vacancy formulas). The on-cost
     default of 28% is the German employer-contribution factor used by the
     kooku calculator; the visitor can change it.

   WHAT IT NEVER DOES
     Ask for an email to show the number. Count a figure up. Quote a
     time-to-hire. Claim that anyone outside the search is available.
     Show a number more precisely than the method supports: daily figures are
     rounded to 10, totals to 100 (to 1,000 above 100,000).
   ========================================================================= */

const WORKDAYS = 220;
const M = { revenue: 2.0, delivery: 1.5, support: 1.25 };
const ROLE_LABEL = { revenue: 'revenue-generating', delivery: 'delivery / operational', support: 'support' };

const round = (n, to) => Math.round(n / to) * to;
const roundTotal = (n) => (n >= 100000 ? round(n, 1000) : round(n, 100));

export function calculator(root, { contactHref = 'contact.html' } = {}) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];

  const out = $('[data-calc-out]');
  const empty = $('[data-calc-empty]');
  const work = $('[data-calc-work]');
  const verdicts = $$('[data-verdict]');
  const waitMsg = $('[data-calc-wait]');

  const money = (cur) => new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: cur, maximumFractionDigits: 0,
  });

  const read = () => {
    const v = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
    const pick = (name) => root.querySelector(`[name="${name}"]:checked`)?.value ?? '';
    return {
      role: v('c-role').trim(),
      salary: Number(String(v('c-salary')).replace(/[^\d.]/g, '')) || 0,
      cur: v('c-cur') || 'EUR',
      days: Math.max(Number(v('c-days')) || 0, 0),
      type: pick('c-type'),
      oncost: Math.min(Math.max(Number(v('c-oncost')), 0), 60),
      where: $$('[name="c-where"]:checked').map((i) => i.value),
      apps: pick('c-apps'),
      employ: pick('c-employ'),
      remote: pick('c-remote'),
      often: pick('c-often'),
    };
  };

  const cost = (a) => {
    if (!a.salary || !a.type) return null;
    const base = (a.salary * (1 + a.oncost / 100)) / WORKDAYS;
    const lo = base * 1.0;
    const hi = base * M[a.type];
    const soFarDays = (a.days * WORKDAYS) / 365;
    const nextDays = (60 * WORKDAYS) / 365;
    return {
      lo: round(lo, 10), hi: round(hi, 10),
      soLo: roundTotal(lo * soFarDays), soHi: roundTotal(hi * soFarDays),
      nxLo: roundTotal(lo * nextDays), nxHi: roundTotal(hi * nextDays),
      soFarDays: Math.round(soFarDays), nextDays: Math.round(nextDays),
    };
  };

  const range = (f, a, b) => (a === b ? f.format(a) : `${f.format(a)} to ${f.format(b)}`);

  /* the diagnosis: order matters. The honest exits come first. */
  const diagnose = (a) => {
    if (!a.apps || !a.employ || !a.remote) return null;
    if (a.remote === 'onsite' && a.employ === 'no') return 'local';
    if (a.apps === '3') return 'process';
    if (a.employ === 'no') return 'employ';
    return 'search';
  };

  const draw = () => {
    const a = read();
    const f = money(a.cur);
    const c = cost(a);

    const win = root.querySelector('[data-calc-window]');
    if (win) {
      const W = { city: 22, country: 36, remote: 48, abroad: 66 };
      const w = a.where.length ? Math.max(...a.where.map((k) => W[k] || 16)) : 16;
      const h = Math.min(32 + w * 0.6, 86);
      const box = win.querySelector('[data-calc-searched]');
      box.style.width = `${w}%`; box.style.height = `${h}%`;
      const dots = [...win.querySelectorAll('.compare__dot')];
      let inside = 0;
      dots.forEach((d) => {
        const on = parseFloat(d.style.left) < w && parseFloat(d.style.top) > 100 - h;
        d.dataset.in = String(on); if (on) inside += 1;
      });
      const i = root.querySelector('[data-cw-in]'); if (i) i.textContent = String(inside);
      const o = root.querySelector('[data-cw-out]'); if (o) o.textContent = String(dots.length - inside);
    }

    if (!c) {
      out.hidden = true; empty.hidden = false;
    } else {
      out.hidden = false; empty.hidden = true;
      $('[data-o-day]').textContent = range(f, c.lo, c.hi);
      $('[data-o-so]').textContent = a.days ? range(f, c.soLo, c.soHi) : 'Add the days open';
      $('[data-o-next]').textContent = range(f, c.nxLo, c.nxHi);
      $('[data-o-sodays]').textContent = a.days ? `${a.days} calendar days = about ${c.soFarDays} working days` : '';
      work.innerHTML = `<code>${f.format(a.salary)} × ${(1 + a.oncost / 100).toFixed(2)} on-cost ÷ ${WORKDAYS} working days
        × 1.0 to ${M[a.type].toFixed(2)} (${ROLE_LABEL[a.type]})</code>
        <p>The low end counts only what the role costs you to employ. The high end assumes the role produces
        ${M[a.type].toFixed(2)} times its cost, a multiplier finance teams usually accept for ${ROLE_LABEL[a.type]} work
        without further justification. Next 60 days = about ${c.nextDays} working days. It is an estimate, not an invoice.</p>`;
    }

    const d = diagnose(a);
    verdicts.forEach((v) => { v.hidden = v.dataset.verdict !== d; });
    waitMsg.hidden = Boolean(d);

    /* the searched places, said back in the "search" verdict */
    const whereEl = $('[data-v-where]');
    if (whereEl) {
      const labels = a.where.map((w) => root.querySelector(`[name="c-where"][value="${w}"] + label`)?.textContent.toLowerCase());
      whereEl.textContent = labels.length
        ? `You have searched ${labels.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`
        : '';
    }
    const oftenEl = $('[data-v-often]');
    if (oftenEl) oftenEl.hidden = a.often !== 'several';

    /* hand the answers to the snapshot request, in the link itself — no
       storage, nothing kept after the visitor leaves */
    const q = new URLSearchParams();
    if (a.role) q.set('role', a.role);
    if (a.employ) q.set('employ', a.employ);
    if (a.apps) q.set('apps', a.apps);
    if (a.days) q.set('days', String(a.days));
    q.set('ask', 'snapshot');
    root.querySelectorAll('[data-calc-cta]').forEach((el) => {
      el.setAttribute('href', `${contactHref}?${q.toString()}`);
    });
  };

  root.addEventListener('input', draw);
  root.addEventListener('change', draw);
  draw();
}

/* The contact form reads what the calculator passed. Only these keys, only
   into these fields, only as the visitor's own starting answers. */
export function prefill(form, params) {
  if (!form || !params) return;
  const role = params.get('role');
  if (role) { const el = form.querySelector('[name="role"]'); if (el && !el.value) el.value = role; }
  const map = { employ: { yes: 'Yes', eor: 'Via a partner or EOR', no: 'No' }, apps: { 0: '0', 1: '1 to 2', 3: '3 or more' } };
  ['employ', 'apps'].forEach((k) => {
    const v = map[k][params.get(k)];
    if (!v) return;
    const el = form.querySelector(`[name="${k}"][value="${v}"]`);
    if (el) el.checked = true;
  });
  const days = params.get('days');
  if (days) { const el = form.querySelector('[name="open"]'); if (el && !el.value) el.value = `${days} days`; }
  const ask = params.get('ask');
  const ASK = { snapshot: 'Qualified Market Snapshot', map: 'A priced Market Map', talk: 'A conversation about the role' };
  if (ask && ASK[ask]) { const el = form.querySelector(`[name="ask"][value="${ASK[ask]}"]`); if (el) el.checked = true; }
  const note = document.querySelector('[data-prefilled]');
  if (note && (role || params.get('employ'))) note.hidden = false;
}

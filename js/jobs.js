/* =========================================================================
   McMURRY & HUGHES — jobs.js
   The roles being worked now. For the people we want to call, not for clients.

   THE RULES THIS PAGE KEEPS
     Every role is one we are really working. The pay range is on the page —
     no hidden band, no "competitive". No login. No CV upload form. Every
     application gets an answer.

   THE ROLES BELOW ARE ILLUSTRATIVE and labelled as such on the page.
   Replace `ROLES` with the live requisition feed — see README, "Ready for
   real data". The shape is the contract.
   ========================================================================= */

export const ROLES = [
  {
    id: 'erp-s4hana',
    role: 'ERP consultant · S/4HANA',
    where: 'Remote · CET hours',
    lang: 'German B2',
    pay: '€62–74k',
    fit: 'You have finished two migrations in manufacturing.',
    opened: 'Aug 2026',
  },
  {
    id: 'support-de',
    role: 'Second-line support',
    where: 'Kraków or Wrocław',
    lang: 'German C1',
    pay: 'PLN 11–14k / mo',
    fit: 'You have handled German-language support for a software product.',
    opened: 'Sep 2026',
  },
  {
    id: 'backend-go',
    role: 'Backend engineer · Go',
    where: 'Remote · EU',
    lang: 'English',
    pay: '€70–85k',
    fit: 'You have worked in payments and been on call for it.',
    opened: 'Jul 2026',
  },
  {
    id: 'accountant-de',
    role: 'Accountant · German GAAP',
    where: 'Remote · CET hours',
    lang: 'German C1',
    pay: '€48–58k',
    fit: 'You have run month-end close for a German entity.',
    opened: 'Sep 2026',
  },
  {
    id: 'magento',
    role: 'Magento developer',
    where: 'Remote · CET hours',
    lang: 'English',
    pay: '€55–66k',
    fit: 'You know Adobe Commerce 2.4 and have one migration to talk about.',
    opened: 'Jun 2026',
  },
];

function row(r) {
  const tr = document.createElement('tr');
  tr.dataset.id = r.id;
  tr.innerHTML = `
    <td data-l="Role"><span class="role">${r.role}</span></td>
    <td data-l="Where">${r.where}</td>
    <td data-l="Language">${r.lang}</td>
    <td data-l="Pay"><span class="pay">${r.pay}</span></td>
    <td data-l="Why you may fit">${r.fit}</td>
    <td data-l=""><button class="act" type="button" data-apply="${r.id}">Apply for this role</button></td>`;
  return tr;
}

export function jobs(root, opts = {}) {
  const body = root.querySelector('[data-jobs-body]');
  const countEl = root.querySelector('[data-jobs-count]');
  const limit = Number(root.dataset.limit) || ROLES.length;
  const list = ROLES.slice(0, limit);

  const rows = list.map((r) => {
    const tr = row(r);
    body.appendChild(tr);
    return tr;
  });

  const filters = [...root.querySelectorAll('.filter[data-lang]')];
  let active = '';

  const run = () => {
    let n = 0;
    rows.forEach((tr, i) => {
      const ok = !active || list[i].lang.startsWith(active);
      tr.hidden = !ok;
      if (ok) n += 1;
    });
    if (countEl) countEl.textContent = String(n);
    filters.forEach((f) => f.setAttribute('aria-pressed', String(f.dataset.lang === active)));
  };

  filters.forEach((f) => f.addEventListener('click', () => {
    active = f.dataset.lang === active ? '' : f.dataset.lang;
    run();
  }));

  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-apply]');
    if (!b) return;
    const r = list.find((x) => x.id === b.dataset.apply);
    opts.onApply?.(r);
  });

  run();
  return { run };
}

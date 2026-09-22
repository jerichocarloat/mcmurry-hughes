/* =========================================================================
   McMURRY & HUGHES — main.js
   Entry point. Boots the interface, then loads a page module only if that
   page's markup is present. Nothing on this site depends on JavaScript to be
   readable: every page is complete HTML before this file runs.

   No framework. No bundler. No third-party library — Three.js and GSAP were
   both considered and neither earns its weight here: the window, the sheets
   and the cards are CSS 3D transforms on a handful of planes, and the motion
   is four transitions. See README, "External dependencies: none".
   ========================================================================= */

import {
  reveal, lines, depth, depthAll, parallax, rail, reduced,
  arrive, drift, magnet, tilt, scrollDepth, breathe, reach, pull, cssScroll,
} from './motion.js';

/* ── navigation ───────────────────────────────────────────────────────── */

function nav() {
  const el = document.querySelector('.nav');
  if (!el) return;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      el.dataset.scrolled = String(window.scrollY > 24);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Below 768px the five links move into a panel. Five items in, five items
     out — the panel never reveals anything the bar was not already offering. */
  const toggle = el.querySelector('.nav__toggle');
  const panel = el.querySelector('.nav__panel');
  if (!toggle || !panel) return;

  const set = (open) => {
    el.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  set(false);

  toggle.addEventListener('click', () => set(el.dataset.open !== 'true'));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.dataset.open === 'true') { set(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 769px)').addEventListener('change', (m) => { if (m.matches) set(false); });
}

/* ── forms ────────────────────────────────────────────────────────────── */
/* Every form here does something real. With no endpoint configured it
   composes the message and hands it to the visitor's mail client addressed
   to the named person — which is how M&H says it answers, and is honest
   about where the message goes. Set data-endpoint on the form to POST as
   JSON instead; see README. */

const CONTACT = 'tino@mcmurry-hughes.com';

/* ── the attachment ───────────────────────────────────────────────────── */
/* A CV or a job description, dropped or chosen, stated back as a record.
   Checked here for type and size so nobody discovers a 40MB scan was
   refused after they hit send. */

const FILE_MAX = 10 * 1024 * 1024;
const FILE_OK = ['pdf', 'doc', 'docx', 'rtf', 'odt', 'txt', 'pages'];

const readable = (n) => (n < 1024 * 1024
  ? `${Math.max(Math.round(n / 1024), 1)} KB`
  : `${(n / 1024 / 1024).toFixed(1)} MB`);

function attachments(root = document) {
  root.querySelectorAll('[data-drop]').forEach((drop) => {
    const input = drop.querySelector('input[type="file"]');
    const field = drop.closest('.field');
    const nameEl = drop.querySelector('[data-drop-name]');
    const sizeEl = drop.querySelector('[data-drop-size]');
    const err = field?.querySelector('.field__err');
    if (!input) return;

    const fail = (msg) => {
      input.value = '';
      drop.dataset.has = 'false';
      if (field) field.dataset.invalid = 'true';
      if (err) err.textContent = msg;
    };

    const show = () => {
      const file = input.files?.[0];
      if (!file) { drop.dataset.has = 'false'; return; }
      const ext = file.name.split('.').pop().toLowerCase();
      if (!FILE_OK.includes(ext)) return fail('That file type is not one we can open. Use PDF, DOC, DOCX, ODT or RTF');
      if (file.size > FILE_MAX) return fail(`That file is ${readable(file.size)}. The limit is 10 MB`);
      nameEl.textContent = file.name;
      sizeEl.textContent = `${ext.toUpperCase()} · ${readable(file.size)}`;
      drop.dataset.has = 'true';
      if (field) field.dataset.invalid = 'false';
    };

    input.addEventListener('change', show);

    drop.querySelector('[data-drop-clear]')?.addEventListener('click', () => {
      input.value = '';
      drop.dataset.has = 'false';
      input.focus();
    });

    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => {
      e.preventDefault();
      drop.dataset.over = 'true';
    }));
    ['dragleave', 'dragend', 'drop'].forEach((t) => drop.addEventListener(t, () => {
      drop.dataset.over = 'false';
    }));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      show();
    });
  });
}

function validate(form) {
  let ok = true;
  form.querySelectorAll('[required]').forEach((input) => {
    const field = input.closest('.field') || input.closest('fieldset');
    const valid = input.type === 'radio'
      ? form.querySelector(`input[name="${input.name}"]:checked`) !== null
      : input.value.trim() !== '' && input.checkValidity();
    if (field) field.dataset.invalid = String(!valid);
    if (!valid && ok) { input.focus(); ok = false; }
  });
  return ok;
}

function compose(form) {
  const data = new FormData(form);
  const lines_ = [];
  form.querySelectorAll('.field, fieldset').forEach((field) => {
    const input = field.querySelector('input, select, textarea');
    if (!input) return;
    const label = field.querySelector('label, legend')?.textContent.trim() ?? input.name;
    /* a file cannot travel in a mailto, so the message names it and the
       status line asks the sender to attach it — better than pretending */
    const value = input.type === 'file'
      ? (input.files?.[0] ? `${input.files[0].name} (attached separately)` : '')
      : (data.get(input.name) ?? '');
    if (String(value).trim()) lines_.push(`${label.toUpperCase()}: ${value}`);
  });
  return lines_.join('\n');
}

const fileIn = (form) => [...form.querySelectorAll('input[type="file"]')]
  .map((i) => i.files?.[0]).find(Boolean) ?? null;

function forms() {
  document.querySelectorAll('form[data-form]').forEach((form) => {
    const status = form.querySelector('.form__status');

    form.addEventListener('input', (e) => {
      const field = e.target.closest('.field, fieldset');
      if (field?.dataset.invalid === 'true') field.dataset.invalid = 'false';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate(form)) {
        if (status) {
          status.dataset.kind = 'error';
          status.classList.add('is-on');
          status.textContent = 'Some answers are missing. The fields are marked.';
        }
        return;
      }

      const subject = form.dataset.subject || 'McMurry & Hughes';
      const body = compose(form);
      const endpoint = form.dataset.endpoint;

      const file = fileIn(form);

      if (endpoint) {
        try {
          /* multipart when a document is attached, JSON when it is not */
          const res = await fetch(endpoint, file
            ? { method: 'POST', body: new FormData(form) }
            : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(Object.fromEntries(new FormData(form))),
            });
          if (!res.ok) throw new Error(res.statusText);
        } catch (err) {
          if (status) {
            status.dataset.kind = 'error';
            status.classList.add('is-on');
            status.textContent = 'That did not send. Write to ' + CONTACT + ' and it will be answered the same way.';
          }
          return;
        }
      } else {
        window.location.href =
          `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }

      if (status) {
        status.dataset.kind = 'ok';
        status.classList.add('is-on');
        /* If the message went to a mail client, the file did not go with it.
           Say so plainly rather than letting someone believe their CV was
           sent. With an endpoint configured, it went with the form. */
        const note = (!endpoint && file)
          ? `<p style="margin-top:10px"><b>Attach ${file.name} to that email before you send it.</b> A mail
             client cannot take the file from a web page.</p>`
          : '';
        status.innerHTML = `<span class="label label--ink">Sent</span>
          ${note}
          <p style="margin-top:10px">Tino Langner replies within one working day, by name.
          If your mail client did not open, write to
          <a class="link" href="mailto:${CONTACT}">${CONTACT}</a>${file ? ', with the file attached' : ''}.</p>`;
      }
      form.querySelector('button[type="submit"]')?.setAttribute('disabled', '');
    });
  });
}

/* ── dialogs ──────────────────────────────────────────────────────────── */

function dialogs() {
  document.querySelectorAll('dialog.dialog').forEach((d) => {
    d.querySelector('.dialog__close')?.addEventListener('click', () => d.close());
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });
}

export function openDialog(id, fill) {
  const d = document.getElementById(id);
  if (!d) return;
  fill?.(d);
  if (typeof d.showModal === 'function') d.showModal();
  else d.setAttribute('open', '');
  d.querySelector('input, select, textarea, button')?.focus();
}

/* ── page modules ─────────────────────────────────────────────────────── */
/* Loaded on demand. A visitor reading the jobs page never downloads the map. */

async function pages() {
  const mapRoot = document.querySelector('[data-map]');
  const compareRoot = document.querySelector('[data-compare]');
  if (mapRoot || compareRoot) {
    const m = await import('./market-map.js');

    if (mapRoot) {
      new m.MarketMap(mapRoot);
      const plot = mapRoot.querySelector('.map__plot');
      /* the field leans under the pointer; the people on it drift, and the
         ones near the pointer notice it */
      tilt(plot, { max: 2, area: mapRoot.querySelector('.map__plotwrap') });
      mapRoot.querySelector('.map__plotwrap')
        ?.addEventListener('pointerenter', () => plot.classList.add('is-live'));
      mapRoot.querySelector('.map__plotwrap')
        ?.addEventListener('pointerleave', () => plot.classList.remove('is-live'));
      drift('.map__plot .marker', { amp: 2.4, root: mapRoot });
      magnet(plot, '.marker', { radius: 150, lift: 0.7, pull: 6 });
      reach(plot);
    }

    if (compareRoot) {
      m.comparison(compareRoot);
      const plot = compareRoot.querySelector('.compare__plot');
      drift('.compare__dot', { amp: 2.8, root: compareRoot });
      magnet(plot, '.compare__dot', { radius: 150, lift: 0.6, pull: 5 });
    }
  }

  const talentRoot = document.querySelector('[data-talent]');
  if (talentRoot) {
    const t = await import('./talent.js');
    t.talent(talentRoot, {
      onAsk: (id) => {
        const target = document.getElementById('ask');
        if (!target) { window.location.href = `talent.html#ask-${id}`; return; }
        openDialog('ask', (d) => {
          d.querySelector('[data-ref]').textContent = `Talent #${id}`;
          d.querySelector('input[name="candidate"]').value = `Talent #${id}`;
        });
      },
    });
  }

  const jobsRoot = document.querySelector('[data-jobs]');
  if (jobsRoot) {
    const j = await import('./jobs.js');
    j.jobs(jobsRoot, {
      onApply: (r) => {
        if (!document.getElementById('apply')) { window.location.href = `jobs.html#${r.id}`; return; }
        openDialog('apply', (d) => {
          d.querySelector('[data-ref]').textContent = r.role;
          d.querySelector('input[name="role"]').value = r.role;
        });
      },
    });
  }
}

/* ── boot ─────────────────────────────────────────────────────────────── */

function boot() {
  nav();
  rail();
  reveal();
  lines();
  /* the browser does the scroll work where it can — see motion.css */
  if (!cssScroll) parallax();
  pull('.btn--primary', { radius: 130, max: 7 });
  forms();
  attachments();
  dialogs();

  /* The hero window follows the pointer across the whole hero, which is what
     makes it read as an object in the room rather than a graphic. Then the
     people inside it arrive one at a time, never quite settle, notice a
     pointer that comes near them, and the whole object keeps turning as the
     page scrolls past it. */
  const win = document.querySelector('.window');
  if (win) {
    const obj = win.querySelector('.window__obj');
    depth(obj, { max: 5, shadow: 16, area: win.closest('.hero') || win });
    if (!cssScroll) scrollDepth(obj, { max: 5, rise: 26 });
    breathe(obj, { max: 1.1 });
    arrive(win.querySelector('.window__people'), { step: 130, start: 900, max: 1100 });
    magnet(win, '.person', { radius: 210, lift: 0.95, pull: 9 });
  }
  drift('.window__people .person', { amp: 3.4 });
  drift('.window__insiders .person', { amp: 1.6 });
  drift('.sheet__mini .person', { amp: 1.8 });

  depthAll('.sheet', { max: 3.4, shadow: 12 });
  depthAll('.tcard', { max: 2.4, shadow: 9 });

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  pages();

  if (reduced.matches) document.documentElement.dataset.reduced = 'true';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* =========================================================================
   McMURRY & HUGHES — main.js
   Entry point. Boots the interface, then loads a page module only if that
   page's markup is present. Nothing on this site depends on JavaScript to be
   readable: every page is complete HTML before this file runs.

   No framework. No bundler. No third-party library — Three.js and GSAP were
   both considered and neither earns its weight here: the window, the sheets
   and the map are CSS 3D transforms on a handful of planes, and the motion
   is a few transitions. See README, "External dependencies: none".
   ========================================================================= */

import {
  reveal, rail, reduced, drift,
} from './motion.js';

/* ── navigation ───────────────────────────────────────────────────────── */

function nav() {
  const el = document.querySelector('.nav');
  if (!el) return;

  let ticking = false;
  let lastY = window.scrollY;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      el.dataset.scrolled = String(y > 24);
      /* hide going down (after the first screen), show going up */
      if (el.dataset.open === 'true' || el.contains(document.activeElement) || y < 240) el.dataset.hidden = 'false';
      else if (y - lastY > 6) el.dataset.hidden = 'true';
      else if (lastY - y > 6) el.dataset.hidden = 'false';
      lastY = y;
      ticking = false;
    });
  };
  el.addEventListener('focusin', () => { el.dataset.hidden = 'false'; });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Below 1100px the items move into a panel, grouped by audience. The same
     items in, the same items out — the panel never reveals anything the bar
     was not already offering. */
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
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (m) => { if (m.matches) set(false); });
}

/* ── forms ────────────────────────────────────────────────────────────── */
/* With no endpoint configured, a form here does not send anything. It
   composes an email and hands it to the visitor's own email program,
   addressed to the named person, and the confirmation says exactly that:
   a draft is open, nothing has been sent, and any file has to be attached
   by hand. Visitors on webmail may get no draft at all, so the confirmation
   also offers to copy the message.
   Set data-endpoint on the form to POST instead; see README. Each form also
   carries action="mailto:…" method="post" so that without JavaScript it
   still goes to the same person and never puts personal data in a URL. */

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
  /* hidden context first — which profile or role the message is about */
  form.querySelectorAll('input[type="hidden"]').forEach((h) => {
    if (h.value.trim()) lines_.push(`${h.name.toUpperCase()}: ${h.value}`);
  });
  form.querySelectorAll('.field, fieldset').forEach((field) => {
    if (field.hidden) return;
    const input = field.querySelector('input, select, textarea');
    if (!input) return;
    const label = (field.querySelector('label, legend')?.textContent.trim() ?? input.name)
      .replace(/\s*\(optional\)$/i, '');
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
      const attach = form.dataset.attach;              // e.g. "your CV"

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
            status.textContent = `This did not send. Please write to ${CONTACT} instead.`;
          }
          return;
        }
        if (status) {
          status.dataset.kind = 'ok';
          status.classList.add('is-on');
          status.innerHTML = `<span class="label label--ink">Sent</span>
            <p style="margin-top:10px">Your message has been sent to Tino Langner, who will reply by email.</p>`;
        }
        form.querySelector('button[type="submit"]')?.setAttribute('disabled', '');
        return;
      }

      /* No endpoint: hand the message to the visitor's own email program.
         Nothing has been sent, and the confirmation says so. */
      window.location.href =
        `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      if (status) {
        status.dataset.kind = 'ok';
        status.classList.add('is-on');
        const need = attach || (file ? file.name : '');
        status.innerHTML = `<span class="label label--ink">Not sent yet · your email draft is ready</span>
          <p style="margin-top:10px">Your email program should now show a draft to
          <a class="link" href="mailto:${CONTACT}">${CONTACT}</a> with your answers in it.
          <b>Nothing has been sent until you press send there.</b></p>
          ${need ? `<p style="margin-top:10px"><b>Attach ${need} to that email before you send it.</b>
          A web page cannot add the file for you.</p>` : ''}
          <p style="margin-top:10px">No draft appeared? Copy your message and send it from any email account.</p>
          <button class="act" type="button" data-copy style="margin-top:12px">Copy my message</button>`;
        const copy = status.querySelector('[data-copy]');
        copy?.addEventListener('click', async () => {
          const text = `To: ${CONTACT}\nSubject: ${subject}\n\n${body}`;
          try {
            await navigator.clipboard.writeText(text);
            copy.textContent = 'Copied. Paste it into a new email';
          } catch {
            copy.textContent = `Copy failed. Please write to ${CONTACT}`;
          }
        });
      }
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
  d.querySelector('input:not([type="hidden"]), select, textarea')?.focus();
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
      drift('.map__plot .marker', { amp: 9, seed: 76, min: 3.8, max: 5.6 });
    }
    if (compareRoot) {
      m.comparison(compareRoot);
      drift('.compare__dot', { amp: 7, seed: 54, min: 3.8, max: 5.6 });
    }
  }

  const talentRoot = document.querySelector('[data-talent]');
  if (talentRoot) {
    const t = await import('./talent.js');
    const ask = (id) => {
      /* the home page shows the cards but not the form: go to the talent
         page, which opens the question for that profile */
      if (!document.getElementById('ask')) { window.location.href = `talent.html#ask-${id}`; return; }
      const ref = `Talent #${id}`;
      openDialog('ask', (d) => {
        d.querySelector('[data-ref]').textContent = ref;
        d.querySelector('input[name="profile"]').value = ref;
      });
    };
    t.talent(talentRoot, { onAsk: ask });
    const m = location.hash.match(/^#ask-(\d+)$/);
    if (m && t.PEOPLE.some((p) => p.id === m[1])) ask(m[1]);
  }

  const jobsRoot = document.querySelector('[data-jobs]');
  if (jobsRoot) {
    const j = await import('./jobs.js');
    const fill = (ref, heading) => (d) => {
      d.querySelector('[data-ref]').textContent = ref;
      d.querySelector('input[name="role"]').value = ref;
      d.querySelector('#apply-h').textContent = heading;
    };
    j.jobs(jobsRoot, {
      onApply: (r) => openDialog('apply', fill(r.role, 'Apply for this role')),
    });
    document.querySelector('[data-apply-general]')
      ?.addEventListener('click', () => openDialog('apply', fill('General application', 'Send your details')));
  }
}

/* ── boot ─────────────────────────────────────────────────────────────── */

function boot() {
  /* A page opens at its top unless the link names a section. Without this,
     a reload — or a page shown inside a frame that keeps its own scroll —
     reopened the evidence page at the foot of the record. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* the scrollbar's width, so fixed things (the rail) can find the column */
  const sbw = () => document.documentElement.style.setProperty(
    '--sbw', `${window.innerWidth - document.documentElement.clientWidth}px`);
  sbw();
  window.addEventListener('resize', sbw, { passive: true });

  nav();
  rail();
  reveal();
  forms();
  attachments();
  dialogs();

  /* The people squares drift, everywhere they appear. The hero's paths are
     in its markup; the rest are seeded here. The frames never move. */
  drift('.window__people .person', { amp: 15, seed: 11, min: 4.6, max: 6.8 });
  drift('.window__insiders .person', { amp: 7, seed: 12, min: 4.6, max: 6.8 });
  drift('.mini__p', { amp: 12, seed: 3, min: 3.8, max: 5.6 });
  drift('.mini__g', { amp: 7, seed: 4, min: 3.8, max: 5.6 });
  drift('.sheet__mini .person', { amp: 7, seed: 9, min: 3.8, max: 5.6 });


  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  pages();

  if (reduced.matches) document.documentElement.dataset.reduced = 'true';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

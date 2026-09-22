# McMurry & Hughes — website

Production website for McMurry & Hughes, an outside recruiting desk.
Static HTML5, CSS and ES2022 modules. No framework, no bundler, no runtime
dependency of any kind.

Built against **MH Brand System, Edition 1.0 (September 2026)** — the brand
book, the colour, type, logo and photography specifications, and the approved
website templates. Nothing in the strategy or the identity was changed.

---

## Run it locally

Any static server will do. The pages use ES modules, so `file://` will not
work — the module scripts are blocked by CORS.

```bash
cd mh-site
python3 -m http.server 8000      # → http://localhost:8000
# or
npx serve .
```

That is the whole build step. There isn't one.

---

## File tree

```
/index.html                 home — the ten-section narrative
/how-we-work.html           the desk, the employer journey, fit, what happens next
/evidence.html              the live market map + the counted placement record
/talent.html                anonymous candidate preview, filterable
/jobs.html                  open roles with pay, and the application flow
/contact.html               "Show us the role"

/css/
  main.css                  fonts, tokens, base type, layout, rail, nav, footer, motion primitives
  components.css            the window, the map, the ledger, plates, sheets, talent, jobs, forms, attachments
  responsive.css            1440 · 1280 · 1024 · 768 · 430 · 390, coarse pointer, print
  motion.css                the advanced layer: view transitions, scroll-driven animation, the reach

/js/
  main.js                   entry point: nav, forms, dialogs, boot; lazy-loads page modules
  motion.js                 reveal · lines · depth · parallax · arrive · drift · magnet · tilt · breathe · reach · pull · the rail
  market-map.js             the market map component + the home-page comparison
  talent.js                 the talent preview and its filters
  jobs.js                   the jobs ledger and its filters

/assets/
  fonts/                    Archivo 400/500/600/700 + IBM Plex Mono 400/500, latin + latin-ext (12 WOFF2)
  images/                   the 12 approved photographs, as WebP at 640/1024/1536 + a 1024 JPEG fallback
  icons/                    symbol, lockups, wordmark, favicon, and the four proprietary graphic devices
  documents/                drop real PDFs here (market map, proposal, candidate summary) when they exist

/favicon.ico
/robots.txt
/sitemap.xml
/README.md
```

---

## Deploy

The site is static files. Upload the directory as-is.

* **Netlify / Vercel / Cloudflare Pages** — drag the folder in, or point the
  project at the repo. No build command, publish directory `.`.
* **S3 + CloudFront** — `aws s3 sync . s3://<bucket> --delete`, index document
  `index.html`. Set `Cache-Control: public, max-age=31536000, immutable` on
  `/assets/fonts/*` and `/assets/images/*`, and `no-cache` on the HTML.
* **Any shared host** — FTP the folder into the web root.

Then: point `www.mcmurry-hughes.com` at it, force HTTPS, and confirm the
canonical URLs in each `<head>` match the live host.

Serve `.woff2` as `font/woff2` and `.webp` as `image/webp`. Almost every host
does this already; a very old Apache may need `AddType`.

---

## External dependencies

**None.** No CDN, no analytics, no fonts fetched from Google, no tracker, no
cookie. Everything the site needs is in this folder, which is also why there is
no cookie banner.

Three.js and GSAP were both considered and neither earns its place:

* The hero window, the document sheets and the candidate cards are a handful of
  CSS 3D planes with pointer-driven `rotateX/rotateY` and a shadow that moves
  with them. WebGL would add ~150 KB and a canvas that cannot be read by a
  screen reader, to draw four rectangles.
* The motion is CSS transitions and native scroll-driven animations — the
  browser now does natively, off the main thread, what a scroll library used
  to do badly on it. All of it disabled under `prefers-reduced-motion`.

Total JavaScript is under 20 KB uncompressed, and the map, talent and jobs
modules are only fetched on the pages that use them.

---

## What is illustrative, and what is counted

The brand's rule is that nothing claims to be more certain than it is. Two
kinds of number appear on this site and they are marked differently.

**Counted — real, from the placement record (29 rows, Jan 2023 – Jul 2026):**
29 records · 8 companies · 20 from one client · 9 job families · one role
refilled 7 times · records by year 8 / 12 / 5 / 4. The 20-of-29 concentration
always appears in the same visual field as the 20 hires. No fill rate, no
time-to-hire, no success rate and no fee appears anywhere, because no verified
figure exists.

**Illustrative — generated for the build, and labelled as such on the page:**
the market map (67 people, base 612), the home-page comparison field (54
people), the 12 talent profiles and the 5 open roles. Each carries a vermilion
`ILLUSTRATIVE` flag in the same frame.

Client companies are deliberately unnamed on the evidence page.

---

## Ready for real data

Four seams, all in one place each:

| What | Where | Replace with |
|---|---|---|
| Market map | `js/market-map.js` → `load()` | `fetch('/api/market-map/:id')` returning `{id, role, years, city, tz, lang, known, unknown, inside, x, y}[]`. `x` is distance from the client's market (0–100), `y` is experience (0–100). Nothing else changes. |
| Talent | `js/talent.js` → `PEOPLE` | An ATS feed of the same shape: `{id, role, city, tz, years, lang, pay, available, weeks, spoke}`. **Never add a name, a photograph, an employer or a contact detail to this object** — the page has no field for them by design. |
| Jobs | `js/jobs.js` → `ROLES` | The live requisition feed: `{id, role, where, lang, pay, fit, opened}`. |
| Forms | any `<form data-form>` | Add `data-endpoint="/api/enquiry"` and the form POSTs — **`multipart/form-data` when a file is attached, JSON when it is not**. Without an endpoint it composes the message and hands it to the visitor's mail client addressed to `tino@mcmurry-hughes.com`. |

### Attachments

The jobs application takes a CV (required); the contact form and the
"ask about this candidate" dialog take an optional job description. Drag and
drop or choose; PDF, DOC, DOCX, ODT, RTF or TXT, up to 10 MB, checked in the
browser for type and size before anyone presses send.

One honest limitation while no endpoint is configured: **a mail client cannot
take a file from a web page.** The message names the file and the confirmation
tells the sender, in as many words, to attach it to the email that just
opened. Wire `data-endpoint` and the file is posted with the form instead, and
that sentence disappears on its own. Server side, accept `multipart/form-data`,
re-check the type and size, store outside the web root, and scan it.

The three data modules are deterministic and seeded, so the illustrative market
does not reshuffle between loads. A map nobody can return to is not evidence.

`assets/documents/` is empty and wired for the real PDFs — the market map, the
proposal and the candidate summary — when they are cleared for publication.

---

## Motion and the 3D objects

Everything that moves is in `js/motion.js`, driven by one shared
`requestAnimationFrame` loop that stops whenever nothing animated is on
screen. Eight primitives, no library:

| | What it does |
|---|---|
| `reveal` | opacity + an 18px rise, or a left-to-right mask wipe |
| `lines` | a statement arrives one rendered line at a time |
| `depth` | the pointer tilts a paper object a few degrees, shadow following |
| `parallax` | a photograph moves slower than the page it is cut into |
| `arrive` | the people appear one at a time, in the order they were counted |
| `drift` | two slow sine waves per marker — 9–17s cycles, 2–4px |
| `magnet` | a person near the pointer grows and leans towards it; the rest carry on |
| `tilt` | the flat counted field leans 2° and its three depth planes separate |
| `breathe` | the idle turn: ~1°, over half a minute, never stops |
| `scrollDepth` | the hero object keeps turning as the page leaves it |

**The hero window** is the mark made physical: a frame, the grey searched
market behind it, and people on planes in front. The pointer turns it, the
page keeps turning it as it scrolls past, the people arrive one at a time
after the frame is drawn, and they never quite settle.

### The advanced layer (`css/motion.css`)

Three pieces of native browser technology doing work that used to need a
library and a main-thread scroll listener. Each is feature-detected; where it
is unsupported, `motion.js` does the same job with one throttled listener,
and where neither exists the page is static and completely usable.

1. **Cross-document view transitions** — `@view-transition { navigation: auto }`.
   Moving between pages morphs rather than cuts, and the mark, the navigation,
   the rail and the footer are given `view-transition-name`s so they hold
   their position while the argument underneath them changes. The site
   navigates like one application without being one.
2. **Scroll-driven animations** — `animation-timeline: view()` and
   `scroll(root block)`. The rail fills with document progress, photographs
   drift at their own rate, the step rules mark themselves off, each ledger
   row draws its hairline, the figures settle and the twenty-nine tally
   squares build as the record arrives. No scroll listener, no rAF, off the
   main thread, and impossible to desynchronise from the scroll position.
3. **Animated registered custom properties** — the scroll timeline animates
   `--srx` / `--sry` / `--sty` rather than `transform`, so the rotation the
   hero window earns from the scroll **composes** with the pointer's rotation
   and the idle breath instead of overwriting them. Three inputs, one
   transform, no conflict.

Plus **the reach**: hovering one person on the map draws the line from the
market the client searches to where that person actually is, stroke-dashoffset
animated, labelled "outside your search" — the distance the desk covers,
drawn at the moment someone asks about one person.

**The market map** is a 3D field, not a chart. Markers sit on depth planes
assigned by how far outside the searched market a person is, so the ones
furthest from your market are nearest to the viewer. The whole plot leans
under the pointer and the planes separate.

The one rule this does not break: **a marker never changes what it means.**
It drifts within about three pixels of where it was counted and returns. It
does not travel, swap places, bounce, orbit or re-flow, and a filter still
changes only its state — an excluded marker stops drifting, stops answering
the pointer and drops to 14%. Positions are identical before and after a
filter, and the drift is seeded, so the same market appears on every load.

All eight are no-ops under `prefers-reduced-motion: reduce`, where the people
are simply present and still. On touch, the tilt and pointer effects are
dropped and the drift is kept.

## Accessibility

* Semantic landmarks, one `h1` per page, heading order never skips.
* Every interactive element reachable and operable by keyboard; `Esc` closes
  the menu, the dialogs and the map read-out.
* Focus is a 2px ink outline with offset, never removed.
* Map markers are real buttons whose accessible name carries the same facts as
  the hover panel, so the map is readable without a pointer and without sight.
* `prefers-reduced-motion: reduce` disables every reveal, tilt and parallax and
  leaves the site fully usable.
* Contrast: ink on paper ~18:1, slate on paper ~9:1. Vermilion is used at 18px
  regular or above, never for body copy. No information is carried by colour
  alone — the grey block is labelled, and the vermilion flag carries text.
* Forms: real `<label>`s, `novalidate` so the designed error states are used,
  errors announced through `role="status"`, 48px targets.

## Performance

Responsive WebP with a JPEG fallback, `loading="lazy"` and `decoding="async"`
below the fold, explicit `width`/`height` on every image so nothing shifts,
fonts preloaded and self-hosted with `font-display: swap`, one `scroll`
listener for the whole page, `IntersectionObserver` for everything else,
`requestAnimationFrame` only where a pointer or scroll drives a transform, and
GPU-friendly `transform`/`opacity` only. Page weight is roughly 300–600 KB
depending on how many photographs a page carries.

---

## The rules a future change must not break

1. **Grey is semantic.** `--field` and `--grey` mean "the market a company is
   already searching". Not a card, not a panel, not a section ground.
2. **Vermilion is one person outside that search.** Not a button fill, not an
   accent, never over a photograph.
3. **Two families, no third.** Archivo and IBM Plex Mono. Characters outside
   the supplied Latin subsets — arrows, the approximately sign — force a silent
   serif substitution and are not used anywhere in this system.
4. **The talent page is anonymous.** No name, no photograph, no current
   employer, no contact detail. If a future build breaks this, it breaks the
   brand.
5. **No number the company cannot stand behind.** No time-to-hire, no fill
   rate, no success rate, no invented guarantee.
6. **The concentration stays on the page**, at the same size as the wins.

---

Edition 1.0 · September 2026 · San José, Costa Rica

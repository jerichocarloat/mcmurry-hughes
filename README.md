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
/index.html                 home — the employer journey: problem, service, demonstration, fit, record, next step
/how-we-work.html           the desk, the employer journey, fit, what happens next
/evidence.html              the live market map + the counted placement record
/talent.html                anonymous candidate preview, filterable
/jobs.html                  open roles with pay, and the application flow
/contact.html               "Request a market map" — the one employer action

/css/
  main.css                  fonts, tokens, base type, layout, rail, nav, footer, motion primitives
  components.css            the window, the map, the ledger, plates, sheets, talent, jobs, forms, attachments
  responsive.css            1440 · 1280 · 1024 · 768 · 430 · 390, coarse pointer, print
  motion.css                page transitions and the one scroll-linked turn of the hero window

/js/
  main.js                   entry point: nav, forms, dialogs, boot; lazy-loads page modules
  motion.js                 reveal · depth · tilt · scrollDepth · the rail
  market-map.js             the example market map + the home-page demonstration
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
* The motion is a handful of CSS transitions, one native scroll-driven
  animation and one 900 ms build. All of it is disabled under
  `prefers-reduced-motion`.

Total JavaScript is under 20 KB uncompressed, and the map, talent and jobs
modules are only fetched on the pages that use them.

---

## What is generated, and what is counted

The brand's rule is that nothing claims to be more certain than it is. Two
kinds of number appear on this site.

**Counted — real, from the placement record (29 rows, Jan 2023 – Jul 2026):**
29 records · 8 companies · 20 from one client · 9 job families · one role
filled 7 times · records by year 8 / 12 / 5 / 4 · one fall-off. The 20-of-29
concentration always appears in the same visual field as the 20 hires. No
fill rate, no time-to-hire, no success rate and no fee appears anywhere,
because no verified figure exists.

**Generated for this build:** the market map (9 people inside the searched
market, 67 outside it, base 612), the home-page demonstration (54 people),
the 12 talent profiles and the 5 roles. This is a mock site, so none of it
is labelled as an example on the page. Replace it with real data before
launch (see "Ready for real data").

Client companies are deliberately unnamed on the evidence page.

---

## Ready for real data

Four seams, all in one place each.

| What | Where | Replace with |
|---|---|---|
| Market map | `js/market-map.js` → `load()` | `fetch('/api/market-map/:id')` returning `{id, inside, role, years, city, tz, lang, known, unknown, x, y}[]`. `x` is distance from the client's market (0–100), `y` is experience (0–100). The count on the page is the people **outside** the search. |
| Talent | `js/talent.js` → `PEOPLE` | An ATS feed of the same shape: `{id, role, city, tz, years, lang, pay, available, weeks, spoke}`. **Never add a name, a photograph, an employer or a contact detail to this object** — the page has no field for them by design. |
| Jobs | `js/jobs.js` → `ROLES` | The live requisition feed: `{id, role, where, lang, pay, fit, opened}`. |
| Forms | any `<form data-form>` | Add `data-endpoint="/api/enquiry"` and the form POSTs — `multipart/form-data` when a file is attached, JSON when it is not. |

### Forms, as they behave today

No form on this site sends anything. There is no backend. Pressing the button
composes an email (subject, answers, and the profile or role it concerns)
and hands it to the visitor's own email program, addressed to
`tino@mcmurry-hughes.com`. The confirmation says exactly that — **"Not sent
yet · your email draft is ready"** — tells the applicant to attach their CV
to that email themselves, and offers **"Copy my message"** for visitors on
webmail, where a `mailto:` link often opens nothing.

Each form also carries `action="mailto:…" method="post" enctype="text/plain"`,
so with JavaScript off it still goes to the same person, and personal data
is never put into a URL (the old forms fell back to a GET).

The drop-a-file component (`attachments()` in `main.js`, `.drop` in
`components.css`) is kept for the endpoint seam but is not in the markup: a
file field that cannot send a file promises something the page cannot do.
When `data-endpoint` is wired, add the `.field--file` block back (see git
history for the markup); server side, accept `multipart/form-data`, re-check
the type and size, store outside the web root, and scan it. The brand book
says the jobs page never has a CV upload form, so that one is the owner's
decision.

The data modules are deterministic and seeded, so the generated market
does not reshuffle between loads.

`assets/documents/` is empty and wired for the real PDFs — the market map, the
proposal and the candidate summary — when they are cleared for publication.

---

## Motion and the 3D objects

The brand book (part eight) allows one motion behaviour — the window widens,
900 ms, `cubic-bezier(.16,.84,.30,1)`, from the lower left, once — and bans
parallax, counters, staggered reveals, type that arrives a line at a time
and a logo that draws itself. The production notes add: *nothing flashes or
loops*. The site keeps to that:

| | What it does |
|---|---|
| The drift | at the owner's request, every person square on the site is always moving: the hero (4.6–6.8s loops, 3.5–7px inside the search and 7.5–15px outside it), the step diagrams, the demonstration, the market map and the document thumbnails (seeded paths from `drift()` in `motion.js`, 7–12px in 3.8–5.6s, so every field visibly moves). Transform only, CSS, sine in-out. Each field pauses while it is off screen; everything stops under reduced motion. A square never leaves the place it was drawn, and a grey square stays inside the search. The placement tally does not move: it is a count of placements, not people. **This departs from the production notes' "nothing loops".** |
| The demonstration | the search boundary on the home page widens with the scroll (14% to 34%, smoothstep) and narrows if you scroll back; people it reaches turn grey over 200 ms. Touching the slider hands control to the reader for good. Reduced motion draws it at 34%. |
| Focus in, focus out | the one scroll behaviour: type, blocks and photographs come into focus as they arrive (opacity, an 8px blur clearing, an 18px rise) and go out of focus the same way as they leave the top; scroll back and it reverses. The map, demonstration, documents and roster fade without the blur. Nothing scales. The hero goes out of focus as it leaves. |
| Navigation | hides while the reader scrolls down, returns on the way up, at the top, when the menu opens or when a key moves focus into it. |
| Section rules | draw in ink from the left, once, when each section arrives (0.9s, brand easing) — the same whether the reader scrolled there or followed a link. |
| `reveal` | the fallback where scroll-linked animation is unsupported: below the fold, a block fades up 10px, once. Content above the fold is never hidden. |
| hover | colour only, 120 ms, linear. |

Nothing on the site tilts towards the pointer, and there are no 3D poses: every figure is drawn flat, the way the brand draws the market window.

**Removed** because the brand book or production notes forbid them, or the
owner asked: the hero's idle "breathe", all pointer tilt (hero, map, sheets), the map's 20-second idle sweep
(loop), photograph parallax, the line-by-line statement reveal, staggered
entrances, the tally building square by square, the rail filling like a
progress bar, vermilion rules drawing themselves, the magnetic primary
button, markers growing under the pointer, and the line drawn to a hovered
marker. Apart from the hero drift, nothing on the site moves unless the
reader scrolls, points or clicks, and the entrances and the one build each
happen once. Visible copy never says "vermilion": keys say "Inside your
usual search" and "Outside it", and prose says "red".

**The market map** is a 3D field, not a chart: markers sit on depth planes
assigned by how far outside the searched market a person is. A marker never
changes position or size. A filter changes only its state: an excluded
marker drops to 14% and stops answering. The whole map is **one tab stop**:
arrow keys, Home and End move between people; hover, focus or tap shows the
read-out; Escape closes it.

## Accessibility

* Semantic landmarks, one `h1` per page, heading order never skips.
* Every interactive element reachable and operable by keyboard; `Esc` closes
  the menu, the dialogs and the map read-out.
* Focus is a 2px ink outline with offset, never removed.
* Map markers are real buttons whose accessible name carries the same facts as
  the read-out, with one
  roving tab stop for the whole map and arrow-key movement.
* The demonstration slider announces its state in words (`aria-valuetext`).
* The page rail is decorative and `aria-hidden`; its ticks are not in the tab
  order. Headings carry the same structure.
* `prefers-reduced-motion: reduce` disables every reveal, tilt and parallax and
  leaves the site fully usable.
* Works with JavaScript off. Every entrance animation is gated behind a `.js`
  class set by a one-line inline script in each `<head>`. If that script does
  not run, nothing is hidden and the full argument is on the page. Only the
  example map, the boundary slider and the filters need JavaScript; the forms
  fall back to a `mailto:` POST.
* Prints. `@media print` forces every revealed element, marker and tally square
  visible, because paper has no scroll position.
* Contrast: ink on paper ~18:1, slate on paper ~9:1. Vermilion text appears
  only at 18px or above (the "outside it" count); small labels about people
  outside the search carry a vermilion square instead. No information is
  carried by colour alone — every key says "Grey" or "Vermilion" in words.
* Small mono labels, section heads and captions are Slate (#41444A, ~9:1),
  not Mid. The production notes give Mid on Paper as ~4.8:1, but it measures
  3.9:1 on Paper and 3.6:1 on Bone — below WCAG AA for 11px type. Mid is kept
  for the decorative rail and form placeholders only. (Brand-spec question
  for the owner: correct the stated ratio, or darken Mid.)
* One left edge per page at every width: sections, full-bleed photograph
  copy, the rail (which sits on the column's edge, not the window's) and the
  footer all align. Checked at 375, 1440 and 2000px.
* Forms: real `<label>`s, `novalidate` so the designed error states are used,
  errors announced through `role="status"`, 44–48px targets, focus moved to
  the first field that needs an answer.

## Performance

Responsive WebP with a JPEG fallback, `loading="lazy"` and `decoding="async"`
below the fold, explicit `width`/`height` on every image so nothing shifts,
fonts preloaded and self-hosted with `font-display: swap`, one `scroll`
listener for the whole page, `IntersectionObserver` for everything else,
`requestAnimationFrame` only where a pointer or scroll drives a transform, and
GPU-friendly `transform`/`opacity` only. Page weight is roughly 300–600 KB
depending on how many photographs a page carries.

---

## Two rules the market fields depend on

* **Nothing sits behind the grey block.** The searched market is an opaque
  plane in a 3D scene, so a marker given a negative `--mz` disappears behind
  it. People inside that market are drawn at `+1px`: on the block, never
  behind it.
* **No caption lands on a person.** The block names itself inside its own
  edges, and the markers inside it keep to the upper band so the nameplate
  has the lower band to itself. On the home comparison the block is too small
  at phone width to hold a caption at all, so the footer carries the words
  instead.

## The rules a future change must not break

1. **Grey is semantic.** `--field` and `--grey` mean "the market a company is
   already searching". Not a card, not a panel, not a section ground.
2. **Vermilion is one person outside that search.** Not a button colour, not a
   section number, not a heading, not a rule, never over a photograph. The
   only other vermilion mark is the one tick on the rail, which is part of
   the approved search-trace device.
3. **Two families, no third.** Archivo and IBM Plex Mono. Characters outside
   the supplied Latin subsets — arrows, the approximately sign — force a silent
   serif substitution and are not used anywhere in this system.
4. **The talent page is anonymous.** No name, no photograph, no current
   employer, no contact detail. If a future build breaks this, it breaks the
   brand.
5. **No number the company cannot stand behind.** No time-to-hire, no fill
   rate, no success rate, no invented guarantee.
6. **The concentration stays on the page**, at the same size as the wins.
7. **The wordmark is never retyped.** The nav and footer place
   `assets/icons/MH_lockup_horizontal.svg`.
9. **Photographs carry no copy.** Every plate is the picture and its place
   caption, nothing over it. What a photograph means is said by the section
   that follows it (Valencia is followed by the people section, "Browse
   people we've already spoken to.").
10. **Statements use the book's own lines where one exists** — "Your
    shortlist isn't the market.", "No company sees the whole market.",
    "Show us the role."
12. **One vermilion word per statement**, never a phrase: the word that
    carries the idea (whole, outside, spoken, market, person, pays, role).
11. **"Anonymous" is not used in copy.** The idea is said plainly: names
    follow with consent.
8. **Nothing else loops.** The drift of the people squares is the single, deliberate exception. See "Motion" above.

---

## Links out

The footer carries the company's LinkedIn page
(`https://www.linkedin.com/company/mcmurry-&-hughes/`), which is also in the
home page's structured data (`sameAs`). The brand book calls LinkedIn the
only channel that matters for this company.

## Waiting on the owner

The site states these carefully, or not at all, until they are confirmed.
Each appears in the brand book only as intended copy or inside a sample
document, not as a confirmed business fact.

1. **Reply time.** The site says "we aim to reply within one working day".
   Is one working day a commitment? (Brand book, contact page spec.)
2. **Answering applications.** The site says "we aim to answer every
   application, including when the answer is no". Is that a commitment, and
   within what time? (The book says rejections within two working days for
   people M&H called.)
3. **The market map is free.** The site says "we do not charge for it". Is
   that true for every client and every role, with no conditions?
4. **Intake length.** The site no longer says "ninety minutes". Should it?
5. **Notice period.** "Thirty days' notice, either side" appeared only in a
   sample engagement letter and has been removed. Is it a standard term?
6. **Privacy.** There is no privacy notice. What happens to an enquiry or a
   CV after it arrives by email: who can see it, how long it is kept, and how
   someone asks for it to be deleted? The site currently says only that the
   website itself stores nothing.
7. **Candidate consent.** The site says M&H asks a person before introducing
   them to a company. Please confirm this is always the practice.
8. **Time to place.** The brand book's record shows "median 66 days to place
   (n = 25)", while this README says no time-to-hire is published. The site
   shows none. Confirm that is the decision.
9. **Real roles, profiles and maps.** The jobs, talent and market-map data
   are generated for this mock build. Replace them before launch.
10. **Photo captions.** Two captions were corrected to match the brand book
    (Wrocław · Jan, Valencia · Sep). The Kraków caption (Feb) has no source in
    the book; please confirm it.

---

Edition 1.0 · September 2026 · San José, Costa Rica

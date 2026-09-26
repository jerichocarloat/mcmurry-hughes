/* THE PROBLEM — the view pulls back as the reader scrolls through the
   section. The world is scaled from its lower-left corner (the searched
   market): at rest the frame is filled by the search, at the end it shows
   the market. Only the scale changes; nobody moves. */
import { drift } from './motion.js';

const sec = document.querySelector('[data-idea]');
if (sec) {
  const world = sec.querySelector('[data-idea-world]');
  const out = sec.querySelector('[data-idea-out]');
  const track = sec.querySelector('.idea__track');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dots = [...world.querySelectorAll('[data-o]')];
  const S0 = 1 / 0.34;
  let tick = false;

  const draw = () => {
    const r = track.getBoundingClientRect();
    const span = Math.max(r.height - window.innerHeight, 1);
    let p = reduced.matches ? 1 : Math.min(Math.max(-r.top / span, 0), 1);
    p = Math.min(p / 0.8, 1);                       // hold the wide view at the end
    const e = p * p * (3 - 2 * p);
    const s = S0 - (S0 - 1) * e;
    world.style.transform = `scale(${s.toFixed(4)})`;
    const w = 100 / s;                              // visible share of the world
    out.textContent = String(dots.filter((d) =>
      parseFloat(d.style.left) < w && parseFloat(d.style.top) > 100 - w).length);
  };

  window.addEventListener('scroll', () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => { tick = false; draw(); });
  }, { passive: true });
  window.addEventListener('resize', draw, { passive: true });
  drift('.idea__world .person', { amp: 5, seed: 37, min: 4.2, max: 6.4 });
  draw();
}

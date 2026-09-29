// Styles are injected, so the module works without a CSS-aware bundler.
// Override the dim colour with `--spotlight-dim` on `.reveal-spotlight`.

const FOLLOW = 0.35; // share of the remaining distance per frame
const STYLE_ID = "reveal.js-phone-remote-spotlight";
const CSS = `
.reveal-spotlight {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  background: radial-gradient(
    circle at var(--x, 50%) var(--y, 50%),
    transparent calc(var(--r, 150px) - 6px),
    var(--spotlight-dim, rgb(0 0 0 / 0.8)) var(--r, 150px)
  );
  opacity: 0;
  transition: opacity 0.18s ease-out;
}
.reveal-spotlight.on {
  opacity: 1;
}
@media print {
  .reveal-spotlight {
    display: none;
  }
}
`;

export function createSpotlight(deck) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const el = document.createElement("div");
  el.className = "reveal-spotlight";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);

  const target = { x: 0.5, y: 0.5, r: 0.14 };
  const current = { ...target };
  let visible = false;
  let frame = 0;

  function paint() {
    const box = deck.getSlidesElement().getBoundingClientRect();
    const x = box.left + current.x * box.width;
    const y = box.top + current.y * box.height;
    const r = current.r * box.height;
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
    el.style.setProperty("--r", `${r}px`);
  }

  function step() {
    let moving = false;
    for (const k of ["x", "y", "r"]) {
      const d = target[k] - current[k];
      if (Math.abs(d) > 0.0005) {
        current[k] += d * FOLLOW;
        moving = true;
      } else {
        current[k] = target[k];
      }
    }
    paint();
    frame = moving ? requestAnimationFrame(step) : 0;
  }

  function update({ on, x, y, r }) {
    if (Number.isFinite(x)) target.x = clamp(x);
    if (Number.isFinite(y)) target.y = clamp(y);
    if (Number.isFinite(r)) target.r = Math.min(0.5, Math.max(0.03, r));

    const show = on !== false;
    if (show && !visible) {
      // Don't fly across the slide when fading in.
      Object.assign(current, target);
      paint();
    }
    visible = show;
    el.classList.toggle("on", visible);

    if (!frame) frame = requestAnimationFrame(step);
  }

  function destroy() {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", paint);
    el.remove();
  }

  window.addEventListener("resize", paint);
  return { update, destroy };
}

const clamp = (v) => Math.min(1, Math.max(0, v));

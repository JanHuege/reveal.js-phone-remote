// reveal.js plugin – the deck side of the remote.
//
// Reports every slide change to the server and runs the remote's commands.
// Stays silent when the server isn't there (static hosting, PDF export,
// speaker view).
//
//   import PhoneRemote from 'reveal.js-phone-remote';
//   Reveal.initialize({ plugins: [PhoneRemote], phoneRemote: { … } });

import { createSpotlight } from './spotlight.js';

const DEFAULTS = {
  // Must match the server's prefix.
  prefix: '/_remote',
  // Fallback title for slides without h1–h3: "<slideLabel> <n>".
  slideLabel: 'Slide',
  // Custom title extraction: (slide, index) => string | null.
  title: null,
};

const REPORT_ON = [
  'slidechanged',
  'fragmentshown',
  'fragmenthidden',
  'paused',
  'resumed',
  'overviewshown',
  'overviewhidden',
];

export default function PhoneRemote() {
  return {
    id: 'phone-remote',
    init(deck) {
      const options = { ...DEFAULTS, ...deck.getConfig().phoneRemote };
      // Not awaited: an unreachable server must not delay reveal's start.
      if (deck.isReady()) connect(deck, options);
      else deck.on('ready', () => connect(deck, options));
    },
  };
}

async function connect(deck, options) {
  const { prefix } = options;
  const params = new URLSearchParams(location.search);
  // The speaker view loads the deck in iframes with ?receiver. Those must
  // neither report nor run commands – every command would run twice.
  if (params.has('print-pdf') || params.has('receiver')) return;
  if (window.self !== window.top) return;

  try {
    const ping = await fetch(`${prefix}/ping`);
    if (!ping.ok) return;
  } catch {
    return;
  }

  // At most one report in flight, the snapshot is taken when it leaves.
  // Parallel POSTs can arrive out of order – an older state would then
  // overwrite a newer one on the phone.
  let inFlight = false;
  let queued = false;
  const report = async () => {
    queued = true;
    if (inFlight) return;
    inFlight = true;
    while (queued) {
      queued = false;
      await fetch(`${prefix}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot(deck, options)),
      }).catch(() => {});
    }
    inFlight = false;
  };

  REPORT_ON.forEach((type) => deck.on(type, report));

  const spotlight = createSpotlight(deck);

  const events = new EventSource(`${prefix}/events?role=deck`);
  // Report after every (re)connect – the server may have restarted.
  events.addEventListener('open', report);
  events.addEventListener('command', (e) => {
    const command = JSON.parse(e.data);
    if (command.cmd === 'spot') spotlight.update(command);
    else run(deck, command);
  });
}

function run(deck, { cmd, h, v }) {
  if (deck.isOverview() && cmd !== 'pause') deck.toggleOverview(false);

  switch (cmd) {
    case 'next':
      deck.next();
      break;
    case 'prev':
      deck.prev();
      break;
    // Left/right: fragments first, then the neighbouring main slide –
    // subslides are skipped (that's what up/down are for).
    case 'right':
      deck.right();
      break;
    case 'left':
      deck.left();
      break;
    case 'up':
      deck.up();
      break;
    case 'down':
      deck.down();
      break;
    case 'first':
      deck.slide(0, 0);
      break;
    case 'last':
      deck.slide(deck.getHorizontalSlides().length - 1, 0);
      break;
    case 'pause':
      deck.togglePause();
      break;
    case 'goto':
      deck.slide(Number(h) || 0, Number(v) || 0);
      break;
  }
}

function snapshot(deck, options) {
  const slides = deck.getSlides();
  const current = deck.getCurrentSlide();
  const index = slides.indexOf(current);
  const { h, v, f } = deck.getIndices();
  const titleOf = (slide, i) => options.title?.(slide, i) || defaultTitle(slide, i, options);

  const main = deck.getHorizontalSlides();
  const nextMain = main[h + 1];
  const nextSlide = nextMain && (nextMain.querySelector(':scope > section') || nextMain);

  const fragments = current.querySelectorAll('.fragment');
  const shown = current.querySelectorAll('.fragment.visible');

  return {
    h,
    v,
    f,
    index,
    total: slides.length,
    title: titleOf(current, index),
    notes: deck.getSlideNotes(current) || '',
    fragments: fragments.length,
    fragmentsShown: shown.length,
    // "Next" on the phone goes right, so "up next" is the next main slide.
    next: nextSlide ? titleOf(nextSlide, slides.indexOf(nextSlide)) : null,
    paused: deck.isPaused(),
    // Which ways lead somewhere – for the up/down buttons.
    routes: routesOf(current, v),
    aspect: aspectOf(deck),
    // Outline for jumping to a slide.
    outline: slides.map((slide, i) => ({
      ...deck.getIndices(slide),
      title: titleOf(slide, i),
    })),
  };
}

// Up/down from the current slide's own stack, so they always match h/v of
// the same snapshot. deck.availableRoutes() reads reveal's .present classes
// and turns up/down on for every slide when loop is set.
function routesOf(slide, v = 0) {
  const stack = slide.parentElement?.closest('section');
  const count = stack ? stack.querySelectorAll(':scope > section').length : 1;
  return { up: v > 0, down: v < count - 1 };
}

// Slide width / height, so the phone's trackpad moves the spot evenly.
function aspectOf(deck) {
  const { width, height } = deck.getConfig();
  const ratio = Number(width) / Number(height);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}

function defaultTitle(slide, index, { slideLabel }) {
  const heading = slide.querySelector('h1, h2, h3');
  const text = heading?.textContent.replace(/\s+/g, ' ').trim();
  return text || `${slideLabel} ${index + 1}`;
}

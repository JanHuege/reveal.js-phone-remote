import { translate, translator } from "./i18n.js";

const config = JSON.parse(document.getElementById("config").textContent);
const { prefix, lang } = config;
const t = translator(lang, config.strings);
const key = new URLSearchParams(location.search).get("key") || "";
const STORE = "reveal.js-phone-remote:";

translate(document, t);

const $ = (id) => document.getElementById(id);
const ui = {
  dot: $("dot"),
  count: $("count"),
  timer: $("timer"),
  clock: $("clock"),
  banner: $("banner"),
  title: $("title"),
  frag: $("frag"),
  next: $("next"),
  notes: $("notes"),
  pause: $("pause"),
  up: $("up"),
  down: $("down"),
  outline: $("outline"),
  outlineList: $("outline-list"),
};

let state = null;

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

function banner(text) {
  ui.banner.hidden = !text;
  ui.banner.textContent = text || "";
}

function connect() {
  const events = new EventSource(
    `${prefix}/events?role=remote&key=${encodeURIComponent(key)}`,
  );
  events.addEventListener("open", () => ui.dot.classList.add("on"));
  events.addEventListener("error", () => {
    ui.dot.classList.remove("on");
    // On 403, EventSource gives up (readyState CLOSED) – then it's the key,
    // not the network.
    banner(
      events.readyState === EventSource.CLOSED
        ? t("noAccess")
        : t("reconnecting"),
    );
  });
  events.addEventListener("state", (e) => render(JSON.parse(e.data)));
}

async function command(cmd, extra = {}) {
  try {
    const res = await fetch(`${prefix}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Remote-Key": key },
      body: JSON.stringify({ cmd, ...extra }),
    });
    if (res.status === 403) banner(t("noAccess"));
  } catch {
    banner(t("unreachable"));
  }
  if (!timer.running && !timer.elapsed && cmd === "right") toggleTimer();
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function render(next) {
  state = next;

  banner(state.decks ? "" : t("noDeck"));
  if (state.total === undefined) return;

  ui.count.textContent = `${state.index + 1} / ${state.total}`;
  ui.title.textContent = state.title;
  ui.next.textContent = state.next ?? t("end");
  // Notes are the deck's own HTML – same trust as the slides.
  ui.notes.innerHTML = state.notes || `<p class="empty">${t("noNotes")}</p>`;
  ui.notes.scrollTop = 0;

  ui.frag.hidden = !state.fragments;
  ui.frag.textContent = t("step", {
    shown: state.fragmentsShown,
    total: state.fragments,
  });

  // Older decks don't send routes – leave the buttons usable then.
  ui.up.disabled = state.routes ? !state.routes.up : false;
  ui.down.disabled = state.routes ? !state.routes.down : false;

  ui.pause.classList.toggle("active", !!state.paused);
  ui.pause.textContent = state.paused ? t("show") : t("black");

  renderOutline();
}

function renderOutline() {
  ui.outlineList.replaceChildren(
    ...state.outline.map((item, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.title;
      if (i === state.index) btn.classList.add("current");
      if (item.v > 0) btn.classList.add("sub");
      btn.addEventListener("click", () => {
        command("goto", { h: item.h, v: item.v });
        ui.outline.close();
      });
      li.appendChild(btn);
      return li;
    }),
  );
}

// ---------------------------------------------------------------------------
// Timer and clock
//
// Runs on the phone, not the server: survives a restart of the deck. Starts
// with the first "Next", tapping pauses it.
// ---------------------------------------------------------------------------

const TIMER_KEY = `${STORE}timer`;
const timer = load(TIMER_KEY, { running: false, since: 0, elapsed: 0 });

function load(name, fallback) {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(name)) };
  } catch {
    return fallback;
  }
}

function save(name, value) {
  try {
    localStorage.setItem(name, JSON.stringify(value));
  } catch {
    // private mode – no memory then
  }
}

function toggleTimer() {
  if (timer.running) {
    timer.elapsed += Date.now() - timer.since;
    timer.running = false;
  } else {
    timer.since = Date.now();
    timer.running = true;
  }
  save(TIMER_KEY, timer);
  tick();
}

function resetTimer() {
  Object.assign(timer, { running: false, since: 0, elapsed: 0 });
  save(TIMER_KEY, timer);
  tick();
}

function tick() {
  const ms = timer.elapsed + (timer.running ? Date.now() - timer.since : 0);
  const s = Math.floor(ms / 1000);
  ui.timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  ui.timer.classList.toggle("running", timer.running);

  ui.clock.textContent = new Date().toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Notes size
// ---------------------------------------------------------------------------

const SIZE_KEY = `${STORE}size`;
let size = load(SIZE_KEY, { px: 20 }).px;

function setSize(px) {
  size = Math.min(40, Math.max(14, px));
  document.documentElement.style.setProperty("--notes", `${size}px`);
  save(SIZE_KEY, { px: size });
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

$("nextbtn").addEventListener("click", () => command("right"));
$("prev").addEventListener("click", () => command("left"));
ui.up.addEventListener("click", () => command("up"));
ui.down.addEventListener("click", () => command("down"));
ui.pause.addEventListener("click", () => command("pause"));
ui.timer.addEventListener("click", toggleTimer);
$("reset").addEventListener("click", resetTimer);
$("smaller").addEventListener("click", () => setSize(size - 2));
$("larger").addEventListener("click", () => setSize(size + 2));
$("outline-open").addEventListener("click", () => {
  if (!state?.outline) return;
  ui.outline.showModal();
  ui.outlineList.querySelector(".current")?.scrollIntoView({ block: "center" });
});

// Swiping over the notes: left = next, right = back. Vertical stays with
// scrolling the notes.
let touch = null;
ui.notes.addEventListener(
  "touchstart",
  (e) => {
    const p = e.touches[0];
    touch = { x: p.clientX, y: p.clientY };
  },
  { passive: true },
);
ui.notes.addEventListener("touchend", (e) => {
  if (!touch) return;
  const p = e.changedTouches[0];
  const dx = p.clientX - touch.x;
  const dy = p.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  command(dx < 0 ? "right" : "left");
});

// ---------------------------------------------------------------------------
// Spotlight
//
// The pad works like a trackpad: relative, with slight acceleration. Finger
// down = spot on, finger up = spot off (unless "Hold"). The position lives
// here, the deck gets it absolute – a lost packet only costs an intermediate
// step, not an offset.
//
// At most one packet is in flight. When the answer arrives, the latest state
// goes out: the rate adapts to the Wi-Fi by itself, and nothing arrives out
// of order.
// ---------------------------------------------------------------------------

const SPOT_KEY = `${STORE}spot`;
const PAD_TRAVEL = 320; // px of finger travel for one slide width

const spot = {
  x: 0.5,
  y: 0.5,
  r: load(SPOT_KEY, { r: 0.14 }).r,
  on: false,
  hold: false,
};
const spotPad = $("spot-pad");
const spotSheet = $("spot");
let spotInFlight = false;
let spotQueued = false;
let lastPoint = null;

async function sendSpot() {
  spotQueued = true;
  if (spotInFlight) return;
  while (spotQueued) {
    spotQueued = false;
    spotInFlight = true;
    const { x, y, r, on } = spot;
    await command("spot", { x, y, r, on });
    spotInFlight = false;
  }
}

function setSpotOn(on) {
  spot.on = on || spot.hold;
  spotPad.classList.toggle("active", spot.on);
  sendSpot();
}

spotPad.addEventListener("pointerdown", (e) => {
  spotPad.setPointerCapture(e.pointerId);
  lastPoint = { x: e.clientX, y: e.clientY };
  setSpotOn(true);
});

spotPad.addEventListener("pointermove", (e) => {
  if (!lastPoint) return;
  const dx = e.clientX - lastPoint.x;
  const dy = e.clientY - lastPoint.y;
  lastPoint = { x: e.clientX, y: e.clientY };

  // Slow = precise, fast = far.
  const gain = 1 + Math.min(1.5, Math.hypot(dx, dy) / 18);
  spot.x = clamp01(spot.x + (dx * gain) / PAD_TRAVEL);
  spot.y = clamp01(
    spot.y + (dy * gain * (state?.aspect || 16 / 9)) / PAD_TRAVEL,
  );
  sendSpot();
});

const release = () => {
  lastPoint = null;
  setSpotOn(false);
};
spotPad.addEventListener("pointerup", release);
spotPad.addEventListener("pointercancel", release);

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function renderSpotSize() {
  spotSheet.querySelectorAll("[data-r]").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.r) === spot.r);
  });
}

spotSheet.querySelectorAll("[data-r]").forEach((b) =>
  b.addEventListener("click", () => {
    spot.r = Number(b.dataset.r);
    save(SPOT_KEY, { r: spot.r });
    renderSpotSize();
    if (spot.on) sendSpot();
  }),
);

$("spot-hold").addEventListener("click", (e) => {
  spot.hold = !spot.hold;
  e.currentTarget.setAttribute("aria-pressed", String(spot.hold));
  setSpotOn(spot.hold);
});

$("spot-open").addEventListener("click", () => spotSheet.showModal());
spotSheet.addEventListener("close", () => {
  spot.hold = false;
  $("spot-hold").setAttribute("aria-pressed", "false");
  setSpotOn(false);
});
$("spot-next").addEventListener("click", () => command("right"));
$("spot-prev").addEventListener("click", () => command("left"));

renderSpotSize();
setSize(size);
tick();
setInterval(tick, 1000);
connect();

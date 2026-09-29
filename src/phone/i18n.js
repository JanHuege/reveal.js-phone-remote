export const STRINGS = {
  en: {
    connection: "Connection",
    connecting: "Connecting …",
    upNext: "Up next:",
    end: "End",
    noNotes: "No notes.",
    step: "Step {shown} / {total}",
    slides: "Slides",
    spot: "Spot",
    black: "Black",
    show: "Show",
    prev: "Back",
    next: "Next",
    up: "Up",
    down: "Down",
    notesSmaller: "Smaller notes",
    notesLarger: "Larger notes",
    timerToggle: "Start/stop timer",
    timerReset: "Reset timer",
    jumpTo: "Jump to",
    done: "Done",
    spotlight: "Spotlight",
    spotHint: "Touch – the spot appears.\nMove – the spot follows.",
    spotSize: "Spot size",
    hold: "Hold",
    noAccess: "No access – scan the QR code in the terminal again.",
    reconnecting: "Connection lost – reconnecting …",
    unreachable: "Server unreachable.",
    noDeck: "Presentation not connected – open the deck in the browser.",
  },
  de: {
    connection: "Verbindung",
    connecting: "Verbinde …",
    upNext: "Als Nächstes:",
    end: "Ende",
    noNotes: "Keine Notizen.",
    step: "Schritt {shown} / {total}",
    slides: "Folien",
    spot: "Spot",
    black: "Schwarz",
    show: "Zeigen",
    prev: "Zurück",
    next: "Weiter",
    up: "Hoch",
    down: "Runter",
    notesSmaller: "Notizen kleiner",
    notesLarger: "Notizen größer",
    timerToggle: "Timer starten/anhalten",
    timerReset: "Timer zurücksetzen",
    jumpTo: "Springen zu",
    done: "Fertig",
    spotlight: "Spotlight",
    spotHint:
      "Finger auflegen – der Spot erscheint.\nBewegen – der Spot folgt.",
    spotSize: "Spotgröße",
    hold: "Halten",
    noAccess: "Kein Zugriff – QR-Code im Terminal neu scannen.",
    reconnecting: "Verbindung unterbrochen – verbinde neu …",
    unreachable: "Server nicht erreichbar.",
    noDeck: "Präsentation nicht verbunden – Deck im Browser öffnen.",
  },
};

export function translator(lang, overrides = {}) {
  const base = STRINGS[lang] || STRINGS[lang?.split("-")[0]] || STRINGS.en;
  const strings = { ...STRINGS.en, ...base, ...overrides };
  return (id, vars = {}) =>
    strings[id].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function translate(root, t) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nLabel));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
}

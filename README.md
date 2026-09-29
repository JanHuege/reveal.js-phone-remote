# reveal.js-phone-remote

[![npm version](https://img.shields.io/npm/v/reveal.js-phone-remote.svg)](https://www.npmjs.com/package/reveal.js-phone-remote)
[![npm downloads](https://img.shields.io/npm/dm/reveal.js-phone-remote.svg)](https://www.npmjs.com/package/reveal.js-phone-remote)
[![node](https://img.shields.io/node/v/reveal.js-phone-remote.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/reveal.js-phone-remote.svg)](https://github.com/JanHuege/reveal.js-phone-remote/blob/main/LICENSE)

Control a [reveal.js](https://revealjs.com) deck from your phone – no app, no
cloud, no second server. Scan a QR code in the terminal and the phone shows:

- slide number, title, next slide and speaker notes (A−/A+ for size)
- timer (▶ to start, ↺ to reset; otherwise starts with the first navigation) and clock
- Next / Back, Up / Down for vertical slides, black screen (reveal's pause), jump to any slide
- swipe over the notes to change slides
- **Spotlight** – a trackpad like the Logitech Spotlight: touch and everything
  but a circle dims, move and the circle follows, lift and it's gone. "Hold"
  keeps it, S/M/L sets the size. Turns off by itself when the phone
  disconnects.

It runs on your existing Vite dev/preview server (or any Connect/Express/
node:http server) via Server-Sent Events. Only dependency: `qrcode-terminal`.

## Try it

The repository has a demo deck in two flavours:

```sh
git clone https://github.com/JanHuege/reveal.js-phone-remote.git && cd reveal.js-phone-remote
npm install
npm run example        # Vite            – http://localhost:5173/
npm run example:node   # plain node:http – http://localhost:8000/
```

Open the deck on the laptop and scan the QR code in the terminal with your
phone. Details: [`examples/vite`](https://github.com/JanHuege/reveal.js-phone-remote/tree/main/examples/vite), [`examples/node`](https://github.com/JanHuege/reveal.js-phone-remote/tree/main/examples/node).

## Install

```sh
npm install reveal.js-phone-remote
```

Requirements: Node.js ≥ 18, reveal.js ≥ 4, and Vite ≥ 5 if you use the Vite
plugin (optional otherwise).

## Usage with Vite

```js
// vite.config.js
import { defineConfig } from 'vite';
import phoneRemote from 'reveal.js-phone-remote/vite';

export default defineConfig({
  plugins: [phoneRemote()],
  // Listen on all interfaces so the phone can reach the laptop.
  // '::' = dual stack (IPv4 + IPv6), needed in IPv6-only phone hotspots.
  server: { host: '::' },
  preview: { host: '::' },
});
```

```js
// main.js
import Reveal from 'reveal.js';
import PhoneRemote from 'reveal.js-phone-remote';

Reveal.initialize({
  plugins: [PhoneRemote],
});
```

Start `vite` (or `vite build && vite preview`), open the deck on the laptop and
scan the QR code in the terminal with the phone camera. Both devices must be in
the same network – a phone hotspot is the safest bet in lecture halls, where
Wi-Fi often isolates clients.

Without the server (static hosting, PDF export, speaker view iframes) the deck
plugin stays silent.

## Usage without Vite

See [`examples/node`](https://github.com/JanHuege/reveal.js-phone-remote/tree/main/examples/node) for a complete, bundler-free setup.

```js
import http from 'node:http';
import { createRemote, printConnectInfo } from 'reveal.js-phone-remote/server';

const remote = createRemote();
const server = http.createServer((req, res) =>
  remote.handle(req, res, () => serveYourDeck(req, res)),
);
server.listen(8000, '::');
printConnectInfo(server, remote);
```

`remote.handle(req, res, next)` is a Connect-style middleware, so
`app.use(remote.handle)` works with Express and Connect.

## Options

### Server (`phoneRemote(options)` / `createRemote(options)`)

| Option | Default | |
| --- | --- | --- |
| `key` | `$REMOTE_KEY` or random | Access key, embedded in the QR code. Set a fixed one to keep a home-screen bookmark valid across restarts. |
| `prefix` | `'/_remote'` | URL prefix of all endpoints and the phone page. |
| `lang` | `'en'` | Phone UI language: `'en'`, `'de'`. |
| `strings` | `{}` | Override single UI strings, see [`src/phone/i18n.js`](https://github.com/JanHuege/reveal.js-phone-remote/blob/main/src/phone/i18n.js). |
| `title` | `'Remote'` | Page title and home-screen name. |
| `themeColor` | `'#0b1020'` | Browser chrome colour on the phone. |
| `css` | – | Path to an extra stylesheet for the phone page. |
| `qr` | `true` | Vite only: print the QR code. |

### Deck (`phoneRemote` key in the reveal config)

```js
Reveal.initialize({
  plugins: [PhoneRemote],
  phoneRemote: {
    prefix: '/_remote',         // must match the server
    slideLabel: 'Slide',        // fallback title: "Slide 3"
    title: (slide, index) => …, // custom title extraction, falsy = default
  },
});
```

Default slide title: first `h1`–`h3` of the slide.

## Theming

The phone page uses CSS custom properties. Override them in a stylesheet
passed as `css`:

```css
:root {
  --bg: #07102b;
  --panel: #0e1b42;
  --accent: #418fde;
  --highlight: #c0ba00;
  --font: 'Inter', system-ui, sans-serif;
  --radius: 0 14px 0 14px;
}
```

All properties: see the top of [`src/phone/remote.css`](https://github.com/JanHuege/reveal.js-phone-remote/blob/main/src/phone/remote.css).

The spotlight's dim colour on the deck: `.reveal-spotlight { --spotlight-dim: rgb(0 0 0 / 0.8); }`.

## Standalone spotlight

The spotlight overlay can be driven by something else too:

```js
import { createSpotlight } from 'reveal.js-phone-remote/spotlight';

const spot = createSpotlight(Reveal);
spot.update({ on: true, x: 0.5, y: 0.3, r: 0.14 }); // normalised to the slide
```

`x`, `y` in 0..1 of the slide, `r` as fraction of the slide height.

## Security

Everyone in the same network reaches the server. Commands, state and notes
require the key, which is rolled at start and only travels in the QR code.
Plain HTTP – use it in networks you trust, or a phone hotspot.

## Notes on iOS

- "Add to Home Screen" in Safari turns the page into a full-screen web app.
- Over `http://` in the LAN there is no Wake Lock API – set Auto-Lock to
  "Never" for the talk.
- A gyroscope pointer like the original Logitech Spotlight isn't possible:
  iOS only exposes motion sensors to HTTPS pages.
- In an iPhone hotspot, the QR code uses the Mac's Bonjour name (`….local`):
  the iPhone would route the Mac's global IPv6 address over cellular instead of
  the hotspot. Start the server *after* joining the network.

## Protocol

| | |
| --- | --- |
| `GET <prefix>/` | phone page |
| `GET <prefix>/ping` | deck checks for the server |
| `GET <prefix>/events?role=deck` | commands to the deck (SSE) |
| `GET <prefix>/events?role=remote&key=…` | deck state to the phone (SSE) |
| `POST <prefix>/state` | deck reports its state |
| `POST <prefix>/command` (`X-Remote-Key`) | `next`, `prev`, `left`, `right`, `up`, `down`, `first`, `last`, `pause`, `goto {h, v}`, `spot {on, x, y, r}` |

## Contributing

Bugs and ideas: [open an issue](https://github.com/JanHuege/reveal.js-phone-remote/issues). Pull requests welcome – run
`npm run example` to try changes against the demo deck.

## Links

- [npm package](https://www.npmjs.com/package/reveal.js-phone-remote)
- [GitHub repository](https://github.com/JanHuege/reveal.js-phone-remote)
- [Issues](https://github.com/JanHuege/reveal.js-phone-remote/issues)
- [reveal.js](https://revealjs.com)

## License

[MIT](https://github.com/JanHuege/reveal.js-phone-remote/blob/main/LICENSE) © Jan Huege

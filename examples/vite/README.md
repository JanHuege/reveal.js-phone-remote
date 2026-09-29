# Demo: Vite

A small reveal.js deck wired up with `reveal.js-phone-remote`. The slides walk you
through every feature – read the speaker notes on your phone.

```sh
# in the repository root
npm install
npm run example
```

1. Open the deck on your laptop: `http://localhost:5173/`
2. Scan the QR code in the terminal with your phone camera. Phone and laptop
   must be in the same network (a phone hotspot works best).
3. If macOS asks, allow incoming connections for `node`.

`npm run example:preview` does the same with a production build.

The three files that matter:

- `vite.config.js` – adds the server plugin and listens on all interfaces
- `main.js` – registers the reveal.js plugin
- `index.html` – slides with speaker notes

The example uses the package from the repository root (`"file:../.."`), so edits
to `src/` show up right away.

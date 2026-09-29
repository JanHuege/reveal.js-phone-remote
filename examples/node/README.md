# Demo: plain Node, no bundler

The same deck as the Vite demo, served by a ~60-line `node:http` server.
Useful if your deck is static HTML, or you run Express, Connect or your own
server.

```sh
# in the repository root
npm install
npm run example:node
```

1. Open the deck on your laptop: `http://localhost:8000/` (`PORT=…` to change)
2. Scan the QR code in the terminal with your phone camera. Phone and laptop
   must be in the same network (a phone hotspot works best).
3. If macOS asks, allow incoming connections for `node`.

The two files that matter:

- `server.js` – `remote.handle` first, then static files; `printConnectInfo`
  prints the QR code
- `index.html` – slides, plus an import map that loads reveal.js and the
  plugin as native ES modules from `node_modules`

With Express:

```js
app.use(remote.handle);
app.use(express.static('public'));
```

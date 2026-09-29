// reveal.js-phone-remote without Vite: a plain node:http server.
//
// The remote's middleware gets the first look at every request. Everything
// else is a tiny static file server for the deck and for reveal.js and the
// plugin straight out of node_modules (see the import map in index.html).
//
// With Express it's just: app.use(remote.handle); app.use(express.static(…)).

import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRemote, printConnectInfo } from 'reveal.js-phone-remote/server';

const PORT = Number(process.env.PORT) || 8000;

const remote = createRemote({ title: 'Demo Remote' });

const here = dirname(fileURLToPath(import.meta.url));
const dirOf = (specifier) => dirname(fileURLToPath(import.meta.resolve(specifier)));

// URL prefix -> directory on disk.
const ROOTS = {
  '/vendor/reveal.js/': dirOf('reveal.js'),
  '/vendor/reveal.js-phone-remote/': dirOf('reveal.js-phone-remote'),
  '/': here,
};

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

async function serveStatic(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  const [prefix, root] = Object.entries(ROOTS).find(([p]) => pathname.startsWith(p));
  const rel = pathname.slice(prefix.length) || 'index.html';
  const file = normalize(join(root, decodeURIComponent(rel)));

  if (!file.startsWith(root + sep)) return notFound(res);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    notFound(res);
  }
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

const server = http.createServer((req, res) =>
  remote.handle(req, res, () => serveStatic(req, res)),
);

// '::' = all interfaces, IPv4 and IPv6, so the phone can reach the laptop.
server.listen(PORT, '::', () => {
  console.log(`\n  Deck: http://localhost:${PORT}/`);
});
printConnectInfo(server, remote);

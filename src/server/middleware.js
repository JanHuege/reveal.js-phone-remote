import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const COMMANDS = new Set([
  "next",
  "prev",
  "left",
  "right",
  "up",
  "down",
  "first",
  "last",
  "pause",
  "goto",
  "spot",
]);

const PHONE_DIR = new URL("../phone/", import.meta.url);
const ASSETS = {
  "/remote.js": ["remote.js", "text/javascript"],
  "/i18n.js": ["i18n.js", "text/javascript"],
  "/remote.css": ["remote.css", "text/css"],
};

/**
 * @param {object} [options]
 * @param {string} [options.key]     fixed key, e.g. for a home-screen bookmark.
 *                                   Default: $REMOTE_KEY or a random one.
 * @param {string} [options.prefix]  URL prefix, default '/_remote'.
 * @param {string} [options.lang]    phone UI language ('en', 'de'), default 'en'.
 * @param {object} [options.strings] overrides for single UI strings.
 * @param {string} [options.title]   page title / home-screen name.
 * @param {string} [options.themeColor] browser chrome colour on the phone.
 * @param {string} [options.css]     path to an extra stylesheet for the phone
 *                                   page, loaded after the default one.
 */
export function createRemote(options = {}) {
  const {
    key = process.env.REMOTE_KEY || randomBytes(4).toString("hex"),
    prefix = "/_remote",
    lang = "en",
    strings = {},
    title = "Remote",
    themeColor = "#0b1020",
    css = null,
  } = options;

  const decks = new Set();
  const remotes = new Set();
  let state = null;

  const send = (res, event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const status = () => ({ ...state, decks: decks.size });
  const broadcastStatus = () =>
    remotes.forEach((r) => send(r, "state", status()));

  function page() {
    const config = { prefix, lang, strings };
    const html = readFileSync(new URL("index.html", PHONE_DIR), "utf8");
    return html
      .replaceAll("%LANG%", escapeHtml(lang))
      .replaceAll("%TITLE%", escapeHtml(title))
      .replaceAll("%THEME_COLOR%", escapeHtml(themeColor))
      .replaceAll("%PREFIX%", escapeHtml(prefix))
      .replace(
        "%THEME_CSS%",
        css
          ? `<link rel="stylesheet" href="${escapeHtml(prefix)}/theme.css" />`
          : "",
      )
      .replace("%CONFIG%", JSON.stringify(config).replaceAll("<", "\\u003c"));
  }

  async function handle(req, res, next = () => reply(res, 404)) {
    const url = new URL(req.url, "http://x");
    if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`))
      return next();

    const route = url.pathname.slice(prefix.length);
    const authorized =
      url.searchParams.get("key") === key ||
      req.headers["x-remote-key"] === key;

    if (req.method === "GET") {
      if (route === "" || route === "/") return serve(res, page(), "text/html");
      if (route === "/theme.css" && css)
        return serve(res, readFileSync(css), "text/css");
      if (ASSETS[route]) {
        const [file, type] = ASSETS[route];
        return serve(res, readFileSync(new URL(file, PHONE_DIR)), type);
      }
      if (route === "/ping") return reply(res, 200);
    }

    if (req.method === "GET" && route === "/events") {
      const role = url.searchParams.get("role");
      if (role !== "deck" && role !== "remote") return reply(res, 400);
      if (role === "remote" && !authorized) return reply(res, 403);

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.write("retry: 1000\n\n");

      const pool = role === "deck" ? decks : remotes;
      pool.add(res);
      if (role === "remote") send(res, "state", status());
      else broadcastStatus();

      // Comment lines keep the connection open through proxies and Wi-Fi sleep.
      const ping = setInterval(() => res.write(": ping\n\n"), 15000);
      req.on("close", () => {
        clearInterval(ping);
        pool.delete(res);
        if (role === "deck") broadcastStatus();
        // Phone gone (lock screen, Wi-Fi) – the spot must not stay on the slide.
        if (role === "remote" && !remotes.size) {
          decks.forEach((d) => send(d, "command", { cmd: "spot", on: false }));
        }
      });
      return;
    }

    if (req.method === "POST" && route === "/state") {
      try {
        state = await readJson(req);
      } catch {
        return reply(res, 400);
      }
      broadcastStatus();
      return reply(res, 200);
    }

    if (req.method === "POST" && route === "/command") {
      if (!authorized) return reply(res, 403);
      let command;
      try {
        command = await readJson(req);
      } catch {
        return reply(res, 400);
      }
      if (!COMMANDS.has(command.cmd)) return reply(res, 400);
      decks.forEach((d) => send(d, "command", command));
      return reply(res, 200, { decks: decks.size });
    }

    return reply(res, 404);
  }

  return {
    key,
    prefix,
    handle,
    url: (host, port) => `http://${host}:${port}${prefix}/?key=${key}`,
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function reply(res, code, data = {}) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function serve(res, body, type) {
  res.statusCode = 200;
  res.setHeader("Content-Type", `${type}; charset=utf-8`);
  res.setHeader("Cache-Control", "no-cache");
  res.end(body);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

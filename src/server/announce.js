import { execFileSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import qrcode from "qrcode-terminal";

/**
 * @param {import('node:http').Server} http
 * @param {ReturnType<import('./middleware.js').createRemote>} remote
 * @param {{ log?: (msg: string) => void }} [options]
 */
export function printConnectInfo(http, remote, { log = console.log } = {}) {
  const print = () => {
    const address = http.address();
    if (!address || typeof address === "string") return;

    const lan = lanAddresses();
    const local = ["127.0.0.1", "::1", "localhost"].includes(address.address);
    if (local || !lan.length) {
      log(
        `\n  Phone remote: server only reachable locally – listen on '::' or '0.0.0.0'.\n`,
      );
      return;
    }

    const [first, ...rest] = [bonjourName(), ...lan].filter(Boolean);

    log("\n  Phone remote – scan with the phone camera:\n");
    printQr(remote.url(first, address.port), log);
    rest.forEach((host) => log(`  also: ${remote.url(host, address.port)}`));
    log("");
  };

  if (http.listening) print();
  else http.once("listening", print);
}

function printQr(url, log) {
  qrcode.generate(url, { small: true }, (qr) => log(qr.replace(/^/gm, "  ")));
  log(`  ${url}\n`);
}

export function bonjourName() {
  if (process.platform !== "darwin") return null;
  try {
    const name = execFileSync("scutil", ["--get", "LocalHostName"], {
      encoding: "utf8",
    }).trim();
    return name ? `${name.toLowerCase()}.local` : null;
  } catch {
    return null;
  }
}

const VIRTUAL = /^(bridge|vmnet|vboxnet|utun|docker|veth|br-|awdl|llw)/;

export function lanAddresses() {
  const temporary = temporaryIPv6();
  const list = Object.entries(networkInterfaces())
    .filter(([name]) => !VIRTUAL.test(name))
    .flatMap(([, entries]) => entries)
    .filter((i) => !i.internal);

  const v4 = list
    .filter((i) => i.family === "IPv4" && !i.address.startsWith("192.0.0."))
    .map((i) => i.address);

  const v6 = list
    .filter((i) => i.family === "IPv6" && !/^fe[89ab]/i.test(i.address))
    .map((i) => i.address)
    .sort((a, b) => temporary.has(a) - temporary.has(b));

  return [...v4, ...v6.map((a) => `[${a}]`)];
}

function temporaryIPv6() {
  if (process.platform !== "darwin") return new Set();
  try {
    const out = execFileSync("ifconfig", { encoding: "utf8" });
    return new Set(
      [...out.matchAll(/inet6 (\S+) .*\btemporary\b/g)].map((m) => m[1]),
    );
  } catch {
    return new Set();
  }
}

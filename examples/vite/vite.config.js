import { defineConfig } from 'vite';
import phoneRemote from 'reveal-phone-remote/vite';

// '::' listens on all interfaces, IPv4 and IPv6, so the phone can reach the
// laptop – also in IPv6-only phone hotspots.
const host = '::';

export default defineConfig({
  plugins: [
    phoneRemote({
      title: 'Demo Remote',
      // lang: 'de',
      // css: 'remote-theme.css',
    }),
  ],
  server: { host },
  preview: { host },
});

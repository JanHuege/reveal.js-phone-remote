import { printConnectInfo } from "./announce.js";
import { createRemote } from "./middleware.js";

export default function phoneRemote(options = {}) {
  const remote = createRemote(options);

  const mount = (server) => {
    server.middlewares.use(remote.handle);
    if (options.qr !== false) printConnectInfo(server.httpServer, remote);
  };

  return {
    name: "reveal-phone-remote",
    config: () => ({
      server: { allowedHosts: [".local"] },
      preview: { allowedHosts: [".local"] },
    }),
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

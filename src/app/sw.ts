/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { NetworkFirst, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: Array<string | { url: string; revision?: string }> };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ url }) => url.pathname === "/version.json",
      handler: new NetworkFirst({ cacheName: "lasu-version", networkTimeoutSeconds: 3 }),
    },
  ],
});

serwist.addEventListeners();

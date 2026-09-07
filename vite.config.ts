import { defineConfig, loadEnv, mergeConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Standalone Vite + TanStack Start config (no external build-tooling package).
// SSR entry is src/server.ts. Deploy target is Cloudflare Workers via Nitro's
// "cloudflare-module" preset — swap the nitro() preset below if you're
// deploying elsewhere (e.g. "node-server" for a plain Node host).

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return mergeConfig(
    {
      server: { host: "::", port: 8080 },
    },
    {
      define: envDefine,
      css: { transformer: "lightningcss" },
      resolve: {
        alias: { "@": `${process.cwd()}/src` },
        dedupe: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "@tanstack/react-query",
          "@tanstack/query-core",
        ],
      },
      optimizeDeps: {
        include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
        ignoreOutdatedRequests: true,
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes("node_modules/@supabase")) return "vendor-supabase";
              if (id.includes("node_modules/@sentry")) return "vendor-sentry";
              if (id.includes("node_modules/lucide-react")) return "vendor-lucide";
              if (id.includes("node_modules/sonner")) return "vendor-sonner";
            },
          },
        },
      },
      server: {
        watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
      },
      plugins: [
        tailwindcss(),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
        tanstackStart({
          importProtection: {
            behavior: "error",
            client: { files: ["**/server/**"], specifiers: ["server-only"] },
          },
          server: { entry: "server" },
        }),
        nitro({
          defaultPreset: "cloudflare-module",
          cron: {
            "0 3 * * *": { handler: "/api/cron/check-sources", description: "Daily source health check" },
          },
        }),
        viteReact(),
      ],
    },
  );
});

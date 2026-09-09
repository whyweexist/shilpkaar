import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
      manifest: false,
      injectRegister: "auto",
      devOptions: { enabled: true, type: "module" },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shilpkaar/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
  },
  server: {
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});

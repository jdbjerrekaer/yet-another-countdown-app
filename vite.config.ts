import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync } from "fs";

// Plugin to copy index.html to 404.html for GitHub Pages SPA routing
const copy404Plugin = () => ({
  name: "copy-404",
  closeBundle() {
    const base = process.env.VITE_BASE_PATH || "/";
    const distPath = path.resolve(__dirname, "dist");
    try {
      copyFileSync(
        path.join(distPath, "index.html"),
        path.join(distPath, "404.html")
      );
    } catch (err) {
      console.warn("Could not copy index.html to 404.html:", err);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base path for GitHub Pages (set via VITE_BASE_PATH env var, defaults to "/")
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    copy404Plugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

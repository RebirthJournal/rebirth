// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { loadEnv } from "vite-plus";

const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const repository = process.env.PUBLIC_KEYSTATIC_GITHUB_REPO || env.PUBLIC_KEYSTATIC_GITHUB_REPO;

// https://astro.build/config
export default defineConfig({
  site: "https://www.rebirthjournal.net",
  build: { format: "preserve" },
  redirects: { "/关于.html": { status: 301, destination: "/%E5%85%B3%E4%BA%8E/" } },
  // Local editing runs only in development. Deployed editing uses GitHub.
  integrations: [
    react(),
    ...(process.env.NODE_ENV !== "production" || repository ? [keystatic()] : []),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel({ imageService: true }),
});

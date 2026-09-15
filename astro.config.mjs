// @ts-check
import fs from "node:fs";
import { defineConfig } from "astro/config";
import yaml from "yaml";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { loadEnv } from "vite-plus";

const issuesDir = "src/content/issues";
/** @type {Record<string, { status: import("astro").ValidRedirectStatus, destination: string }>} */
const issueRedirects = {};
if (fs.existsSync(issuesDir)) {
  for (const file of fs.readdirSync(issuesDir)) {
    if (!file.endsWith(".yaml")) continue;
    try {
      const content = yaml.parse(fs.readFileSync(`${issuesDir}/${file}`, "utf8"));
      if (content?.path && content?.chapters?.[0]) {
        const issueSlug = content.path;
        const firstChapter = content.chapters[0];
        const destination = `/期刊/${firstChapter}/`;
        issueRedirects[`/期刊/${issueSlug}`] = {
          status: 308,
          destination,
        };
      }
    } catch {
      // Ignore invalid files
    }
  }
}

const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const repository = process.env.PUBLIC_KEYSTATIC_GITHUB_REPO || env.PUBLIC_KEYSTATIC_GITHUB_REPO;

// https://astro.build/config
export default defineConfig({
  site: "https://www.rebirthjournal.net",
  build: { format: "preserve" },
  redirects: {
    "/关于.html": { status: 301, destination: "/关于/" },
    ...issueRedirects,
  },
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

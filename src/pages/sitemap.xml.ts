import type { APIRoute } from "astro";
import { getJournal, journalUrl } from "../lib/content";

// Issue pages redirect (308, noindex) to their first chapter, so they are omitted.
export const GET: APIRoute = async () => {
  const { chapters, articles } = await getJournal();
  const paths = [
    "/",
    "/关于/",
    journalUrl(),
    ...chapters.map(({ slug }) => journalUrl(slug)),
    ...articles.map(({ slug }) => journalUrl(slug)),
  ];
  const urls = paths.map(
    (path) => `  <url><loc>${new URL(path, import.meta.env.SITE).href}</loc></url>`,
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};

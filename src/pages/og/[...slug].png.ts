import type { APIRoute, GetStaticPaths } from "astro";
import { getJournal, nameOf } from "../../lib/content";
import { renderOgImage, type OgContent } from "../../lib/og/image";

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const { settings, chapters, articles } = await getJournal();
  const page = (slug: string, content: OgContent) => ({ params: { slug }, props: { ...content } });
  return [
    page("home", { title: settings.tagline, subtitle: "《新生》文学期刊", home: true }),
    page("about", { title: "关于《新生》", subtitle: settings.tagline }),
    page("journal", { title: "全部期刊", subtitle: settings.tagline }),
    ...settings.issues.map((slug) =>
      page(`journal/${slug}`, { title: slug, subtitle: settings.tagline, context: "期刊目录" }),
    ),
    ...chapters.map(({ slug }) =>
      page(`journal/${slug}`, { title: nameOf(slug), context: slug.split("/")[0] }),
    ),
    ...articles.map(({ slug, entry }) =>
      page(`journal/${slug}`, {
        title: entry.title,
        subtitle: entry.author || undefined,
        context: slug.split("/").slice(0, 2).join(" · "),
      }),
    ),
  ];
};

export const GET: APIRoute = ({ props }) => renderOgImage(props as OgContent);

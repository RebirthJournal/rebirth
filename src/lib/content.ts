import { createReader } from "@keystatic/core/reader";
import config from "../../keystatic.config";

export const reader = createReader(process.cwd(), config);
export type Article = Awaited<ReturnType<typeof reader.collections.articles.readOrThrow>>;
export type Chapter = Awaited<ReturnType<typeof reader.collections.chapters.readOrThrow>>;

type MdxModule = {
  default: (_props: { components?: Record<string, unknown> }) => unknown;
  frontmatter: Record<string, unknown>;
};

const articleModules = import.meta.glob<MdxModule>("/src/content/articles/**/*.mdx");
const chapterModules = import.meta.glob<MdxModule>("/src/content/chapters/**/*.mdx");

export function getArticleComponent(slug: string) {
  return articleModules[`/src/content/articles/${slug}.mdx`];
}

export function getChapterComponent(slug: string) {
  return chapterModules[`/src/content/chapters/${slug}.mdx`];
}

export function description(source: string) {
  if (!source) return "";
  return source
    .replace(/<[^>]*>/g, "")
    .replace(/^#+\s+/gm, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~>]/g, "")
    .replace(/\s+/g, "")
    .slice(0, 80);
}
export const nameOf = (slug: string) => slug.split("/").at(-1)!;
export const journalUrl = (slug = "") =>
  `/${encodeURIComponent("期刊")}/${slug ? slug.split("/").map(encodeURIComponent).join("/") + "/" : ""}`;

let journalCache: Promise<Awaited<ReturnType<typeof loadJournal>>> | null = null;

async function loadJournal() {
  const [settings, issues, chapters, articles] = await Promise.all([
    reader.singletons.journal.readOrThrow(),
    reader.collections.issues.all(),
    reader.collections.chapters.all(),
    reader.collections.articles.all(),
  ]);
  const issueMap = new Map(issues.map((item) => [item.slug, item.entry]));
  const chapterMap = new Map(chapters.map((item) => [item.slug, item.entry]));
  const articleMap = new Map(articles.map((item) => [item.slug, item.entry]));

  function requireReferences(
    owner: string,
    refs: readonly string[],
    entries: Map<string, unknown>,
    parent?: string,
  ) {
    if (new Set(refs).size !== refs.length)
      throw new Error(`${owner}: duplicate content reference`);
    for (const ref of refs) {
      if (!entries.has(ref)) throw new Error(`${owner}: missing content ${ref}`);
      if (parent && ref.slice(0, ref.lastIndexOf("/")) !== parent) {
        throw new Error(`${owner}: ${ref} must belong to ${parent}`);
      }
    }
  }

  requireReferences("journal", settings.issues, issueMap);
  for (const { slug, entry } of issues) {
    if (!entry.chapters.length) throw new Error(`${slug}: at least one chapter is required`);
    requireReferences(slug, entry.chapters, chapterMap, slug);
  }
  for (const { slug, entry } of chapters) {
    if (!issueMap.has(slug.split("/")[0])) throw new Error(`${slug}: missing parent issue`);
    requireReferences(slug, entry.articles, articleMap, slug);
  }

  const issueUrl = (slug: string) => journalUrl(issueMap.get(slug)?.chapters[0] ?? slug);

  return { settings, issues, chapters, articles, issueMap, chapterMap, articleMap, issueUrl };
}

export function getJournal() {
  if (import.meta.env.DEV) return loadJournal();
  return (journalCache ??= loadJournal());
}

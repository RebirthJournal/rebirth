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

  const sourceOf = (owner: string) =>
    owner === "journal"
      ? "src/content/settings/journal.yaml"
      : issueMap.has(owner)
        ? `src/content/issues/${owner}.yaml`
        : `src/content/chapters/${owner}.mdx`;
  const problems: string[] = [];

  function requireReferences(
    owner: string,
    refs: readonly string[],
    entries: Map<string, unknown>,
    parent?: string,
  ) {
    const source = sourceOf(owner);
    if (new Set(refs).size !== refs.length) problems.push(`${source}: 引用列表中有重复条目`);
    for (const ref of refs) {
      if (!entries.has(ref))
        problems.push(
          `${source}: 引用了不存在的条目「${ref}」— 请先创建该条目，或从引用列表中移除`,
        );
      if (parent && ref.slice(0, ref.lastIndexOf("/")) !== parent) {
        problems.push(`${source}: 「${ref}」不属于「${parent}」— 请检查条目路径或引用位置`);
      }
    }
  }

  requireReferences("journal", settings.issues, issueMap);
  for (const { slug, entry } of issues) {
    if (!entry.chapters.length) problems.push(`src/content/issues/${slug}.yaml: 至少需要一章`);
    requireReferences(slug, entry.chapters, chapterMap, slug);
  }
  for (const { slug, entry } of chapters) {
    const issue = slug.split("/")[0];
    if (!issueMap.has(issue))
      problems.push(`src/content/chapters/${slug}.mdx: 找不到所属期号「${issue}」`);
    requireReferences(slug, entry.articles, articleMap, slug);
  }

  if (problems.length) {
    const message = `内容引用校验失败，共 ${problems.length} 处：\n- ${problems.join("\n- ")}`;
    if (!import.meta.env.DEV) throw new Error(message);
    console.warn(`开发环境已跳过以下内容问题（生产构建仍会阻止部署）：\n${message}`);
  }

  // In dev, hide unresolved references from pages instead of crashing on them.
  const tolerant = import.meta.env.DEV && problems.length > 0;
  const belongsTo = (ref: string, parent: string) => ref.slice(0, ref.lastIndexOf("/")) === parent;
  const validRefs = (refs: readonly string[], parent: string, entries: Map<string, unknown>) =>
    [...new Set(refs)].filter((ref) => entries.has(ref) && belongsTo(ref, parent));

  const visibleIssues = tolerant
    ? issues
        .map(({ slug, entry }) => ({
          slug,
          entry: { ...entry, chapters: validRefs(entry.chapters, slug, chapterMap) },
        }))
        .filter(({ entry }) => entry.chapters.length > 0)
    : issues;
  const issueSlugs = new Set(visibleIssues.map(({ slug }) => slug));
  const visibleChapters = tolerant
    ? chapters
        .filter(({ slug }) => issueSlugs.has(slug.split("/")[0]))
        .map(({ slug, entry }) => ({
          slug,
          entry: { ...entry, articles: validRefs(entry.articles, slug, articleMap) },
        }))
    : chapters;
  const chapterSlugs = new Set(visibleChapters.map(({ slug }) => slug));
  const visibleArticles = tolerant
    ? articles.filter(({ slug }) => chapterSlugs.has(slug.split("/").slice(0, 2).join("/")))
    : articles;
  const visibleSettings = tolerant
    ? { ...settings, issues: [...new Set(settings.issues)].filter((ref) => issueSlugs.has(ref)) }
    : settings;

  const visibleIssueMap = new Map(visibleIssues.map((item) => [item.slug, item.entry]));
  const visibleChapterMap = new Map(visibleChapters.map((item) => [item.slug, item.entry]));
  const visibleArticleMap = new Map(visibleArticles.map((item) => [item.slug, item.entry]));

  const issueUrl = (slug: string) => journalUrl(slug);

  return {
    settings: visibleSettings,
    issues: visibleIssues,
    chapters: visibleChapters,
    articles: visibleArticles,
    issueMap: visibleIssueMap,
    chapterMap: visibleChapterMap,
    articleMap: visibleArticleMap,
    issueUrl,
  };
}

export function getJournal() {
  if (import.meta.env.DEV) return loadJournal();
  return (journalCache ??= loadJournal());
}

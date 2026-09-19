import MarkdownIt, { type MarkdownIt as MarkdownItInstance } from "markdown-it";
import attributes from "markdown-it-attrs";
import footnotes from "markdown-it-footnote";

const markdown = new MarkdownIt({ html: true, typographer: true, quotes: "“”‘’" })
  .use(attributes, { allowedAttributes: ["class", "id", "style", "caption"] })
  // The plugin's DefinitelyTyped package still targets markdown-it 12.
  .use(footnotes as unknown as (md: MarkdownItInstance) => void);

// Adapt Kramdown syntax at rendering time, keeping the archived source intact.
function prepare(source: string) {
  let fenced = false;
  return source
    .split("\n")
    .map((line) => {
      if (/^\s*(?:```|~~~)/.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced) return line;
      return line
        .replace(/\{::comment\}[\s\S]*?\{:\/comment\}/g, "")
        .replace(/!\[([^\]]*)\]\((\/img\/[^\n]*?)\)/g, (_, alt, path) => `![${alt}](<${path}>)`)
        .replace(/\*\.\*\{:\.space\}/g, '<em class="space">.</em>')
        .replace(
          /\{:\s*([^{}]+)\}/g,
          (_, attrs: string) => `{${attrs.replace(/\.([\w-]+)(?=\.|\s|$)/g, ".$1 ")}}`,
        )
        .replace(/\\\\$/, "<br>");
    })
    .join("\n");
}

// Every image loads lazily and decodes off the main thread.
const defaultImage = markdown.renderer.rules.image!;
markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  tokens[index].attrSet("loading", "lazy");
  tokens[index].attrSet("decoding", "async");
  return defaultImage(tokens, index, options, env, self);
};

markdown.renderer.rules.footnote_anchor_name = (tokens, index, _options, env) => {
  const meta = tokens[index].meta;
  const label = typeof meta?.label === "string" ? meta.label : undefined;
  const docId = typeof env?.id === "string" ? env.id : "";
  return markdown.utils.escapeHtml(`${docId}-${label ?? Number(meta?.id) + 1}`);
};
markdown.renderer.rules.footnote_block_open = () =>
  '<div class="footnotes" role="doc-endnotes">\n<ol class="footnotes-list">\n';
markdown.renderer.rules.footnote_block_close = () => "</ol>\n</div>\n";

export function renderMarkdown(source: string, id: string) {
  return markdown.render(prepare(source), { id });
}

export function description(source: string) {
  return renderMarkdown(source, "description")
    .replace(/<[^>]*>/g, "")
    .replace(/\{:[^}]+\}/g, "")
    .replace(/\s+/g, "")
    .slice(0, 80);
}

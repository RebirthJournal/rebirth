# 《新生》网站

The site is live at <https://www.rebirthjournal.net>.

- Astro (React)
- Keystatic
- Tailwind CSS

## Editing

Contents are under `src/content/**/*.yaml`. They can be edited via Keystatic at the [online editor](https://www.rebirthjournal.net/keystatic). Anyone who has write access to this repo will be able to edit the articles.

Link articles into a chapter's **文章顺序**, and chapters into an issue's **章节顺序** to set reading order.

Articles are standard [Markdown](https://www.markdownguide.org/getting-started) files with the following extra syntax:

```markdown
![](/img/图片.jpg)
{:.caption.bottom.right.outside caption="作者"}

落款
{:.text-right}
```

## Development

Requires [Node.js](https://nodejs.org), [`pnpm`](https://pnpm.io), and [Vite+](https://viteplus.dev).

- Start the dev server with `pnpm dev`.
- Dev server: <http://127.0.0.1:4321>
- Local editor: <http://127.0.0.1:4321/keystatic>
- `pnpm check` checks TypeScript and Astro files.
- `pnpm build` creates the site and Vercel deployment output.

With no environment variables, Keystatic edits local files. Commit content changes alongside code. The production editor is enabled only when GitHub storage is configured.

Once pushed to the `main` branch, the site is automatically deployed on Vercel.

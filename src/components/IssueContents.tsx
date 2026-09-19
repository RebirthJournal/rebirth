import { Button } from "./ui/button";
import { Item, ItemContent, ItemTitle } from "./ui/item";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";

type Link = { name: string; href: string };
export default function IssueContents({
  name,
  start,
  chapters,
}: {
  name: string;
  start: string;
  chapters: (Link & { articles: (Link & { author: string })[] })[];
}) {
  return (
    <>
      <header className="w-full">
        <h1 className="font-mingti">{name}</h1>
        <Button asChild variant="link" className="journal-ui mt-4 min-h-11 px-0 text-base">
          <a href={start}>
            从头阅读
            <ArrowRightIcon weight="light" aria-hidden="true" />
          </a>
        </Button>
      </header>
      <div className="issue-chapters w-full">
        {chapters.map((chapter) => (
          <section key={chapter.href} className="mb-10">
            <h2 className="font-mingti">
              <Button
                asChild
                variant="link"
                className="h-auto min-h-11 justify-start px-0 text-lg text-inherit"
              >
                <a href={chapter.href}>{chapter.name}</a>
              </Button>
            </h2>
            <ul className="journal-ui m-0 list-none p-0">
              {chapter.articles.map((article) => (
                <li key={article.href}>
                  <Item asChild className="min-h-11 rounded-none px-0 py-2">
                    <a href={article.href}>
                      <ItemContent className="min-w-0">
                        <ItemTitle className="text-base font-normal leading-relaxed">
                          {article.name}
                        </ItemTitle>
                      </ItemContent>
                      {article.author && (
                        <span className="max-w-[40%] text-right text-sm text-muted-foreground">
                          {article.author}
                        </span>
                      )}
                    </a>
                  </Item>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

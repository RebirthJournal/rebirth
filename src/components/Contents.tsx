import { useEffect, useRef, useState } from "react";

type ChapterLink = {
  name: string;
  href: string;
  current: boolean;
  articles: { name: string; href: string; id: string }[];
};

export default function Contents({
  issue,
  chapters,
}: {
  issue: { name: string; href: string };
  chapters: ChapterLink[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState("");
  const contents = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (
        !contents.current?.contains(event.target as Node) &&
        !toggle.current?.contains(event.target as Node)
      )
        setExpanded(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
        toggle.current?.focus();
      }
    }
    let frame = 0;
    function updateActive() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const current = chapters.find((chapter) => chapter.current);
        let id = "";
        for (const article of current?.articles ?? []) {
          if ((document.getElementById(article.id)?.getBoundingClientRect().top ?? Infinity) <= 110)
            id = article.id;
        }
        setActive(id);
      });
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", updateActive);
      cancelAnimationFrame(frame);
    };
  }, [chapters]);

  return (
    <>
      <nav
        ref={contents}
        id="contents"
        aria-label="本期期刊目录"
        className={`flex flex-col flex-nowrap ${expanded ? "expanded" : ""}`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
        }}
      >
        <a href={issue.href} className="nav-link self-center">
          {issue.name}
        </a>
        {chapters.map((chapter) => (
          <ContentsChapter
            key={chapter.href}
            chapter={chapter}
            active={active}
            onNavigate={() => setExpanded(false)}
          />
        ))}
      </nav>
      <button
        ref={toggle}
        id="contents-toggle"
        type="button"
        className={expanded ? "expanded" : ""}
        aria-label="展开目录"
        aria-controls="contents"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded(true);
          requestAnimationFrame(() => contents.current?.querySelector("a")?.focus());
        }}
      />
    </>
  );
}

function ContentsChapter({
  chapter,
  active,
  onNavigate,
}: {
  chapter: ChapterLink;
  active: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <a
        className={`nav-link ${chapter.current ? "active" : ""}`}
        href={chapter.href}
        aria-current={chapter.current ? "page" : undefined}
        onClick={onNavigate}
      >
        {chapter.name}
      </a>
      <nav className="flex flex-col flex-nowrap shrink-0" aria-label={chapter.name}>
        {chapter.articles.map((article) => (
          <a
            key={article.href}
            className={`nav-link ${chapter.current && active === article.id ? "active" : ""}`}
            href={article.href}
            aria-current={chapter.current && active === article.id ? "location" : undefined}
            onClick={onNavigate}
          >
            {article.name}
          </a>
        ))}
      </nav>
    </>
  );
}

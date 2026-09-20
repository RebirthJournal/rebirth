import { useEffect, useRef, useState } from "react";

export default function Header({ issues }: { issues: { name: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const dropdown = useRef<HTMLLIElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (!dropdown.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return (
    <nav className="navbar sticky top-0 flex items-center px-4 py-2" aria-label="主导航">
      <a className="navbar-brand" rel="author" href="/">
        <img
          src="/img/logo-white-black-horizontal.png"
          alt="《新生》首页"
          style={{ width: "3em", height: "auto" }}
        />
      </a>
      <ul className="ml-auto flex list-none m-0 p-0">
        <li
          ref={dropdown}
          className="relative"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              toggle.current?.focus();
            }
          }}
        >
          <button
            ref={toggle}
            type="button"
            className="dark-link nav-link issues-toggle"
            aria-expanded={open}
            aria-controls="issues-menu"
            onClick={() => setOpen(!open)}
          >
            期刊
          </button>
          <div id="issues-menu" className="issues-menu" hidden={!open}>
            {issues.map((issue) => (
              <a key={issue.href} className="dark-link" href={issue.href}>
                {issue.name}
              </a>
            ))}
          </div>
          <noscript>
            <a className="dark-link nav-link" href="/期刊/">
              期刊目录
            </a>
          </noscript>
        </li>
        <li>
          <a className="dark-link nav-link" href="/关于/">
            关于
          </a>
        </li>
      </ul>
    </nav>
  );
}

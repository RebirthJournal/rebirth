import { Fragment, type CSSProperties, type ReactNode } from "react";
import { Button } from "./ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";

type Link = { name: string; href: string };
type ChapterLink = Link & { current: boolean; articles: (Link & { current: boolean })[] };
type Props = {
  issue: Link;
  issues: Link[];
  chapters: ChapterLink[];
  breadcrumbs: Link[];
  children: ReactNode;
};

export default function Reader(props: Props) {
  return (
    <SidebarProvider
      className="reader-layout min-h-[calc(100svh-3.5rem)]"
      style={{ "--sidebar-width": "16rem" } as CSSProperties}
    >
      <ReaderContents {...props} />
      <div className="min-w-0 flex-1">
        <ReaderToolbar breadcrumbs={props.breadcrumbs} />
        {props.children}
      </div>
    </SidebarProvider>
  );
}

function ReaderToolbar({ breadcrumbs }: Pick<Props, "breadcrumbs">) {
  const { open, openMobile, isMobile } = useSidebar();
  return (
    <div className="reader-toolbar journal-ui sticky top-14 z-20 flex min-h-12 items-center gap-3 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger
        className="size-11 shrink-0"
        aria-label="切换目录"
        title="切换目录"
        aria-expanded={isMobile ? openMobile : open}
        aria-controls="issue-contents"
      />
      <Breadcrumb aria-label="当前位置" className="min-w-0">
        <BreadcrumbList>
          {breadcrumbs.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className="min-w-0">
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage className="line-clamp-1">{link.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={link.href}>{link.name}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

function ReaderContents({ issue, issues, chapters }: Props) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar className="top-14 h-[calc(100svh-3.5rem)]" aria-label="本期目录">
      <SidebarHeader className="journal-ui flex-row items-center gap-1 border-b p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-11 flex-1 justify-between px-3 text-base"
              aria-label={`切换期刊，当前为${issue.name}`}
            >
              {issue.name}
              <CaretDownIcon weight="light" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="journal-ui w-56">
            {issues.map((item) => (
              <DropdownMenuItem
                key={item.href}
                asChild
                className="min-h-11"
                onSelect={() => setOpenMobile(false)}
              >
                <a
                  href={item.href}
                  aria-current={item.href === issue.href ? "true" : undefined}
                  className={item.href === issue.href ? "font-bold" : undefined}
                >
                  {item.name}
                </a>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="min-h-11">
              <a href="/期刊/">全部期刊</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 lg:hidden"
          aria-label="关闭目录"
          onClick={() => setOpenMobile(false)}
        >
          <XIcon weight="light" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="journal-ui overscroll-contain">
        <SidebarGroup>
          <nav id="issue-contents" aria-label={`${issue.name}目录`}>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="h-11"
                  isActive={!chapters.some((chapter) => chapter.current)}
                >
                  <a
                    href={issue.href}
                    onClick={() => setOpenMobile(false)}
                    aria-current={!chapters.some((chapter) => chapter.current) ? "page" : undefined}
                  >
                    本期目录
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {chapters.map((chapter) => (
                <Collapsible
                  key={chapter.href}
                  defaultOpen={chapter.current}
                  className="group/chapter"
                  asChild
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={chapter.current}
                      className="h-auto min-h-11 py-2 pr-11 [&>span:last-child]:whitespace-normal"
                    >
                      <a
                        href={chapter.href}
                        onClick={() => setOpenMobile(false)}
                        aria-current={
                          chapter.current && !chapter.articles.some((article) => article.current)
                            ? "page"
                            : undefined
                        }
                      >
                        <span>{chapter.name}</span>
                      </a>
                    </SidebarMenuButton>
                    {chapter.articles.length > 0 && (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuAction
                            className="top-0 right-0 size-11"
                            aria-label={`${chapter.name}的文章`}
                          >
                            <CaretRightIcon
                              weight="light"
                              className="transition-transform group-data-[state=open]/chapter:rotate-90 motion-reduce:transition-none"
                            />
                          </SidebarMenuAction>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {chapter.articles.map((article) => (
                              <SidebarMenuSubItem key={article.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={article.current}
                                  className="h-auto min-h-11 py-2 leading-relaxed [&>span:last-child]:whitespace-normal"
                                >
                                  <a
                                    href={article.href}
                                    onClick={() => setOpenMobile(false)}
                                    aria-current={article.current ? "page" : undefined}
                                  >
                                    <span>{article.name}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

import { Button } from "./ui/button";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";

type Link = { name: string; href: string };
export default function ReadingPagination({
  previous,
  next,
  label,
}: {
  previous?: Link;
  next?: Link;
  label: string;
}) {
  return (
    <nav
      className="reading-pagination journal-ui mx-auto flex w-full max-w-2xl items-start justify-between gap-4 border-t pt-6"
      aria-label={label}
    >
      {previous && (
        <Button
          asChild
          variant="ghost"
          className="h-auto min-h-11 max-w-[48%] justify-start whitespace-normal text-left"
        >
          <a href={previous.href} rel="prev">
            <ArrowLeftIcon weight="light" aria-hidden="true" />
            <span>{previous.name}</span>
          </a>
        </Button>
      )}
      {next && (
        <Button
          asChild
          variant="ghost"
          className="ml-auto h-auto min-h-11 max-w-[48%] justify-end whitespace-normal text-right"
        >
          <a href={next.href} rel="next">
            <span>{next.name}</span>
            <ArrowRightIcon weight="light" aria-hidden="true" />
          </a>
        </Button>
      )}
    </nav>
  );
}

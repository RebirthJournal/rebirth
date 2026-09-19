import { Item, ItemContent, ItemTitle, ItemActions } from "./ui/item";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";

export default function IssueList({ issues }: { issues: { name: string; href: string }[] }) {
  return (
    <ul className="journal-ui w-full list-none p-0">
      {issues.map((issue) => (
        <li key={issue.href}>
          <Item asChild className="rounded-none border-b border-border px-0 py-6">
            <a href={issue.href}>
              <ItemContent className="gap-2">
                <ItemTitle className="font-mingti text-xl">{issue.name}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <ArrowRightIcon weight="light" size={18} aria-hidden="true" />
              </ItemActions>
            </a>
          </Item>
        </li>
      ))}
    </ul>
  );
}

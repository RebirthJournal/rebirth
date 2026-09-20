import { Item, ItemContent, ItemTitle, ItemActions } from "./ui/item";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";

type Issue = {
  name: string;
  href: string;
};

export default function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <ul className="journal-ui w-full list-none border-t border-border p-0">
      {issues.map((issue) => (
        <li key={issue.href} className="border-b border-border">
          <Item
            asChild
            className="issue-link flex-nowrap rounded-none border-0 px-3 py-6 sm:px-5 sm:py-7"
          >
            <a href={issue.href}>
              <ItemContent className="min-w-0">
                <ItemTitle className="font-mingti text-2xl">{issue.name}</ItemTitle>
              </ItemContent>
              <ItemActions className="shrink-0 text-muted-foreground">
                <ArrowRightIcon weight="light" size={18} aria-hidden="true" />
              </ItemActions>
            </a>
          </Item>
        </li>
      ))}
    </ul>
  );
}

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "./ui/navigation-menu";

export default function Header({ pathname }: { pathname: string }) {
  return (
    <header className="site-header journal-ui sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
      <a href="/" aria-label="《新生》首页" className="flex min-h-11 items-center">
        <img src="/img/logo-black-transparent-horizontal.png" alt="新生" className="w-16 h-auto" />
      </a>
      <NavigationMenu aria-label="主导航" viewport={false}>
        <NavigationMenuList>
          {[
            { name: "期刊", href: "/期刊/" },
            { name: "关于", href: "/关于/" },
          ].map((link) => (
            <NavigationMenuItem key={link.href}>
              <NavigationMenuLink
                href={link.href}
                active={pathname.startsWith(link.href)}
                data-active={pathname.startsWith(link.href)}
                aria-current={pathname === link.href ? "page" : undefined}
                className="min-h-11 justify-center px-4"
              >
                {link.name}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDash, IconList, IconAdd, IconTree, IconHeart, IconHistory, IconMoney, IconTasks } from "./icons";
import { useT } from "./I18nProvider";

const tabs = [
  { href: "/", key: "tabs.home", icon: IconDash, exact: true },
  { href: "/sheep", key: "tabs.list", icon: IconList },
  { href: "/sheep/new", key: "tabs.add", icon: IconAdd, exact: true },
  { href: "/tree", key: "tabs.tree", icon: IconTree },
  { href: "/breeding", key: "tabs.breed", icon: IconHeart },
  { href: "/tasks", key: "tabs.tasks", icon: IconTasks },
  { href: "/finance", key: "tabs.finance", icon: IconMoney },
  { href: "/history", key: "tabs.history", icon: IconHistory },
];

export default function TabBar() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="tabbar">
      {tabs.map(({ href, key, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : (pathname === href || pathname.startsWith(href + "/")) &&
            !(href === "/sheep" && pathname === "/sheep/new");
        return (
          <Link key={href} href={href} className={`tab${active ? " is-active" : ""}`}>
            <Icon size={23} /><span>{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

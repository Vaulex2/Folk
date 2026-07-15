"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDash, IconList, IconAdd, IconTree, IconHeart, IconSheep } from "./icons";
import { useT } from "./I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";

const links = [
  { href: "/", key: "nav.dashboard", icon: IconDash, exact: true },
  { href: "/sheep", key: "nav.sheepList", icon: IconList },
  { href: "/sheep/new", key: "nav.addSheep", icon: IconAdd, exact: true },
  { href: "/tree", key: "nav.familyTree", icon: IconTree },
  { href: "/breeding", key: "nav.breedingCheck", icon: IconHeart },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function SideNav({ flockName }: { flockName: string }) {
  const pathname = usePathname();
  const t = useT();
  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark"><IconSheep /></span>
        {flockName}
      </div>
      {links.map(({ href, key, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact) &&
          !(href === "/sheep" && pathname === "/sheep/new");
        return (
          <Link key={href} href={href} className={`side-link${active ? " is-active" : ""}`}>
            <Icon /><span>{t(key)}</span>
          </Link>
        );
      })}
      <div className="side-foot">
        <div style={{ marginBottom: 12 }}><LanguageSwitcher className="input" /></div>
        {t("nav.sideFoot")}
      </div>
    </aside>
  );
}

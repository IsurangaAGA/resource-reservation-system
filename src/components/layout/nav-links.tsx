"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/resources", label: "Resources" },
  { href: "/reservations", label: "Reservations" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.endsWith("/new"));
}

export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 text-sm" aria-label="Main">
      {links.map((link) => {
        const active = pathname !== null && isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-1.5 py-2 font-medium whitespace-nowrap transition-colors sm:px-3",
              active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

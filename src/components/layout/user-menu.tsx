"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/lib/auth/actions";
import { Badge } from "@/components/ui/badge";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function UserMenu({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const pathname = usePathname();

  // Close after navigating: the menu only stays open on the page it was opened on.
  const isOpen = open && openedAt === pathname;

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const itemClass = "block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen(!isOpen);
          setOpenedAt(pathname);
        }}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 ring-offset-2 transition hover:bg-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
      >
        {initials(name)}
      </button>
      {isOpen && (
        <div
          id={menuId}
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-slate-900">{name}</p>
              {isAdmin && <Badge tone="indigo">Admin</Badge>}
            </div>
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>
          <Link href="/reservations?mine=1" className={itemClass}>
            My reservations
          </Link>
          <Link href="/account" className={itemClass}>
            Account settings
          </Link>
          {isAdmin && (
            <Link href="/people" className={itemClass}>
              People &amp; roles
            </Link>
          )}
          <form action={logout} className="border-t border-slate-100">
            <button type="submit" className={`${itemClass} text-rose-600 hover:text-rose-700`}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

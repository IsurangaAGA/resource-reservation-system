import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-8", className)}>
      <rect width="64" height="64" rx="14" fill="#4f46e5" />
      <rect x="14" y="18" width="36" height="32" rx="5" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M14 28h36M24 12v10M40 12v10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M25 39l5 5 9-10" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-slate-900">
      <LogoMark />
      <span className={cn(compact && "hidden sm:inline")}>ResourceHub</span>
    </Link>
  );
}

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form";
import { RESOURCE_STATUS_LABELS, RESOURCE_STATUSES, RESOURCE_TYPE_LABELS, RESOURCE_TYPES } from "@/lib/constants";

/** Plain GET form: filters live in the URL, so results are shareable and work without JS. */
export function ResourceFilters({ q, type, status }: { q?: string; type?: string; status?: string }) {
  const active = Boolean(q || type || status);
  return (
    <form method="get" className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <label className="flex-1">
        <span className="mb-1.5 block text-xs font-medium text-slate-600">Search</span>
        <input name="q" type="search" defaultValue={q} placeholder="Name, location or description" className={inputClasses()} />
      </label>
      <label className="sm:w-44">
        <span className="mb-1.5 block text-xs font-medium text-slate-600">Type</span>
        <select name="type" defaultValue={type ?? ""} className={inputClasses()}>
          <option value="">All types</option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {RESOURCE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:w-40">
        <span className="mb-1.5 block text-xs font-medium text-slate-600">Status</span>
        <select name="status" defaultValue={status ?? ""} className={inputClasses()}>
          <option value="">Any status</option>
          {RESOURCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {RESOURCE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className={buttonClasses({ variant: "secondary" })}>
          Apply
        </button>
        {active && (
          <Link href="/resources" className={buttonClasses({ variant: "ghost" })}>
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}

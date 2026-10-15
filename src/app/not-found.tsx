import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Not found</h1>
      <p className="mt-2 text-sm text-slate-500">The resource or reservation you are looking for does not exist or was removed.</p>
      <LinkButton href="/" className="mt-6">
        Back to dashboard
      </LinkButton>
    </div>
  );
}

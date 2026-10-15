import { LogoMark } from "@/components/layout/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-indigo-600 p-12 text-indigo-50 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold text-white">
          <LogoMark className="size-10" />
          ResourceHub
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Book shared spaces and equipment without the clashes.</h2>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex gap-3">
              <Check /> See what is free right now and what is coming up.
            </li>
            <li className="flex gap-3">
              <Check /> Overlapping bookings are rejected automatically.
            </li>
            <li className="flex gap-3">
              <Check /> Reschedule or cancel in a couple of clicks.
            </li>
          </ul>
        </div>
        <p className="text-xs text-indigo-200">Meeting rooms · Equipment · Vehicles · Workspaces</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-indigo-500/40" aria-hidden />
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 font-semibold text-slate-900 lg:hidden">
            <LogoMark />
            ResourceHub
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-5 shrink-0 text-indigo-200" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/redirect";
import { firstParam } from "@/lib/page-helpers";

export const metadata: Metadata = { title: "Sign in" };

const DEMO_ACCOUNTS = [
  { label: "Administrator", email: "alice@primewave.lk" },
  { label: "Member", email: "bob@primewave.lk" },
];
const DEMO_PASSWORD = "Password123";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
      <p className="mt-1 mb-8 text-sm text-slate-500">Welcome back. Sign in to manage your reservations.</p>
      <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <DemoAccounts />
      </Suspense>
    </>
  );
}

/**
 * Lists the seeded demo logins in development, or in production when
 * SHOW_DEMO_ACCOUNTS=true. Read at request time so the flag can change without a rebuild.
 */
async function DemoAccounts() {
  await connection();
  if (process.env.NODE_ENV === "production" && process.env.SHOW_DEMO_ACCOUNTS !== "true") return null;
  return (
    <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-600">
      <p className="font-medium text-slate-800">Demo accounts (after running the seed)</p>
      <ul className="mt-2 space-y-1">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            {account.label}: <code className="font-mono text-slate-800">{account.email}</code>
          </li>
        ))}
        <li>
          Password: <code className="font-mono text-slate-800">{DEMO_PASSWORD}</code>
        </li>
      </ul>
    </div>
  );
}

/** Signed-in visitors skip the form; everyone else sees it. */
async function LoginGate({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = safeNextPath(firstParam((await searchParams).next));
  if (await getCurrentUser()) redirect(next);
  return <LoginForm next={next} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-1 mb-8 text-sm text-slate-500">Book rooms, equipment and vehicles in seconds.</p>
      <Suspense fallback={<Skeleton className="h-[30rem] rounded-xl" />}>
        <RegisterGate />
      </Suspense>
    </>
  );
}

async function RegisterGate() {
  if (await getCurrentUser()) redirect("/");
  return <RegisterForm />;
}

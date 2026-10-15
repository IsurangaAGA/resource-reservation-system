"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field, inputClasses } from "@/components/ui/form";

const initialState: FormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert title={state.error} />}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          required
          autoFocus
          aria-invalid={Boolean(errors.email)}
          className={inputClasses(Boolean(errors.email))}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors.password)}
          className={inputClasses(Boolean(errors.password))}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert title={state.error} />}
      <Field label="Full name" htmlFor="name" error={errors.name} required>
        <input
          id="name"
          name="name"
          autoComplete="name"
          defaultValue={values.name}
          required
          autoFocus
          aria-invalid={Boolean(errors.name)}
          className={inputClasses(Boolean(errors.name))}
        />
      </Field>
      <Field label="Work email" htmlFor="email" error={errors.email} required>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={values.email}
          required
          aria-invalid={Boolean(errors.email)}
          className={inputClasses(Boolean(errors.email))}
        />
      </Field>
      <Field label="Department" htmlFor="department" error={errors.department} hint="Optional — shown next to your bookings.">
        <input
          id="department"
          name="department"
          autoComplete="organization-title"
          defaultValue={values.department}
          className={inputClasses(Boolean(errors.department))}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={errors.password}
        hint="At least 8 characters, including a letter and a number."
        required
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.password)}
          className={inputClasses(Boolean(errors.password))}
        />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword} required>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.confirmPassword)}
          className={inputClasses(Boolean(errors.confirmPassword))}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </p>
    </form>
  );
}

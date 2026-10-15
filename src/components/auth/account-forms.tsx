"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, saveProfile, type FormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field, inputClasses } from "@/components/ui/form";

const initialState: FormState = {};

export function ProfileForm({ name, department }: { name: string; department: string | null }) {
  const [state, action, pending] = useActionState(saveProfile, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert title={state.error} />}
      {state.success && <Alert tone="info" title={state.success} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" error={errors.name} required>
          <input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={state.values?.name ?? name}
            required
            className={inputClasses(Boolean(errors.name))}
          />
        </Field>
        <Field label="Department" htmlFor="department" error={errors.department}>
          <input
            id="department"
            name="department"
            defaultValue={state.values?.department ?? department ?? ""}
            className={inputClasses(Boolean(errors.department))}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState);
  const errors = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the password fields after a successful change.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-5" noValidate>
      {state.error && <Alert title={state.error} />}
      {state.success && <Alert tone="info" title={state.success} />}
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword} required>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClasses(Boolean(errors.currentPassword))}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="New password"
          htmlFor="newPassword"
          error={errors.newPassword}
          hint="At least 8 characters, with a letter and a number."
          required
        >
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            className={inputClasses(Boolean(errors.newPassword))}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword} required>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className={inputClasses(Boolean(errors.confirmPassword))}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

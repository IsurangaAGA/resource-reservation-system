"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inputClasses } from "@/components/ui/form";
import { apiRequest, toApiError } from "@/lib/api-client";

type Role = "ADMIN" | "MEMBER";

export function RoleSelect({ userId, role, userName }: { userId: string; role: Role; userName: string }) {
  const router = useRouter();
  const [value, setValue] = useState<Role>(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: Role) {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        await apiRequest(`/api/users/${userId}`, { method: "PATCH", body: { role: next } });
        router.refresh();
      } catch (err) {
        setValue(previous);
        setError(toApiError(err).message);
      }
    });
  }

  return (
    <div>
      <select
        aria-label={`Role for ${userName}`}
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value as Role)}
        className={`${inputClasses()} w-36 py-1.5`}
      >
        <option value="MEMBER">Member</option>
        <option value="ADMIN">Administrator</option>
      </select>
      {error && <p className="mt-1 max-w-48 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

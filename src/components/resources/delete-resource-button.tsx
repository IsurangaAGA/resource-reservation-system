"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, toApiError } from "@/lib/api-client";

export function DeleteResourceButton({ resourceId, resourceName }: { resourceId: string; resourceName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        await apiRequest(`/api/resources/${resourceId}`, { method: "DELETE" });
        router.push("/resources");
        router.refresh();
      } catch (err) {
        setError(toApiError(err).message);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {confirming ? (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-600">Delete {resourceName}?</span>
          <Button variant="danger" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
            Keep
          </Button>
        </div>
      ) : (
        <Button variant="secondary" className="text-rose-600" onClick={() => setConfirming(true)}>
          Delete
        </Button>
      )}
      {error && <p className="max-w-sm text-right text-xs text-rose-600">{error}</p>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, toApiError } from "@/lib/api-client";

/** Two-step cancel: first click asks for confirmation, second click cancels. */
export function CancelReservationButton({ reservationId, label = "Cancel" }: { reservationId: string; label?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setError(null);
    startTransition(async () => {
      try {
        await apiRequest(`/api/reservations/${reservationId}`, { method: "PATCH", body: { status: "CANCELLED" } });
        setConfirming(false);
        router.refresh();
      } catch (err) {
        setError(toApiError(err).message);
      }
    });
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">Cancel booking?</span>
        <Button variant="danger" size="sm" onClick={cancel} disabled={pending}>
          {pending ? "Cancelling…" : "Yes, cancel"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Keep
        </Button>
      </div>
      {error && <p className="max-w-xs text-right text-xs text-rose-600">{error}</p>}
    </div>
  );
}

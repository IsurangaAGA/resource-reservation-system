"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert, Field, inputClasses } from "@/components/ui/form";
import { APP_TIME_ZONE, RESOURCE_TYPE_LABELS, type ResourceStatus, type ResourceType } from "@/lib/constants";
import { dateToWallTime, formatDuration, formatRange, intervalsOverlap, wallTimeToDate } from "@/lib/datetime";
import { apiRequest, toApiError, type ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

type ResourceOption = { id: string; name: string; type: ResourceType; location: string; status: ResourceStatus; capacity: number | null };
type UserOption = { id: string; name: string; department: string | null };
type Booking = { id: string; title: string; startTime: Date; endTime: Date; bookedBy: string };

type Props = {
  resources: ResourceOption[];
  users: UserOption[];
  /** Administrators may book on behalf of anyone; members always book for themselves. */
  canChooseUser: boolean;
  /** Earliest sensible start (server "now" rounded up), used for min= and quick presets. */
  minStart: string;
} & (
  | { mode: "create"; initial: { resourceId: string; userId: string; startTime: string; endTime: string } }
  | {
      mode: "edit";
      reservationId: string;
      initial: { resourceId: string; userId: string; title: string; notes: string; startTime: string; endTime: string };
    }
);

const DURATION_PRESETS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "Half day", minutes: 240 },
  { label: "Full day", minutes: 480 },
];

type ApiBooking = { id: string; title: string; startTime: string; endTime: string; user: { name: string } };

/** Loads the selected resource's upcoming confirmed bookings from the API. */
function useResourceSchedule(resourceId: string) {
  const [state, setState] = useState<{ resourceId: string; bookings: Booking[]; error?: string } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!resourceId) return;
    let ignore = false;
    apiRequest<ApiBooking[]>(`/api/reservations?scope=upcoming&limit=100&resourceId=${encodeURIComponent(resourceId)}`)
      .then((items) => {
        if (ignore) return;
        setState({
          resourceId,
          bookings: items.map((b) => ({
            id: b.id,
            title: b.title,
            startTime: new Date(b.startTime),
            endTime: new Date(b.endTime),
            bookedBy: b.user.name,
          })),
        });
      })
      .catch((err) => {
        if (!ignore) setState({ resourceId, bookings: [], error: toApiError(err).message });
      });
    return () => {
      ignore = true;
    };
  }, [resourceId, version]);

  const current = state?.resourceId === resourceId ? state : null;
  return {
    bookings: current?.bookings ?? [],
    error: current?.error,
    loading: Boolean(resourceId) && !current,
    reload: () => setVersion((v) => v + 1),
  };
}

export function ReservationForm(props: Props) {
  const router = useRouter();
  const { resources, users, canChooseUser, minStart, mode, initial } = props;
  const editingId = mode === "edit" ? props.reservationId : undefined;

  const [resourceId, setResourceId] = useState(initial.resourceId);
  const [userId, setUserId] = useState(initial.userId);
  const [title, setTitle] = useState(mode === "edit" ? props.initial.title : "");
  const [notes, setNotes] = useState(mode === "edit" ? props.initial.notes : "");
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [error, setError] = useState<ApiClientError["body"] | null>(null);
  const [pending, startTransition] = useTransition();

  const schedule = useResourceSchedule(resourceId);
  const resource = resources.find((r) => r.id === resourceId);
  const start = wallTimeToDate(startTime);
  const end = wallTimeToDate(endTime);
  const rangeValid = start && end && end > start;

  // Client-side preview of conflicts; the server performs the authoritative check.
  const clashes = rangeValid
    ? schedule.bookings.filter((b) => b.id !== editingId && intervalsOverlap(start, end, b.startTime, b.endTime))
    : [];

  function applyDuration(minutes: number) {
    const base = start ?? wallTimeToDate(minStart);
    if (base) setEndTime(dateToWallTime(new Date(base.getTime() + minutes * 60_000)));
  }

  function changeStart(value: string) {
    // Keep the current duration when the start moves.
    const newStart = wallTimeToDate(value);
    if (newStart && start && end && end > start) {
      setEndTime(dateToWallTime(new Date(newStart.getTime() + (end.getTime() - start.getTime()))));
    }
    setStartTime(value);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!start || !end) {
      setError({ code: "VALIDATION_ERROR", message: "Enter a valid start and end time.", fieldErrors: {} });
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "create") {
          await apiRequest("/api/reservations", {
            method: "POST",
            body: {
              resourceId,
              ...(canChooseUser ? { userId } : {}),
              title,
              notes,
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            },
          });
        } else {
          await apiRequest(`/api/reservations/${props.reservationId}`, {
            method: "PATCH",
            body: { title, notes, startTime: start.toISOString(), endTime: end.toISOString() },
          });
        }
        router.push(`/resources/${resourceId}?booked=1`);
        router.refresh();
      } catch (err) {
        const apiError = toApiError(err);
        setError(apiError.body);
        if (apiError.body.code === "RESERVATION_CONFLICT") schedule.reload();
      }
    });
  }

  const fieldErrors = error?.fieldErrors ?? {};
  const bookable = resources.filter((r) => r.status === "AVAILABLE");

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form onSubmit={submit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" noValidate>
        {error && (
          <Alert
            title={
              error.code === "RESERVATION_CONFLICT"
                ? "That time is already taken"
                : error.code === "VALIDATION_ERROR"
                  ? "Please check the form"
                  : "Could not save the reservation"
            }
          >
            <p>{error.message}</p>
            {error.conflicts && error.conflicts.length > 0 && (
              <ul className="mt-2 space-y-1">
                {error.conflicts.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{c.title}</span> — {formatRange(new Date(c.startTime), new Date(c.endTime))} ({c.bookedBy})
                  </li>
                ))}
              </ul>
            )}
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Resource" htmlFor="resourceId" error={fieldErrors.resourceId} required className="sm:col-span-2">
            <select
              id="resourceId"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={mode === "edit"}
              required
              className={inputClasses(Boolean(fieldErrors.resourceId))}
            >
              <option value="">Select a resource…</option>
              {bookable.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {RESOURCE_TYPE_LABELS[r.type]}, {r.location}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Booked for" htmlFor="userId" error={fieldErrors.userId} required>
            <select
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={mode === "edit" || !canChooseUser}
              required
              className={inputClasses(Boolean(fieldErrors.userId))}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.department ? ` (${u.department})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Purpose" htmlFor="title" error={fieldErrors.title} required>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly team sync"
              maxLength={120}
              required
              className={inputClasses(Boolean(fieldErrors.title))}
            />
          </Field>

          <Field label="Starts" htmlFor="startTime" error={fieldErrors.startTime} required>
            <input
              id="startTime"
              type="datetime-local"
              value={startTime}
              min={minStart}
              step={900}
              onChange={(e) => changeStart(e.target.value)}
              required
              className={inputClasses(Boolean(fieldErrors.startTime))}
            />
          </Field>

          <Field
            label="Ends"
            htmlFor="endTime"
            error={fieldErrors.endTime}
            hint={rangeValid ? `Duration: ${formatDuration(start, end)}` : undefined}
            required
          >
            <input
              id="endTime"
              type="datetime-local"
              value={endTime}
              min={startTime || minStart}
              step={900}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className={inputClasses(Boolean(fieldErrors.endTime) || (Boolean(start && end) && !rangeValid))}
            />
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Quick duration</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <Button key={preset.minutes} variant="secondary" size="sm" onClick={() => applyDuration(preset.minutes)}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Field label="Notes" htmlFor="notes" error={fieldErrors.notes} className="sm:col-span-2">
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="Optional details, e.g. equipment needed or number of attendees"
              className={inputClasses(Boolean(fieldErrors.notes))}
            />
          </Field>
        </div>

        {clashes.length > 0 && (
          <Alert tone="warning" title="This overlaps an existing booking">
            The selected time clashes with {clashes.map((c) => `“${c.title}”`).join(", ")}. Choose a different time.
          </Alert>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <LinkButton href={mode === "edit" ? "/reservations" : "/"} variant="secondary">
            Discard
          </LinkButton>
          <Button type="submit" disabled={pending || clashes.length > 0 || !resourceId}>
            {pending ? "Saving…" : mode === "create" ? "Confirm reservation" : "Save changes"}
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">{resource ? resource.name : "Availability"}</h2>
            <p className="text-xs text-slate-500">
              {resource
                ? `${RESOURCE_TYPE_LABELS[resource.type]} · ${resource.location}${resource.capacity ? ` · seats ${resource.capacity}` : ""}`
                : "Pick a resource to see when it is already booked."}
            </p>
          </div>
          {resource && (
            <div className="max-h-[28rem] overflow-y-auto">
              {schedule.loading ? (
                <p className="px-4 py-6 text-sm text-slate-500">Loading schedule…</p>
              ) : schedule.error ? (
                <p className="px-4 py-6 text-sm text-rose-600">{schedule.error}</p>
              ) : schedule.bookings.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">No upcoming bookings — any time is free.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  <li className="px-4 py-2 text-xs font-medium tracking-wide text-slate-400 uppercase">Already booked</li>
                  {schedule.bookings.map((b) => {
                    const self = b.id === editingId;
                    const clash = clashes.some((c) => c.id === b.id);
                    return (
                      <li key={b.id} className={cn("px-4 py-2.5 text-sm", clash && "bg-amber-50", self && "bg-indigo-50/60")}>
                        <p className={cn("font-medium", clash ? "text-amber-900" : "text-slate-800")}>
                          {formatRange(b.startTime, b.endTime)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {self ? "This reservation" : `${b.title} · ${b.bookedBy}`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
        <p className="px-1 text-xs text-slate-500">
          Times are shown in {APP_TIME_ZONE.replace("_", " ")} time. Back-to-back bookings are allowed — a booking ending at 11:00 does
          not block one starting at 11:00.
        </p>
      </aside>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert, Field, inputClasses } from "@/components/ui/form";
import {
  RESOURCE_STATUS_LABELS,
  RESOURCE_STATUSES,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
  type ResourceStatus,
  type ResourceType,
} from "@/lib/constants";
import { apiRequest, toApiError, type ApiClientError } from "@/lib/api-client";

type ResourceValues = {
  name: string;
  type: ResourceType;
  location: string;
  capacity: string;
  status: ResourceStatus;
  description: string;
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; resourceId: string; initial: Omit<ResourceValues, "capacity"> & { capacity: number | null } };

export function ResourceForm(props: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ResourceValues>(
    props.mode === "edit"
      ? { ...props.initial, capacity: props.initial.capacity?.toString() ?? "" }
      : { name: "", type: "MEETING_ROOM", location: "", capacity: "", status: "AVAILABLE", description: "" },
  );
  const [error, setError] = useState<ApiClientError["body"] | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ResourceValues>(key: K, value: ResourceValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const body = {
      ...values,
      capacity: values.capacity.trim() === "" ? null : Number(values.capacity),
    };

    startTransition(async () => {
      try {
        const resource =
          props.mode === "create"
            ? await apiRequest<{ id: string }>("/api/resources", { method: "POST", body })
            : await apiRequest<{ id: string }>(`/api/resources/${props.resourceId}`, { method: "PATCH", body });
        router.push(`/resources/${resource.id}`);
        router.refresh();
      } catch (err) {
        setError(toApiError(err).body);
      }
    });
  }

  const fieldErrors = error?.fieldErrors ?? {};

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" noValidate>
      {error && <Alert title="Could not save the resource">{error.message}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={fieldErrors.name} required className="sm:col-span-2">
          <input
            id="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Board Room A"
            maxLength={100}
            required
            className={inputClasses(Boolean(fieldErrors.name))}
          />
        </Field>

        <Field label="Type" htmlFor="type" error={fieldErrors.type} required>
          <select id="type" value={values.type} onChange={(e) => set("type", e.target.value as ResourceType)} className={inputClasses()}>
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {RESOURCE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Status"
          htmlFor="status"
          error={fieldErrors.status}
          hint="Only available resources can be booked."
          required
        >
          <select id="status" value={values.status} onChange={(e) => set("status", e.target.value as ResourceStatus)} className={inputClasses()}>
            {RESOURCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RESOURCE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Location" htmlFor="location" error={fieldErrors.location} required>
          <input
            id="location"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Level 3, East wing"
            maxLength={150}
            required
            className={inputClasses(Boolean(fieldErrors.location))}
          />
        </Field>

        <Field label="Capacity" htmlFor="capacity" error={fieldErrors.capacity} hint="Seats or passengers, if relevant.">
          <input
            id="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            value={values.capacity}
            onChange={(e) => set("capacity", e.target.value)}
            className={inputClasses(Boolean(fieldErrors.capacity))}
          />
        </Field>

        <Field label="Description" htmlFor="description" error={fieldErrors.description} className="sm:col-span-2">
          <textarea
            id="description"
            rows={3}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={1000}
            placeholder="Features, access instructions, etc."
            className={inputClasses(Boolean(fieldErrors.description))}
          />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <LinkButton href={props.mode === "edit" ? `/resources/${props.resourceId}` : "/resources"} variant="secondary">
          Discard
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : props.mode === "create" ? "Create resource" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

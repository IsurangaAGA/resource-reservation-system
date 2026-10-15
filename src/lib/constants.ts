// Client-safe enum values and labels. The generated enums file has no runtime
// dependencies, so it can be imported from both server and client components.
import {
  ReservationStatus,
  ResourceStatus,
  ResourceType,
} from "@/generated/prisma/enums";

export { ReservationStatus, ResourceStatus, ResourceType };

export const RESOURCE_TYPES = Object.values(ResourceType);
export const RESOURCE_STATUSES = Object.values(ResourceStatus);

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  MEETING_ROOM: "Meeting room",
  EQUIPMENT: "Equipment",
  VEHICLE: "Vehicle",
  WORKSPACE: "Workspace",
  OTHER: "Other",
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  AVAILABLE: "Available",
  MAINTENANCE: "Maintenance",
  RETIRED: "Retired",
};

/** Organisation time zone used to display times and interpret booking input. */
export const APP_TIME_ZONE =
  process.env.NEXT_PUBLIC_APP_TIME_ZONE || "Asia/Colombo";

export const BOOKING_RULES = {
  minDurationMinutes: 15,
  maxDurationDays: 14,
  /** How far in the past a start time may be, to tolerate clock skew and form-fill time. */
  pastToleranceMinutes: 5,
  maxAdvanceDays: 365,
} as const;

/** Error codes shared by the API and the client so the UI can react to them. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RESERVATION_CONFLICT"
  | "RESOURCE_UNAVAILABLE"
  | "INVALID_STATE"
  | "DUPLICATE"
  | "IN_USE"
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ConflictSummary = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  bookedBy: string;
};

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    fieldErrors?: Record<string, string>;
    conflicts?: ConflictSummary[];
  };
};

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  RESERVATION_CONFLICT: 409,
  RESOURCE_UNAVAILABLE: 409,
  INVALID_STATE: 409,
  DUPLICATE: 409,
  IN_USE: 409,
  INTERNAL_ERROR: 500,
};

/** A domain error thrown by services and translated into an HTTP response. */
export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly extra: Omit<ApiErrorBody["error"], "code" | "message"> = {},
  ) {
    super(message);
    this.name = "AppError";
  }

  get status() {
    return STATUS_BY_CODE[this.code];
  }
}

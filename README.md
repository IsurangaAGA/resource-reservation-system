# ResourceHub — Resource Reservation Management System

A central place for booking shared meeting rooms, equipment and vehicles without double-booking.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma 7 · Zod · Vitest

## Features

- **Resources:** create, edit, retire and delete rooms, equipment, vehicles and workspaces, with type, location, capacity and status. The list shows live availability ("In use until 14:00", "Next booking…").
- **Booking:**
  - The form shows the resource's existing bookings and warns about clashes before you submit.
  - It suggests the next free slot.
  - Quick-duration buttons set the end time.
- **Conflict prevention:** overlapping bookings are rejected by the API and by a PostgreSQL constraint (see below).
- **Dashboard:** live stats, active and upcoming bookings, per-resource availability and recent history.
- **Reservations:** upcoming / history / cancelled / all tabs, an "only mine" filter, a per-resource filter, pagination, reschedule and cancel.
- **Accounts:** sign up, sign in and sign out, profile and password changes, and admin management of people and roles.

## Getting started

Requires Node.js 20+ and PostgreSQL 14+.

```bash
npm install                      # also generates the Prisma client
cp .env.example .env             # then set DATABASE_URL
npm run db:deploy                # apply migrations
npm run db:seed                  # optional: demo users, resources and bookings
npm run dev                      # http://localhost:3000
```

After seeding you can sign in as:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `alice@primewave.lk` | `Password123` |
| Member | `bob@primewave.lk` | `Password123` |
| Member | `chamari@primewave.lk` | `Password123` |

Without seeding, open `/register`: **the first account created becomes an administrator**.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_TIME_ZONE` | Organisation time zone for displaying and entering times (default `Asia/Colombo`; build-time) |
| `SHOW_DEMO_ACCOUNTS` | `true` shows the demo logins on the sign-in page in production (always shown in development) |

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run lint` / `typecheck` / `test` | ESLint, TypeScript, Vitest unit tests |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` / `db:seed` / `db:studio` | Apply migrations, seed demo data, open Prisma Studio |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the following against a PostgreSQL service: migrations, seed, lint, type-check, tests and build.

## Roles and permissions

| Action | Member | Administrator |
| --- | --- | --- |
| View resources, availability and the shared schedule | ✓ | ✓ |
| Book a resource | For themselves | For anyone |
| Reschedule / cancel a reservation | Own only | Any |
| Create, edit, retire, delete resources | | ✓ |
| Manage people and roles (`/people`) | | ✓ (not their own role) |

## How double-booking is prevented

Two reservations for the same resource conflict when their half-open time ranges overlap:
`existing.start < requested.end AND existing.end > requested.start`. Back-to-back bookings (10:00–11:00 and 11:00–12:00) are allowed. Only `CONFIRMED` reservations block a slot; cancelled ones free it again.

There are three layers:

1. **API check.** Inside a transaction, the resource row is locked (`SELECT … FOR UPDATE`) and then overlapping confirmed bookings are looked up. The lock means concurrent requests for the same resource are handled one after another. A clash returns `409 RESERVATION_CONFLICT` listing the conflicting bookings.
2. **Database constraint.** A PostgreSQL exclusion constraint (`reservations_no_overlap`, using `btree_gist` + `tstzrange`) makes overlaps impossible, even for writes that bypass the API. If it fires, the error is still returned as a 409.
3. **UI preview.** The booking form loads the resource's schedule and warns about clashes before submitting.

Other rules:
- End must be after start.
- A booking lasts 15 minutes to 14 days.
- It can't start in the past or more than 365 days ahead.
- Resources under maintenance or retired can't be booked.
- Only bookings that haven't started can be rescheduled.

## Authentication and security

- **Sessions:** server-side sessions. The cookie holds a random 256-bit token, and the `sessions` table stores only its SHA-256 hash. The cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production, and lasts 14 days.
- **Passwords:** hashed with scrypt from `node:crypto` (random salt per password), with a constant-time comparison. Unknown emails take the same time to check as known ones, so the response time doesn't reveal which accounts exist.
- **Brute-force protection:** 5 failed sign-ins per IP + email per 15 minutes, then `429`. The limiter keeps its state in process memory; use a shared store such as Redis if you run more than one instance.
- **Where permissions are checked:** every page, Route Handler and Server Action checks the session and role through the Data Access Layer ([src/lib/auth/dal.ts](src/lib/auth/dal.ts)). [src/proxy.ts](src/proxy.ts) only does a quick cookie check to send signed-out visitors to `/login?next=…`.
- **Other protections:**
  - State-changing API requests from another origin are rejected (CSRF protection on top of SameSite).
  - `next` redirect targets are limited to relative paths on this site.
  - Changing your password signs out your other sessions.

## API

All endpoints need a session cookie. Browsers get it by signing in through the UI; other clients use `POST /api/auth/login`.

Responses are `{ "data": … }` on success or `{ "error": { "code", "message", "fieldErrors?", "conflicts?" } }` on failure. Timestamps are ISO-8601 strings and must include a time zone offset (for example `2026-10-16T04:30:00Z`).

| Method & path | Access | Description |
| --- | --- | --- |
| `POST /api/auth/login` | Public | `{ email, password }` → sets the session cookie |
| `POST /api/auth/logout` | Any | Ends the current session |
| `GET /api/auth/me` | Any | Current user |
| `GET /api/resources?type=&status=&q=` | Any | Resources with live availability (current/next booking) |
| `POST /api/resources` | Admin | Create: `name`, `type`, `location`, `description?`, `capacity?`, `status?` |
| `GET /api/resources/:id` | Any | Resource details and upcoming bookings |
| `PATCH /api/resources/:id` | Admin | Update any fields |
| `DELETE /api/resources/:id` | Admin | Delete; `409 IN_USE` if it has booking history (retire it instead) |
| `GET /api/reservations?scope=upcoming\|past\|cancelled\|all&resourceId=&userId=&from=&to=&limit=&offset=` | Any | List reservations |
| `POST /api/reservations` | Any | Book: `resourceId`, `title`, `startTime`, `endTime`, `notes?`, `userId?` (admin only) |
| `GET /api/reservations/:id` | Any | Reservation details |
| `PATCH /api/reservations/:id` | Owner / admin | `{"status":"CANCELLED"}` to cancel, or `title` / `notes` / `startTime`+`endTime` to edit or reschedule (conflict-checked) |
| `GET /api/users` | Admin | People who can be assigned to bookings |
| `PATCH /api/users/:id` | Admin | `{ "role": "ADMIN" \| "MEMBER" }` |

Status codes: `201` created, `204` no content, `400` malformed JSON, `401` not signed in, `403` not allowed, `404` not found, `409` conflict / unavailable / invalid state, `422` validation error, `429` too many attempts.

## Project structure

```
prisma/                    schema, migrations (incl. exclusion constraint), seed
src/proxy.ts               optimistic auth redirect
src/app/(app)/             signed-in pages: dashboard, resources, reservations, account, people
src/app/(auth)/            sign-in and registration
src/app/api/               JSON Route Handlers
src/components/            ui/ primitives, layout/, auth/, resources/, reservations/
src/lib/auth/              sessions, password hashing, DAL, Server Actions, rate limiting
src/lib/services/          business logic and data access (server-only)
src/lib/                   validation (zod), errors, time-zone helpers, Prisma client
```

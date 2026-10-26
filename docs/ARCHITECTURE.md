# Architecture

Booth Ops is a Next.js App Router portal. Auth is shared role passwords in HTTP-only cookies (`src/proxy.ts` + `src/lib/auth.ts`).

- **UI:** `src/app/(portal)` for signed-in tools; public `/login`.
- **Domain:** shifts, day captains, issues, feedback, fill KPIs.
- **Persistence:** `@libsql/client` — local SQLite file in development, Turso when URL + token are set in a non-dev environment.
- **Config:** `config/booth.example.json` supplies org, event, shifts, captains, and labels. `event_settings` in the database overrides dates, contact, and branding.

Lifecycle windows A–D are computed in `src/lib/portal-windows.ts` from config dates, local times, and the IANA timezone.

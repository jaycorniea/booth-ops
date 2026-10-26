# Booth Ops

Operations portal for a multi-day volunteer booth. One deploy is one organization and one event season.

Built for festival, information, and charity booths that need a shared roster, day captains, on-call backup, and public signup — without a spreadsheet as the source of truth.

## Features

- Roles: admin, day captain, volunteer, viewer (shared passwords from env)
- Event calendar from inclusive ISO dates
- Configurable shift templates and official volunteers per shift
- Day captains (full-day default; optional split days)
- Lifecycle windows A/B/C/D from config dates, local times, and IANA timezone
- Day dashboard: roster, check-in, no-show, captain fields
- Schedule, interested volunteer pool, on-call pool
- Public `/join`, `/join-shift`, `/join-on-call`
- Issues, captain feedback, fill KPIs
- Admin UI for event dates, contact, booth name/location/hours

Demo seed: **Riverside Arts Weekend** (3 days, 3 shifts, 3 official volunteers per shift).

Google Sheets push is not included in v1. It may return later as an optional integration.

## Local run

```bash
cp .env.example .env.local
```

Local-only demo passwords (never use these in production):

```
ADMIN_PASSWORD=admin-demo
DAY_CAPTAIN_PASSWORD=captain-demo
VOLUNTEER_PORTAL_PASSWORD=volunteer-demo
ON_CALL_SIGNUP_PASSWORD=oncall-demo
VOLUNTEER_SIGNUP_PASSWORD=shift-demo
```

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3010](http://127.0.0.1:3010). SQLite is created at `data/booth.db`.

```bash
npm test
npm run build
```

## Config

Edit `config/booth.example.json` (or point `BOOTH_CONFIG_PATH` at your file after a future loader lands). Changing shift templates or `officialSlotsPerShift` and re-seeding (delete `data/booth.db` and restart) changes the grid. Changing event dates changes the calendar.

Admins can override dates, contact, and booth branding in **Event settings**. Timezone is IANA (`America/Chicago` in the demo only).

## Env

See `.env.example`. Production refuses to start if required passwords are unset. Optional Turso: set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

`robots: noindex` is set for instance deploys. Self-hosters can change metadata in `src/app/layout.tsx`.

## License

MIT. See [LICENSE](LICENSE).

## Publish

Do not publish until the operator asks. Suggested:

```bash
gh repo create booth-ops --public --source . --remote origin
```

Topics: `volunteer`, `nextjs`, `booth`.

# Event windows

| Window | Label | When |
|--------|-------|------|
| A | Before captain tools open | Before `captainToolsOpenDate` 00:00 local |
| B | Fill the schedule | Tools open until `liveStart` |
| C | Booth is live | `liveStart` until `liveEnd` |
| D | Event closed | After `liveEnd`. Captains locked out; admin still in |

Demo (`America/Chicago`):

- Tools open: 2026-06-01 00:00
- Live start: eve of 2026-08-14 at 21:00
- Live end: 2026-08-16 at 21:00

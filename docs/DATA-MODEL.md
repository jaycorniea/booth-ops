# Data model

Hub key: `event_date` (ISO `YYYY-MM-DD`).

| Table | Notes |
|-------|-------|
| `event_settings` | Single row. Dates, booth fields, coordinator contact, timezone, slots-per-shift, shift templates JSON, captain split JSON. |
| `shifts` | Unique `(event_date, shift_num)`. Notes, check-in, no-show. |
| `shift_assignments` | Unique `(shift_id, slot_index)`. `slot_index` is 1..N. Name, phone, email. |
| `day_captains` | Unique `(event_date, captain_slot)`. |
| `interested_volunteers` | Status `interested` / `placed` / `withdrawn`. `placed_event_date`, `placed_shift_num`. |
| `on_call` | Pool + placement columns using `event_date`. |
| `on_call_shift_requests` | Pending outreach rows. |
| `issues` | Day issues + admin response. |
| `captain_feedback` | Pre-event feedback + admin response. |
| `audit_log` | Mutations. |
| `kpi_snapshots` | Fill KPI history. |
| `checklist_state` | Opening/closing checklist. |

Fill KPI: filled = assignments with a non-empty name on official slots. Total = (event days) × (shift templates) × `officialSlotsPerShift`.

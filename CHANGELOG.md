# Changelog

## 0.6.0

- Remove the portal log, Captain IPs, and the session, geo, and IP tracking that fed them
- Event settings stays on the Admin menu. Day sheet audit history still feeds fill KPIs

## 0.5.0

- Remove the alerts page, the Admin menu item, and the stored alert sync
- Event settings, the portal log, captain IPs, and fill KPIs stay
- No-show and check-in stay on the day sheet

## 0.4.0

- Remove the admin Reports item and the reports page
- Event settings, alerts, the portal log, and captain IPs stay on the Admin menu

## 0.3.0

- Remove captain feedback and the issue log
- Profiles, the day sheet, the day log, fill KPIs, and shift and no-show alerts stay

## 0.2.0

- Remove the interested pool, the on-call pool, and the public signup pages that only fed those pools
- Captains still type volunteers on the day sheet. Profiles, KPIs, alerts, and export no longer read those pools

## 0.1.1

- **Portal log:** create `captain_ip_mappings` before the device index so a fresh local database does not 500 on page view

## 0.1.0

- Initial public extract: volunteer booth operations portal.
- Demo event: Riverside Arts Weekend. Home subtitle and shift counts follow event settings.
- Local SQLite default; optional Turso via env placeholders.

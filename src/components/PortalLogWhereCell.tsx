import type { PortalActivitySessionView } from "@/lib/portal-activity";
import { formatGeoMapUrl } from "@/lib/browser-geo";

const GEO_SOURCE_LABEL: Record<string, string> = {
  browser: "GPS",
  vercel: "IP (edge)",
  ip_lookup: "IP lookup",
};

export function PortalLogWhereCell({
  view,
  ipOnly = false,
}: {
  view: PortalActivitySessionView;
  /** Session row — IP only; geo/map in expanded details. */
  ipOnly?: boolean;
}) {
  const ip = view.session.client_ip?.trim();
  const place = view.location_label?.trim();
  const hasPlace = Boolean(place && place !== "—");
  const lat = view.session.geo_latitude;
  const lon = view.session.geo_longitude;
  const mapUrl =
    lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)
      ? formatGeoMapUrl(lat, lon)
      : null;
  const sourceLabel = view.session.geo_source
    ? (GEO_SOURCE_LABEL[view.session.geo_source] ?? view.session.geo_source)
    : null;

  if (!ip) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  if (ipOnly) {
    return (
      <span className="block min-w-0 font-mono text-xs text-slate-800" title={ip}>
        {ip}
      </span>
    );
  }

  return (
    <span className="block min-w-0 text-xs leading-snug">
      <span className="block font-mono text-slate-800">{ip}</span>
      {hasPlace ? <span className="block text-slate-600">{place}</span> : null}
      {mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-blue-700 underline"
        >
          Open map
        </a>
      ) : null}
      {sourceLabel ? (
        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {sourceLabel}
        </span>
      ) : null}
    </span>
  );
}

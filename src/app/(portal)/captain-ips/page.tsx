import { AdminLogNav } from "@/components/AdminLogNav";
import { CaptainIpMappingFields } from "@/components/CaptainIpMappingFields";
import { Card } from "@/components/ui";
import {
  deleteCaptainIpMappingAction,
  rerunCaptainIpInferenceAction,
  saveCaptainIpMappingAction,
} from "@/lib/actions";
import { isAdmin } from "@/lib/auth";
import {
  captainIpMappingAnchor,
  groupCaptainDevicesByCaptain,
  GUEST_DAY_CAPTAIN_KEY,
  guestDisplayNameFromNotes,
  inferredVisitCaptainOptions,
  isGuestIdentifiedMapping,
  listEnrichedCaptainIpMappings,
  listDayCaptainOptions,
  listUnmappedPortalIpSignals,
  mappingEditCaptainOptions,
  anchorEventDateForUnmappedIp,
  formatUnmappedDayVisits,
  suggestCaptainKeyForUnmappedIp,
  summarizeMappingsByIp,
  unmappedIpRoleLabel,
} from "@/lib/captain-ip-mappings";
import { listPortalDevices, formatPortalDeviceTelemetry } from "@/lib/portal-devices";
import { formatEventDate, getEventDates } from "@/lib/event-dates";
import { centralDateString, formatPortalTimestampCompact } from "@/lib/portal-time";
import { redirect } from "next/navigation";

function sourceBadge(source: string): string {
  return source === "admin"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";
}

function defaultAnchorEventDate(): string {
  const today = centralDateString();
  const eventDates = getEventDates();
  if (eventDates.includes(today)) return today;
  return eventDates[0] ?? today;
}

function guestNameForIp(
  clientIp: string,
  mappings: Awaited<ReturnType<typeof listEnrichedCaptainIpMappings>>
): string {
  const row = mappings
    .filter((m) => m.client_ip === clientIp && isGuestIdentifiedMapping(m))
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""))[0];
  return row ? guestDisplayNameFromNotes(row.notes) : "";
}

export default async function CaptainIpsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    deleted?: string;
    error?: string;
    rerun?: string;
    processed?: string;
    admin?: string;
    captain?: string;
    guest?: string;
    preserved?: string;
    locked?: string;
    removed?: string;
  }>;
}) {
  if (!(await isAdmin())) {
    redirect("/?error=admin_required");
  }

  const query = await searchParams;
  const [enrichedMappings, dayCaptainOptions, portalDevices] = await Promise.all([
    listEnrichedCaptainIpMappings(),
    listDayCaptainOptions(),
    listPortalDevices(),
  ]);
  const unmappedIps = await listUnmappedPortalIpSignals(portalDevices, enrichedMappings, 80);
  const ipMappings = summarizeMappingsByIp(enrichedMappings, dayCaptainOptions);
  const captainDeviceGroups = groupCaptainDevicesByCaptain(enrichedMappings, dayCaptainOptions);
  const deviceByIp = new Map(portalDevices.map((device) => [device.client_ip, device]));

  const editOptions = mappingEditCaptainOptions(dayCaptainOptions);
  const assignOptions = inferredVisitCaptainOptions(dayCaptainOptions);
  const anchorEventDate = defaultAnchorEventDate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Captain IP mappings</h2>
        <p className="text-sm text-slate-600">
          Static device IPs — one captain per IP once confirmed. Admins share one login — assign{" "}
          <strong className="font-medium">Alex Rivera</strong> or{" "}
          <strong className="font-medium">Admin</strong> per device. Use{" "}
          <strong className="font-medium">Other — name this device</strong> for everyone else.
          Unmapped IPs below need a label before Portal Log can group them reliably.
        </p>
      </div>

      <AdminLogNav active="/captain-ips" />

      {(query.saved === "1" || query.deleted === "1" || query.rerun === "1" || query.error) && (
        <div className="space-y-2">
          {query.rerun === "1" && (
            <div className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-900">
              Rerun: {query.processed ?? 0} groups · {query.admin ?? 0} admin · {query.captain ?? 0}{" "}
              inferred · {query.preserved ?? 0} preserved · {query.locked ?? 0} locked applied ·{" "}
              {query.guest ?? 0} named · {query.removed ?? 0} removed
            </div>
          )}
          {query.saved === "1" && (
            <div className="rounded border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-900">
              Mapping saved.
            </div>
          )}
          {query.deleted === "1" && (
            <div className="rounded border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-900">
              Mapping removed.
            </div>
          )}
          {query.error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-900">
              Could not save — check IP and captain. Admin on a new IP needs a visit day context
              (assign from Unmapped IPs).
            </div>
          )}
        </div>
      )}

      <Card title={`Captains & devices (${captainDeviceGroups.length})`}>
        {captainDeviceGroups.length === 0 ? (
          <p className="text-sm text-slate-500">No devices mapped yet.</p>
        ) : (
          <div className="space-y-2">
            {captainDeviceGroups.map((group) => (
              <div key={group.captainKey} className="text-sm">
                <p className="font-medium text-slate-900">{group.label}</p>
                <p className="text-xs text-slate-600">
                  {group.devices.map((device, index) => (
                    <span key={device.client_ip}>
                      {index > 0 ? " · " : ""}
                      <a
                        href={`#${captainIpMappingAnchor(device.client_ip)}`}
                        className="font-mono text-blue-700 underline"
                      >
                        {device.client_ip}
                      </a>
                      {device.displayName ? (
                        <span className="text-slate-700"> — {device.displayName}</span>
                      ) : null}
                      {device.locked ? " 🔒" : ""}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Unmapped IPs (${unmappedIps.length})`}>
        {unmappedIps.length === 0 ? (
          <p className="text-sm text-slate-500">
            Every portal IP has a confirmed captain, admin, or named device label.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-1 pr-2 font-medium">IP</th>
                  <th className="py-1 pr-2 font-medium">Device</th>
                  <th className="py-1 pr-2 font-medium">Last role</th>
                  <th className="py-1 pr-2 font-medium">Sessions</th>
                  <th className="py-1 pr-2 font-medium">Day pages</th>
                  <th className="py-1 pr-2 font-medium">Last</th>
                  <th className="py-1 font-medium">Assign</th>
                </tr>
              </thead>
              <tbody>
                {unmappedIps.map((signal) => {
                  const visitDay = anchorEventDateForUnmappedIp(signal, anchorEventDate);
                  const defaultKey = suggestCaptainKeyForUnmappedIp(signal, dayCaptainOptions);
                  return (
                    <tr
                      key={signal.client_ip}
                      id={captainIpMappingAnchor(signal.client_ip)}
                      className="scroll-mt-20 border-b border-slate-50 align-middle"
                    >
                      <td className="py-1.5 pr-2 font-mono">{signal.client_ip}</td>
                      <td className="py-1.5 pr-2 text-slate-600">
                        {formatPortalDeviceTelemetry(deviceByIp.get(signal.client_ip))}
                      </td>
                      <td className="py-1.5 pr-2 text-slate-600">
                        {unmappedIpRoleLabel(signal.last_auth_role)}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums">{signal.session_count}</td>
                      <td className="py-1.5 pr-2 text-slate-600">
                        {formatUnmappedDayVisits(signal.day_event_dates)}
                      </td>
                      <td className="py-1.5 pr-2 whitespace-nowrap text-slate-600">
                        {formatPortalTimestampCompact(signal.last_seen_at)}
                      </td>
                      <td className="py-1.5">
                        <form action={saveCaptainIpMappingAction} className="flex flex-wrap items-center gap-1">
                          <input type="hidden" name="client_ip" value={signal.client_ip} />
                          <input type="hidden" name="scope" value="ip" />
                          <input type="hidden" name="first_visit_day" value={visitDay} />
                          <input type="hidden" name="visited_event_date" value={visitDay} />
                          <CaptainIpMappingFields
                            options={assignOptions}
                            defaultCaptainKey={defaultKey}
                          />
                          <button
                            type="submit"
                            className="rounded bg-blue-700 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-800"
                          >
                            Assign
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Mappings by IP (${ipMappings.length})`}>
        <form
          action={saveCaptainIpMappingAction}
          className="mb-3 flex flex-wrap items-end gap-2 border-b border-slate-100 pb-3 text-sm"
        >
          <input type="hidden" name="first_visit_day" value={anchorEventDate} />
          <input type="hidden" name="scope" value="ip" />
          <div className="min-w-[9rem] flex-1">
            <label className="text-xs text-slate-500">Add IP</label>
            <input
              name="client_ip"
              required
              placeholder="203.0.113.42"
              className="mt-0.5 w-full rounded border px-2 py-1 text-xs font-mono"
            />
          </div>
          <div className="flex min-w-[12rem] flex-[2] flex-wrap items-end gap-1">
            <label className="sr-only">Assign to</label>
            <CaptainIpMappingFields
              options={editOptions}
              groupByDate
              selectClassName="min-w-[10rem] flex-1 rounded border px-2 py-1 text-xs"
              guestInputClassName="w-full min-w-[7rem] rounded border px-2 py-1 text-xs"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
          >
            Add
          </button>
        </form>

        {ipMappings.length === 0 ? (
          <p className="text-sm text-slate-500">No mappings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-1 pr-2 font-medium">IP</th>
                  <th className="py-1 pr-2 font-medium">Device</th>
                  <th className="py-1 pr-2 font-medium">Captain</th>
                  <th className="py-1 pr-2 font-medium">First</th>
                  <th className="py-1 pr-2 font-medium">Last</th>
                  <th className="py-1 pr-2 font-medium">Visits</th>
                  <th className="py-1 font-medium">Edit</th>
                </tr>
              </thead>
              <tbody>
                {ipMappings.map((row) => (
                  <tr
                    key={row.client_ip}
                    id={captainIpMappingAnchor(row.client_ip)}
                    className="scroll-mt-20 border-b border-slate-50 align-middle"
                  >
                    <td className="py-1.5 pr-2 font-mono">{row.client_ip}</td>
                    <td className="py-1.5 pr-2 text-slate-600">
                      {formatPortalDeviceTelemetry(deviceByIp.get(row.client_ip))}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className="text-slate-800">{row.captainLabel}</span>{" "}
                      <span
                        className={`rounded px-1 py-0.5 text-[10px] font-medium ${sourceBadge(row.source)}`}
                      >
                        {row.source}
                      </span>
                      {row.locked && (
                        <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-medium text-emerald-800">
                          locked
                        </span>
                      )}
                      {row.conflict && (
                        <span
                          className="ml-1 text-[10px] text-amber-800"
                          title={row.conflictLabels.join(" · ")}
                        >
                          multi-captain
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap text-slate-600">
                      {formatEventDate(row.firstVisitDay)}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap text-slate-600">
                      {formatEventDate(row.lastVisitDay)}
                      {row.lastSeenAt ? (
                        <span className="text-slate-400"> · {formatPortalTimestampCompact(row.lastSeenAt)}</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">{row.totalVisits}</td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1">
                        <form action={saveCaptainIpMappingAction} className="flex flex-wrap items-center gap-1">
                          <input type="hidden" name="client_ip" value={row.client_ip} />
                          <input type="hidden" name="scope" value="ip" />
                          <input type="hidden" name="first_visit_day" value={row.firstVisitDay} />
                          <CaptainIpMappingFields
                            options={editOptions}
                            defaultCaptainKey={row.captainKey}
                            defaultGuestName={
                              row.captainKey === GUEST_DAY_CAPTAIN_KEY
                                ? guestNameForIp(row.client_ip, enrichedMappings)
                                : ""
                            }
                          />
                          <button
                            type="submit"
                            className="rounded bg-blue-700 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-800"
                          >
                            Save
                          </button>
                        </form>
                        <form action={deleteCaptainIpMappingAction}>
                          <input type="hidden" name="client_ip" value={row.client_ip} />
                          <input type="hidden" name="scope" value="ip" />
                          <button
                            type="submit"
                            className="rounded border border-red-200 px-2 py-0.5 text-[10px] text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Inference engine">
        <form action={rerunCaptainIpInferenceAction} className="flex items-center gap-3">
          <p className="text-xs text-slate-600">
            Rebuild from event-day edits. Captain saves → that day’s captain (≥80% of an IP’s
            saves also names their earlier page views). Admin saves → the admin contact.
          </p>
          <button
            type="submit"
            className="shrink-0 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            Rerun
          </button>
        </form>
      </Card>
    </div>
  );
}
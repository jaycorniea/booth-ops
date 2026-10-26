import { assertEventDate, dayDashboardHref } from "@/lib/day-routes";
import { redirect } from "next/navigation";

/** Legacy URL — roster merged into the day dashboard. */
export default async function RosterRedirectPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  assertEventDate(date);
  redirect(dayDashboardHref(date));
}

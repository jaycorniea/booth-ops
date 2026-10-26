import { DayDashboardContent } from "@/components/DayDashboardContent";
import { canContact, canWrite, getAuthRole, isAdmin } from "@/lib/auth";
import { isCaptainDayView } from "@/lib/captain-day-view";
import { isSplitCaptainDay } from "@/lib/day-captain-slots";
import { assertEventDate, dayDashboardHref } from "@/lib/day-routes";
import { getDayDashboardData } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DayDashboardPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  assertEventDate(date);

  if (isSplitCaptainDay(date)) {
    redirect(dayDashboardHref(date, "am"));
  }

  const [write, contact, dashboard, role, admin] = await Promise.all([
    canWrite(),
    canContact(),
    getDayDashboardData(date),
    getAuthRole(),
    isAdmin(),
  ]);
  const { checklist, captains, shifts } = dashboard;
  const captainView = isCaptainDayView(role);

  return (
    <DayDashboardContent
      date={date}
      write={write}
      contact={contact}
      checklist={checklist}
      captains={captains}
      shifts={shifts}
      captainView={captainView}
      isAdmin={admin}
    />
  );
}
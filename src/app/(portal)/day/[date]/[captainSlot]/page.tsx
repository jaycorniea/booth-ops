import { DayDashboardContent } from "@/components/DayDashboardContent";
import { canContact, canWrite, getAuthRole, isAdmin } from "@/lib/auth";
import { isCaptainDayView } from "@/lib/captain-day-view";
import { isSplitCaptainDay } from "@/lib/day-captain-slots";
import { isDaySubpageSegment, isSplitCaptainPathSlot, assertEventDate } from "@/lib/day-routes";
import { getDayDashboardData } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function SplitDayDashboardPage({
  params,
}: {
  params: Promise<{ date: string; captainSlot: string }>;
}) {
  const { date, captainSlot } = await params;
  assertEventDate(date);

  if (isDaySubpageSegment(captainSlot)) {
    notFound();
  }

  if (!isSplitCaptainDay(date) || !isSplitCaptainPathSlot(captainSlot)) {
    notFound();
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
      captainSlot={captainSlot}
      captainView={captainView}
      isAdmin={admin}
    />
  );
}
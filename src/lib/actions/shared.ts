import { dayDashboardRevalidatePaths } from "@/lib/day-routes";
import { revalidatePath } from "next/cache";

export function revalidateDayDashboard(eventDate: string) {
  for (const path of dayDashboardRevalidatePaths(eventDate)) {
    revalidatePath(path);
  }
}

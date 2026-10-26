import { exportAllData } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Card } from "@/components/ui";

export default async function ReportsPage() {
  await requireAdmin();
  const data = await exportAllData();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Card title="Export">
        <p className="text-sm text-slate-600">
          Snapshot generated {data.exportedAt}. Copy or download from the JSON export API at{" "}
          <code className="text-xs">/api/export/csv</code> is not included in v1; use the in-app
          tables and fill KPIs.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {data.shifts.length} shifts · {data.interestedVolunteers.length} interested ·{" "}
          {data.onCall.length} on-call · {data.issues.length} issues
        </p>
      </Card>
    </div>
  );
}

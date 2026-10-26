import { assignInterestedVolunteerToShiftAction } from "@/lib/actions";
import { Btn, Card } from "@/components/ui";
import { getInterestedVolunteerById, listAllShifts } from "@/lib/db";
import { listOpenPreferredSlots } from "@/lib/interested-open-slots";
import { notFound } from "next/navigation";

export default async function AssignInterestedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const volunteer = await getInterestedVolunteerById(Number(id));
  if (!volunteer) notFound();
  const shifts = await listAllShifts();
  const open = listOpenPreferredSlots(volunteer, shifts);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Assign {volunteer.name}</h1>
      <Card>
        {open.length === 0 ? (
          <p className="text-sm text-slate-600">No open preferred slots.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((slot) => (
              <li key={`${slot.eventDate}-${slot.shiftNum}`} className="text-sm">
                <form action={assignInterestedVolunteerToShiftAction.bind(null, volunteer.id)}>
                  <input type="hidden" name="event_date" value={slot.eventDate} />
                  <input type="hidden" name="shift_num" value={slot.shiftNum} />
                  <input type="hidden" name="slot" value={String(slot.openSlots[0] ?? 1)} />
                  <p>
                    {slot.eventDateLabel} · {slot.shiftLabel} · open slots{" "}
                    {slot.openSlots.join(", ")}
                  </p>
                  <Btn type="submit" className="mt-1">
                    Assign
                  </Btn>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

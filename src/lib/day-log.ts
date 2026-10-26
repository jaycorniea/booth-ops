export function sumShiftClickers(shifts: { clicker_count?: number | null }[]): number | null {
  const counts = shifts
    .map((s) => s.clicker_count)
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (!counts.length) return null;
  return counts.reduce((sum, n) => sum + n, 0);
}

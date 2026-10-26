/** Optional hook for future spreadsheet/export sync. v1 is a no-op. */
export async function notifyPortalDataChanged(): Promise<void> {
  return;
}

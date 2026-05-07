/**
 * Lädt eine Export-Datei via Blob-Download (Browser + Tauri-WebView).
 *
 * 1:1-Kopie aus `features/reminders/lib/download-export.ts` — Cross-Feature-
 * Imports zwischen isolierten Slices sind eine Architektur-Verletzung;
 * eine Promotion auf `src/lib/` ist ein Plattform-Polish-Pass und nicht
 * im Scope von Story 5.4.
 */
export async function downloadExport(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    // Code-Review-Patch (P8): `a.click()` kann in Tauri-WebView synchron
    // werfen oder die Navigation asynchron starten. Cleanup in `finally`,
    // damit DOM-Knoten und Object-URL nicht leaken; das `setTimeout(0)` gibt
    // Safari/Tauri-Browsern eine Tick-Reserve, in der die Download-Pipeline
    // den Object-URL noch lesen darf, bevor er invalidiert wird.
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

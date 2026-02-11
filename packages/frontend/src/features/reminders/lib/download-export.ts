/**
 * Laedt eine Export-Datei herunter via Blob-Download.
 * Funktioniert sowohl im Browser als auch im Tauri-WebView.
 */
export async function downloadExport(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import html2canvas from 'html2canvas';

/**
 * Minimale Screenshot-Auflösung (Breite x Höhe)
 */
const MIN_SCREENSHOT_WIDTH = 1024;
const MIN_SCREENSHOT_HEIGHT = 768;

/**
 * Erfasst einen Screenshot eines Map-Elements (Lagekarte)
 *
 * @param mapElement - Das HTML-Element, das die Karte enthält
 * @returns Promise mit Blob des generierten Screenshots (PNG)
 *
 * @remarks
 * - Verwendet html2canvas für Browser-seitige Screenshot-Generierung
 * - Mindestauflösung: 1024x768px (skaliert bei Bedarf)
 * - Format: PNG (verlustfrei, unterstützt Transparenz)
 * - CORS: Aktiviert für OSM-Tiles (`useCORS: true`)
 * - Scale: 2x für High-DPI-Displays
 *
 * @throws Error wenn Screenshot-Generierung fehlschlägt
 *
 * @example
 * ```tsx
 * const mapElement = document.getElementById('map-container');
 * const screenshot = await captureMapScreenshot(mapElement);
 * // Upload screenshot blob to backend
 * ```
 */
export async function captureMapScreenshot(mapElement: HTMLElement): Promise<Blob> {
  if (!mapElement) {
    throw new Error('Map element not found');
  }

  try {
    // Capture map as canvas
    const canvas = await html2canvas(mapElement, {
      useCORS: true, // Enable cross-origin tiles (OSM)
      scale: 2, // 2x resolution for high-DPI displays
      backgroundColor: '#ffffff', // White background for transparency fallback
      logging: false, // Disable debug logging
      allowTaint: false, // Prevent tainted canvas (CORS security)
    });

    // Ensure minimum resolution
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;

    let finalCanvas = canvas;

    // Scale up if below minimum resolution
    if (currentWidth < MIN_SCREENSHOT_WIDTH || currentHeight < MIN_SCREENSHOT_HEIGHT) {
      const scaleX = MIN_SCREENSHOT_WIDTH / currentWidth;
      const scaleY = MIN_SCREENSHOT_HEIGHT / currentHeight;
      const scale = Math.max(scaleX, scaleY);

      finalCanvas = document.createElement('canvas');
      finalCanvas.width = Math.floor(currentWidth * scale);
      finalCanvas.height = Math.floor(currentHeight * scale);

      const ctx = finalCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      finalCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'));
            return;
          }
          resolve(blob);
        },
        'image/png',
        1.0, // Maximum quality
      );
    });
  } catch (error) {
    throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

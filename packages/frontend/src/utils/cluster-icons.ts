import L from 'leaflet';

/**
 * Erstellt ein Tailwind-gestyltes Cluster-Icon für Leaflet MarkerClusterGroup.
 *
 * @param cluster - Leaflet MarkerCluster Objekt
 * @returns Leaflet DivIcon mit Tailwind-Styling
 *
 * @remarks
 * Größen-Varianten basierend auf POI-Anzahl (Task 5):
 * - Small (<10 POIs): 40px diameter, text-sm
 * - Medium (10-99 POIs): 50px diameter, text-base
 * - Large (≥100 POIs): 60px diameter, text-lg
 *
 * Farben (AC: 5):
 * - Light-Mode: bg-blue-600, border-blue-400
 * - Dark-Mode: dark:bg-blue-800, dark:border-blue-600
 *
 * Security Note:
 * - childCount kommt von cluster.getChildCount() (Leaflet API, returns number)
 * - KEIN User-Input! Numerischer Wert ist XSS-sicher in Template Literals
 * - Bei Erweiterungen: NIEMALS User-Input ohne Sanitization in HTML einfügen
 */
export const createClusterIcon = (cluster: L.MarkerCluster): L.DivIcon => {
  const childCount = cluster.getChildCount(); // Safe: Leaflet API returns number, not user input

  // Size based on count (Task 5: Dynamic sizing)
  let sizeClasses = 'w-10 h-10 text-sm'; // Small (<10)
  let iconSize = 40; // Pixel size matching Tailwind classes

  if (childCount >= 100) {
    sizeClasses = 'w-14 h-14 text-lg'; // Large (≥100)
    iconSize = 56; // w-14 = 3.5rem = 56px
  } else if (childCount >= 10) {
    sizeClasses = 'w-12 h-12 text-base'; // Medium (10-99)
    iconSize = 48; // w-12 = 3rem = 48px
  }

  // Generate HTML (safe: childCount is numeric, not user-controlled)
  const html = `
    <div class="${sizeClasses} bg-blue-600 dark:bg-blue-800 text-white rounded-full border-2 border-blue-400 dark:border-blue-600 flex items-center justify-center font-semibold shadow-lg">
      <span>${childCount}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-cluster-icon', // Empty class to override default styles
    iconSize: L.point(iconSize, iconSize), // Dynamic size matching Tailwind classes
  });
};

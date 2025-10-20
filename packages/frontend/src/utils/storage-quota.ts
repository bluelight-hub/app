/**
 * Storage Quota Utility
 *
 * Ermittelt verfügbaren Browser-Speicher über die Storage Manager API.
 *
 * @module utils/storage-quota
 */

/**
 * Storage-Quota-Informationen
 */
export interface StorageQuota {
  /**
   * Genutzter Speicher in MB
   */
  used: number;
  /**
   * Verfügbarer Speicher in MB
   */
  available: number;
  /**
   * Prozentuale Auslastung (0-100)
   */
  percentage: number;
}

/**
 * Ermittelt verfügbare Storage-Quota über Storage Manager API
 *
 * Verwendet `navigator.storage.estimate()` um Speicherauslastung zu berechnen.
 *
 * @returns Promise mit Quota-Informationen in MB
 * @throws Error wenn Storage API nicht verfügbar ist
 *
 * @example
 * ```typescript
 * const quota = await getStorageQuota();
 * console.log(`Verfügbar: ${quota.available} MB (${100 - quota.percentage}% frei)`);
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate
 */
export async function getStorageQuota(): Promise<StorageQuota> {
  // Check if Storage API is supported
  if (!navigator.storage?.estimate) {
    throw new Error('Storage API not supported in this browser');
  }

  try {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const total = estimate.quota || 0;
    const available = total - used;
    const percentage = total > 0 ? (used / total) * 100 : 0;

    return {
      used: Math.round(used / (1024 * 1024)), // Convert to MB
      available: Math.round(available / (1024 * 1024)), // Convert to MB
      percentage: Math.round(percentage),
    };
  } catch (error) {
    throw new Error(`Failed to get storage quota: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

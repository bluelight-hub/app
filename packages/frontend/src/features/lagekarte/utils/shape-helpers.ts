/**
 * Generate unique shape ID using crypto.randomUUID()
 * Fallback to Date.now() + random suffix for older browsers
 */
export const generateShapeId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

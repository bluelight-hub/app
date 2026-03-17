import { logger } from '@/shared/lib/logger';
import type { ZodType } from 'zod';

export class JsonResponseParseError extends Error {
  constructor(context: string, options?: ErrorOptions) {
    super(`Ungültige JSON-Antwort für ${context}`, options);
    this.name = 'JsonResponseParseError';
  }
}

/**
 * Parst und validiert eine JSON-Response zentral in `shared/api`.
 */
export async function parseJsonResponse<T>(response: Response, schema: ZodType<T>, context: string): Promise<T> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    logger.error('JSON-Antwort konnte nicht gelesen werden', { context, error });
    throw new JsonResponseParseError(context, { cause: error });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    logger.error('JSON-Antwort entspricht nicht dem erwarteten Vertrag', {
      context,
      issues: parsed.error.issues,
    });
    throw new JsonResponseParseError(context, { cause: parsed.error });
  }

  return parsed.data;
}

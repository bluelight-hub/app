/**
 * API Types Re-Export
 *
 * Re-exportiert häufig verwendete Types aus dem generierten OpenAPI-Client.
 * Dieser Wrapper vermeidet direkte Imports aus @bluelight-hub/shared/client
 * und löst Kompatibilitätsprobleme mit dem TypeScript-Compiler.
 */

// Re-export des generierten ResponseError als eigener Type
export class ResponseError extends Error {
  override name: 'ResponseError' = 'ResponseError';

  constructor(
    public response: Response,
    msg?: string,
  ) {
    super(msg);
  }
}

// Re-export aller DTOs, Types, Enums und Constants (sowohl Types als auch Values)
// WICHTIG: Kein "export type *" hier verwenden, da dies in Vite/esbuild dazu fuehrt,
// dass gleichnamige Value+Type Exporte (z.B. EintragDtoKategorieEnum) nur als Type
// re-exportiert werden und der Value zur Laufzeit undefined ist.
export * from '@bluelight-hub/shared/client';

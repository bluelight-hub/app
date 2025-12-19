/**
 * Type Utilities für häufige Type Conversions.
 *
 * Diese Utilities helfen bei der Konvertierung zwischen verschiedenen
 * Type-Systemen (z.B. Prisma DB vs TypeScript Domain).
 */

/**
 * Konvertiert `null` zu `undefined` für optionale Felder.
 *
 * **Use Case:** Prisma gibt `null` für optionale DB-Felder zurück,
 * aber TypeScript Domain Layer nutzt `undefined` Konvention.
 *
 * **Warum dieser Helper?**
 * - **DRY:** Verhindert Code-Duplikation (war 6x wiederholt in Mappern)
 * - **Type Safety:** Korrekte TypeScript Typen für null → undefined
 * - **Lesbarkeit:** Expliziter Name statt `?? undefined` Pattern
 *
 * @example
 * ```typescript
 * // ✅ VORHER (6x dupliziert):
 * stammId: (entity.stammId as string | null) ?? undefined
 * funkrufname: (entity.funkrufname as string | null) ?? undefined
 * updatedBy: (entity.updatedBy as string | null) ?? undefined
 *
 * // ✅ NACHHER (DRY):
 * stammId: nullToUndefined(entity.stammId)
 * funkrufname: nullToUndefined(entity.funkrufname)
 * updatedBy: nullToUndefined(entity.updatedBy)
 * ```
 *
 * @param value - Der zu konvertierende Wert (kann `null`, `undefined` oder `T` sein)
 * @returns `undefined` wenn `value` ist `null`, ansonsten `value`
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

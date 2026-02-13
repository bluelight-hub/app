import type { ErinnerungResponseDto } from '@/shared';

/**
 * Story 3.6 Issue #5: Helper zur Pruefung ob Erinnerung dem User gehoert.
 *
 * **Story 3.4 AC2 Fix:** Nach Zuweisung an jemand anderen verschwindet
 * die Erinnerung aus 'Meine Erinnerungen' des Erstellers.
 *
 * Eine Erinnerung gehoert dem User wenn:
 * - Sie ihm zugewiesen wurde (assignedToId === userId), ODER
 * - Sie an ihn eskaliert wurde (status === 'ESKALIERT' && eskalationsPersonId === userId), ODER
 * - Niemand zugewiesen ist UND er sie erstellt hat (assignedToId === null && erstelltVon === userId)
 */
export function isMyErinnerung(erinnerung: ErinnerungResponseDto, userId: string): boolean {
  const assignedTo = erinnerung.assignedToId as string | null | undefined;

  // Wenn mir zugewiesen -> meine Erinnerung
  if (assignedTo === userId) {
    return true;
  }

  // Story 4.5: Wenn an mich eskaliert -> meine Erinnerung (Prioritaet vor Ersteller)
  if (erinnerung.status === 'ESKALIERT' && erinnerung.eskalationsPersonId === userId) {
    return true;
  }

  // Wenn niemand zugewiesen UND ich Ersteller -> meine Erinnerung
  if (!assignedTo && erinnerung.erstelltVon === userId) {
    return true;
  }

  // Sonst nicht meine Erinnerung
  return false;
}

/**
 * Filtert eine Liste von Erinnerungen auf die, die dem User "gehoeren".
 *
 * Nutzt `isMyErinnerung` fuer die Pruefung.
 */
export function filterMyErinnerungen(erinnerungen: ErinnerungResponseDto[], userId: string): ErinnerungResponseDto[] {
  return erinnerungen.filter((e) => isMyErinnerung(e, userId));
}

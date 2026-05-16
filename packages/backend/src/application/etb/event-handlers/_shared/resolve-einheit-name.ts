import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';

/**
 * Löst eine `EinsatzEinheit`-ID in einen lesbaren Anzeigenamen auf.
 *
 * Wird von den Eigenschutz-ETB-Handlern genutzt, damit Audit-Texte den
 * Namen der Einheit (z. B. "Rotkreuz Mannheim 83/1") statt der nackten
 * CUID2 enthalten. Der Lookup geschieht zum Zeitpunkt der ETB-Eintrag-
 * Erstellung — sobald der Text geschrieben ist, ist er persistent und
 * eine spätere Umbenennung der Einheit lässt den Eintrag unangetastet
 * (Snapshot-by-Persistence).
 *
 * **Fallback-Verhalten:** Bei Repository-Fehler oder bereits gelöschter
 * Einheit wird die ID selbst zurückgegeben, damit der ETB-Eintrag nicht
 * verloren geht. Das ist konsistent mit dem Fire-and-Forget-Pattern der
 * aufrufenden Handler.
 */
export async function resolveEinheitName(repo: IEinsatzEinheitRepository, einheitId: string | undefined | null): Promise<string> {
  if (!einheitId) {
    return '(unbekannte Einheit)';
  }
  try {
    const result = await repo.findById(einheitId);
    if (result.isFailure || !result.value) {
      return einheitId;
    }
    return result.value.name;
  } catch {
    return einheitId;
  }
}

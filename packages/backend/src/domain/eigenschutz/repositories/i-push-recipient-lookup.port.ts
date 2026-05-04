import type { Result } from '@domain/common/result';

/**
 * Lookup-Port für Push-Empfänger eines PSA-Profil-Events (Story 3.8 AC2).
 *
 * **Vertrag** (MVP, Q1-Default):
 * Liefert die eindeutigen User-IDs aller `EinsatzPersonEinheit`-Mitglieder der
 * Einheit, die einen `User.stammpersonId`-Bezug haben (sonst kein Push-fähiger
 * Account). Externe Helfer ohne User-Konto werden natürlich ausgefiltert.
 *
 * **Bewusst KEIN Filter auf `eigenschutz:psa:acknowledge`-Permission:**
 * Permissions sind im MVP als „darf quittieren?"-Gating modelliert (FR46).
 * Push-Empfang ist ein „informieren"-Bedürfnis und soll alle Personen an der
 * Front erreichen — auch z. B. Sanitäter, die selbst nicht quittieren, aber
 * die PSA-Hochstufung wahrnehmen müssen, um sich rechtzeitig zu schützen
 * (Sicherheits-Domäne: lieber zu viele Pushes als ein verpasster CBRN-Alarm).
 * Die Q-Liste der Story hält die Alternative explizit fest, falls dies im
 * Pilot nachjustiert werden muss.
 *
 * **Abwesende Push-Subscription:** Der Push-Service (Story 1.1) loggt für
 * User ohne Subscription `debug` und sendet kein Frame — kein Fehlerpfad hier.
 *
 * **Ein-User-mehrere-Geräte:** Fan-Out pro Gerät erledigt der Push-Service
 * (`PushNotificationsService.send` iteriert über `findByUserId`).
 */
export interface IPushRecipientLookupPort {
  /**
   * Liefert die User-IDs aller Personen, die der Einheit aktuell zugewiesen
   * sind und einen User-Account haben. Result.ok([]) ist gültig (Einheit ohne
   * zugewiesene Personen → kein Push, kein Fehler).
   *
   * **Hinweis Audit:** Diese Liste ist NICHT der Audit-Eintrag „wer wurde
   * informiert" — der Empfänger-Listen-Snapshot landet in der bestehenden
   * `psa_profil_zuweisungen.protokollEintrag`-Spur (Story 3.1) oder im
   * Push-Service-Log (`subscriptionId + endpointHost + eventId`,
   * Story 1.1 AC4). Story 3.8 selbst persistiert KEINE Empfänger-Tabelle.
   */
  listRecipientsForEinheit(einsatzId: string, einheitId: string): Promise<Result<string[]>>;
}

/**
 * Mapping-Utilities für Alarmierungs-Empfänger.
 *
 * Die UI hält Empfänger als `EmpfaengerInput` (einheitliches `refId`-Feld pro
 * Typ); das Backend erwartet den polymorphen DTO `CreateAlarmierungDtoEmpfaengerInner`
 * mit je eigenem ID-Feld (`fahrzeugId` | `personId` | `einheitId`). Diese
 * Konvertierung wird sowohl im Create-Drawer als auch im Nachalarmierungs-Dialog
 * benötigt und ist deshalb hier zentralisiert.
 */

import type { CreateAlarmierungDtoEmpfaengerInner } from '@bluelight-hub/shared/client';
import type { EmpfaengerInput } from '../schemas/alarmierung.schema';

/**
 * Mapped die UI-Empfänger-Liste auf den polymorphen Backend-DTO-Array.
 *
 * Das Backend-DTO {@link CreateAlarmierungDtoEmpfaengerInner} ist eine
 * Discriminator-Union über `kind` — der jeweils „passende" ID-Feldname
 * (`fahrzeugId` / `personId` / `einheitId`) wird vom Backend validiert.
 */
export function toCreateEmpfaenger(empfaenger: EmpfaengerInput[]): CreateAlarmierungDtoEmpfaengerInner[] {
  return empfaenger.map<CreateAlarmierungDtoEmpfaengerInner>((e) => {
    if (e.kind === 'fahrzeug') return { kind: 'fahrzeug', fahrzeugId: e.refId, nameSnapshot: e.nameSnapshot ?? null };
    if (e.kind === 'person') return { kind: 'person', personId: e.refId, nameSnapshot: e.nameSnapshot ?? null };
    return { kind: 'einheit', einheitId: e.refId, nameSnapshot: e.nameSnapshot ?? null };
  });
}

/**
 * Notification Resolver
 *
 * Pure Functions fuer die Entscheidungslogik welche Notification
 * bei welchem WebSocket-Event angezeigt werden soll.
 *
 * Kein Side-Effect, einfach unit-testbar.
 */

export type AlarmKind = 'befehl-erstellt' | 'quittierung-kritisch' | 'befehl-korrigiert';

export type BefehlNotification = { kind: 'alarm'; alarmKind: AlarmKind } | { kind: 'toast'; level: 'info' | 'success' | 'warning'; title: string; description: string } | { kind: 'none' };

interface ErstelltEvent {
  erstellerId: string;
  empfaengerIds?: string[];
  nummer: string;
  auftrag: string;
}

/**
 * Entscheidet welche Notification fuer ein befehl.erstellt Event gezeigt wird.
 *
 * - isEmpfaenger → alarm('befehl-erstellt')
 * - isOwnEvent → none
 * - sonst → toast(info, 'Neuer Befehl #N')
 */
export function resolveErstelltNotification(event: ErstelltEvent, userId: string | undefined): BefehlNotification {
  if (!userId) return { kind: 'none' };

  const isEmpfaenger = event.empfaengerIds?.includes(userId);
  if (isEmpfaenger) {
    return { kind: 'alarm', alarmKind: 'befehl-erstellt' };
  }

  const isOwnEvent = event.erstellerId === userId;
  if (isOwnEvent) {
    return { kind: 'none' };
  }

  return {
    kind: 'toast',
    level: 'info',
    title: `Neuer Befehl #${event.nummer}`,
    description: (event.auftrag ?? '').substring(0, 80),
  };
}

interface QuittiertEvent {
  empfaengerId: string;
  quittierungArt: string;
  erstellerId?: string;
  befehlsgeberId?: string;
  nummer?: string;
}

/**
 * Entscheidet welche Notification fuer ein befehl.quittiert Event gezeigt wird.
 *
 * - isOwnQuittierung → none
 * - isBefehlsgeber + RUECKFRAGE/NICHT_VERSTANDEN → alarm('quittierung-kritisch')
 * - isBefehlsgeber + VERSTANDEN → toast(success, 'Befehl quittiert')
 * - !isBefehlsgeber + NICHT_VERSTANDEN → toast(warning, 'Befehl nicht verstanden')
 * - sonst → toast(info, 'Befehl quittiert')
 */
export function resolveQuittiertNotification(event: QuittiertEvent, userId: string | undefined): BefehlNotification {
  if (!userId) return { kind: 'none' };

  const isOwnQuittierung = event.empfaengerId === userId;
  if (isOwnQuittierung) {
    return { kind: 'none' };
  }

  const isBefehlsgeber = event.befehlsgeberId === userId || event.erstellerId === userId;
  const isCritical = event.quittierungArt === 'RUECKFRAGE' || event.quittierungArt === 'NICHT_VERSTANDEN';

  if (isBefehlsgeber && isCritical) {
    return { kind: 'alarm', alarmKind: 'quittierung-kritisch' };
  }

  if (isBefehlsgeber) {
    return {
      kind: 'toast',
      level: 'success',
      title: `Befehl #${event.nummer} quittiert`,
      description: 'Ein Empfänger hat Ihren Befehl verstanden',
    };
  }

  if (event.quittierungArt === 'NICHT_VERSTANDEN') {
    const nummerLabel = event.nummer ? ` #${event.nummer}` : '';
    return {
      kind: 'toast',
      level: 'warning',
      title: `Befehl${nummerLabel} nicht verstanden`,
      description: 'Ein Empfänger hat einen Befehl als "Nicht verstanden" quittiert',
    };
  }

  return {
    kind: 'toast',
    level: 'info',
    title: 'Befehl quittiert',
    description: 'Ein Empfänger hat den Befehl quittiert',
  };
}

interface StatusGeaendertEvent {
  newStatus: string;
  erstellerId?: string;
  befehlsgeberId?: string;
  empfaengerIds?: string[];
  nummer?: string;
}

/**
 * Entscheidet welche Notification fuer ein befehl.statusGeaendert Event gezeigt wird.
 *
 * - newStatus !== 'KORRIGIERT' → none
 * - isEmpfaenger → alarm('befehl-korrigiert')
 * - isBefehlsgeber (hat Korrektur selbst ausgeloest) → none
 * - sonst → none
 */
export function resolveStatusGeaendertNotification(event: StatusGeaendertEvent, userId: string | undefined): BefehlNotification {
  if (!userId) return { kind: 'none' };

  if (event.newStatus !== 'KORRIGIERT') {
    return { kind: 'none' };
  }

  const isEmpfaenger = event.empfaengerIds?.includes(userId);
  if (isEmpfaenger) {
    return { kind: 'alarm', alarmKind: 'befehl-korrigiert' };
  }

  return { kind: 'none' };
}

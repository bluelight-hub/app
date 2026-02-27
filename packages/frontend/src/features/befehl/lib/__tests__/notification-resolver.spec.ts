import { describe, expect, it } from 'vitest';
import { resolveErstelltNotification, resolveQuittiertNotification, resolveStatusGeaendertNotification } from '../notification-resolver';

describe('resolveErstelltNotification', () => {
  const baseEvent = {
    erstellerId: 'user-ersteller',
    empfaengerIds: ['user-empfaenger-1', 'user-empfaenger-2'],
    nummer: 'B-001',
    auftrag: 'Absperren',
  };

  it('gibt alarm(befehl-erstellt) fuer Empfaenger', () => {
    const result = resolveErstelltNotification(baseEvent, 'user-empfaenger-1');
    expect(result).toEqual({ kind: 'alarm', alarmKind: 'befehl-erstellt' });
  });

  it('gibt none fuer eigenes Event', () => {
    const result = resolveErstelltNotification(baseEvent, 'user-ersteller');
    expect(result).toEqual({ kind: 'none' });
  });

  it('gibt toast(info) fuer Team-Mitglieder', () => {
    const result = resolveErstelltNotification(baseEvent, 'user-zuschauer');
    expect(result).toEqual({
      kind: 'toast',
      level: 'info',
      title: 'Neuer Befehl #B-001',
      description: 'Absperren',
    });
  });

  it('gibt none ohne userId', () => {
    const result = resolveErstelltNotification(baseEvent, undefined);
    expect(result).toEqual({ kind: 'none' });
  });

  it('Empfaenger-Alarm hat Vorrang vor eigenem Event (Selbst-Zuweisung)', () => {
    const event = { ...baseEvent, empfaengerIds: ['user-ersteller'] };
    const result = resolveErstelltNotification(event, 'user-ersteller');
    expect(result).toEqual({ kind: 'alarm', alarmKind: 'befehl-erstellt' });
  });
});

describe('resolveQuittiertNotification', () => {
  const baseEvent = {
    empfaengerId: 'user-empfaenger',
    quittierungArt: 'VERSTANDEN',
    erstellerId: 'user-ersteller',
    befehlsgeberId: 'user-befehlsgeber',
    nummer: 'B-001',
  };

  it('gibt none fuer eigene Quittierung', () => {
    const result = resolveQuittiertNotification(baseEvent, 'user-empfaenger');
    expect(result).toEqual({ kind: 'none' });
  });

  it('gibt alarm(quittierung-kritisch) fuer Befehlsgeber bei RUECKFRAGE', () => {
    const event = { ...baseEvent, quittierungArt: 'RUECKFRAGE' };
    const result = resolveQuittiertNotification(event, 'user-befehlsgeber');
    expect(result).toEqual({ kind: 'alarm', alarmKind: 'quittierung-kritisch' });
  });

  it('gibt alarm(quittierung-kritisch) fuer Ersteller bei NICHT_VERSTANDEN', () => {
    const event = { ...baseEvent, quittierungArt: 'NICHT_VERSTANDEN' };
    const result = resolveQuittiertNotification(event, 'user-ersteller');
    expect(result).toEqual({ kind: 'alarm', alarmKind: 'quittierung-kritisch' });
  });

  it('gibt toast(success) fuer Befehlsgeber bei VERSTANDEN', () => {
    const result = resolveQuittiertNotification(baseEvent, 'user-befehlsgeber');
    expect(result).toEqual({
      kind: 'toast',
      level: 'success',
      title: 'Befehl #B-001 quittiert',
      description: 'Ein Empfänger hat Ihren Befehl verstanden',
    });
  });

  it('gibt toast(warning) fuer Team-Mitglied bei NICHT_VERSTANDEN', () => {
    const event = { ...baseEvent, quittierungArt: 'NICHT_VERSTANDEN' };
    const result = resolveQuittiertNotification(event, 'user-zuschauer');
    expect(result).toEqual({
      kind: 'toast',
      level: 'warning',
      title: 'Befehl #B-001 nicht verstanden',
      description: 'Ein Empfänger hat einen Befehl als "Nicht verstanden" quittiert',
    });
  });

  it('gibt toast(info) fuer Team-Mitglied bei VERSTANDEN', () => {
    const result = resolveQuittiertNotification(baseEvent, 'user-zuschauer');
    expect(result).toEqual({
      kind: 'toast',
      level: 'info',
      title: 'Befehl quittiert',
      description: 'Ein Empfänger hat den Befehl quittiert',
    });
  });

  it('gibt none ohne userId', () => {
    const result = resolveQuittiertNotification(baseEvent, undefined);
    expect(result).toEqual({ kind: 'none' });
  });
});

describe('resolveStatusGeaendertNotification', () => {
  const baseEvent = {
    newStatus: 'KORRIGIERT',
    erstellerId: 'user-ersteller',
    befehlsgeberId: 'user-befehlsgeber',
    empfaengerIds: ['user-empfaenger-1', 'user-empfaenger-2'],
    nummer: 'B-001',
  };

  it('gibt alarm(befehl-korrigiert) fuer Empfaenger bei KORRIGIERT', () => {
    const result = resolveStatusGeaendertNotification(baseEvent, 'user-empfaenger-1');
    expect(result).toEqual({ kind: 'alarm', alarmKind: 'befehl-korrigiert' });
  });

  it('gibt none fuer Befehlsgeber bei KORRIGIERT', () => {
    const result = resolveStatusGeaendertNotification(baseEvent, 'user-befehlsgeber');
    expect(result).toEqual({ kind: 'none' });
  });

  it('gibt none fuer nicht-KORRIGIERT Status', () => {
    const event = { ...baseEvent, newStatus: 'ZUGESTELLT' };
    const result = resolveStatusGeaendertNotification(event, 'user-empfaenger-1');
    expect(result).toEqual({ kind: 'none' });
  });

  it('gibt none ohne userId', () => {
    const result = resolveStatusGeaendertNotification(baseEvent, undefined);
    expect(result).toEqual({ kind: 'none' });
  });

  it('gibt none fuer unbeteiligten User bei KORRIGIERT', () => {
    const result = resolveStatusGeaendertNotification(baseEvent, 'user-zuschauer');
    expect(result).toEqual({ kind: 'none' });
  });
});

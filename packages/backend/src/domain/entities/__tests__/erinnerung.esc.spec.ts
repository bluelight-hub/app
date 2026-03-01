// Mock cuid2 for Jest compatibility (ESM module issue) - MUST be before imports
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

import { Erinnerung } from '@domain/entities/erinnerung.entity';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { ErinnerungStatus } from '@domain/value-objects/erinnerung-status';
import { ErinnerungTitel } from '@domain/value-objects/erinnerung-titel';
import { ErinnerungId } from '@domain/value-objects/erinnerung-id';

describe('Erinnerung Entity - Escalation Statistics (Story 4.9)', () => {
  let testEinsatzId: EinsatzId;
  let testUserId: UserId;
  let eskalationsTargetId: UserId;

  beforeEach(() => {
    jest.clearAllMocks();
    testEinsatzId = EinsatzId.create().value!;
    testUserId = UserId.create().value!;
    eskalationsTargetId = UserId.create().value!;
  });

  function createAusgeloesteErinnerung(): Erinnerung {
    const id = ErinnerungId.create().value!;
    const titel = ErinnerungTitel.create('Test').value!;
    return Erinnerung.reconstruct({
      id,
      einsatzId: testEinsatzId,
      titel,
      beschreibung: null,
      faelligAm: new Date(Date.now() - 1000), // In past
      status: ErinnerungStatus.AUSGELOEST(),
      erstelltVon: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ausgeloestAm: new Date(),
    });
  }

  it('sollte wurdeEskaliert und eskaliertAm bei erster Eskalation setzen', () => {
    // Given
    const erinnerung = createAusgeloesteErinnerung();

    expect(erinnerung.wurdeEskaliert).toBeFalsy();

    expect(erinnerung.eskaliertAm).toBeNull();

    // When
    erinnerung.eskalieren(testUserId, eskalationsTargetId);

    // Then
    expect(erinnerung.status.isEskaliert()).toBe(true);

    expect(erinnerung.wurdeEskaliert).toBe(true);

    expect(erinnerung.eskaliertAm).not.toBeNull();

    expect(erinnerung.eskaliertAm).toBeInstanceOf(Date);
  });

  it('sollte eskaliertAm bei weiterer Eskalation NICHT ueberschreiben (First Escalation Time)', () => {
    // Given: Already escalated
    const erinnerung = createAusgeloesteErinnerung();
    erinnerung.eskalieren(testUserId, eskalationsTargetId);

    const firstEscalationTime = erinnerung.eskaliertAm?.getTime();

    // Wait a bit to ensure potential timestamp diff
    jest.useFakeTimers();
    jest.advanceTimersByTime(5000); // 5 sec later

    const nextTargetId = UserId.create().value!;

    // When: Escalate again (Chain)
    erinnerung.eskalieren(testUserId, nextTargetId);

    // Then

    expect(erinnerung.wurdeEskaliert).toBe(true);

    expect(erinnerung.eskaliertAm?.getTime()).toBe(firstEscalationTime);
    expect(erinnerung.escalatedAt?.getTime()).not.toBe(firstEscalationTime); // escalatedAt should update (Last Escalation)

    jest.useRealTimers();
  });
});

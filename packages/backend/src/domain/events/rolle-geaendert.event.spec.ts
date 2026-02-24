/**
 * Unit Tests fuer RolleGeaendertEvent.
 *
 * Story 5.4 AC4: Domain Event fuer Einsatz-Rollenänderungen.
 */
import { RolleGeaendertEvent } from './rolle-geaendert.event';
import { EVENT_NAMES } from './event-names';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

describe('RolleGeaendertEvent', () => {
  it('sollte den korrekten Event-Namen zurueckgeben', () => {
    // Given / When
    const eventName = RolleGeaendertEvent.eventName();

    // Then
    expect(eventName).toBe(EVENT_NAMES.EINSATZ_ROLLE.GEAENDERT);
    expect(eventName).toBe('rolle.geaendert');
  });

  it('sollte ein Event mit allen Feldern erstellen (Rollenaenderung)', () => {
    // Given
    const einsatzId = 'einsatz-123';
    const userId = 'user-456';
    const userName = 'Max Mustermann';
    const alteRolle = 'Gruppenführer';
    const neueRolle = 'Zugführer';
    const aenderungDurch = 'admin-789';
    const aenderungDurchName = 'Admin User';

    // When
    const event = new RolleGeaendertEvent(einsatzId, userId, userName, alteRolle, neueRolle, aenderungDurch, aenderungDurchName);

    // Then
    expect(event.einsatzId).toBe(einsatzId);
    expect(event.userId).toBe(userId);
    expect(event.userName).toBe(userName);
    expect(event.alteRolle).toBe(alteRolle);
    expect(event.neueRolle).toBe(neueRolle);
    expect(event.aenderungDurch).toBe(aenderungDurch);
    expect(event.aenderungDurchName).toBe(aenderungDurchName);
    expect(event.eventId).toBeDefined();
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('sollte ein Event mit null alteRolle erstellen (neue Zuweisung)', () => {
    // Given / When
    const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', null, 'Zugführer', 'admin-789', 'Admin User');

    // Then
    expect(event.alteRolle).toBeNull();
    expect(event.neueRolle).toBe('Zugführer');
  });

  it('sollte ein Event mit null neueRolle erstellen (Entfernung)', () => {
    // Given / When
    const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', 'Zugführer', null, 'admin-789', 'Admin User');

    // Then
    expect(event.alteRolle).toBe('Zugführer');
    expect(event.neueRolle).toBeNull();
  });

  it('sollte Event Version 1 zurueckgeben', () => {
    expect(RolleGeaendertEvent.eventVersion()).toBe(1);
  });

  it('sollte optionale aggregateId akzeptieren', () => {
    // Given / When
    const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', null, 'Zugführer', 'admin-789', 'Admin User', 'aggregate-id-123');

    // Then
    expect(event.aggregateId).toBe('aggregate-id-123');
  });
});

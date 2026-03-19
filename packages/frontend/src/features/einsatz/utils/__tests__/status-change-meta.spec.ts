/**
 * Unit-Tests: deriveStatusChangeMeta()
 *
 * Story 2.3, Task 6.1:
 * - Timestamp-Extraktion
 * - Herkunft-Mapping (System, Funk, User, Unbekannt)
 * - Fallback-Werte bei fehlenden Daten
 * - Version/Update-Erkennung
 */
import { describe, expect, it } from 'vitest';
import { deriveStatusChangeMeta, type StatusChangeInput } from '../status-change-meta';

const mockGetUserName = (id: string) => `User-${id.slice(0, 4)}`;

describe('deriveStatusChangeMeta', () => {
  it('extrahiert einen gültigen Timestamp aus einem Date-Objekt', () => {
    // Given - Eintrag mit Date-Timestamp
    const entry: StatusChangeInput = {
      timestamp: new Date('2026-03-16T12:00:00.000Z'),
      createdBy: 'user-abc',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.timestamp).toBeInstanceOf(Date);
    expect(meta.timestamp?.toISOString()).toBe('2026-03-16T12:00:00.000Z');
  });

  it('extrahiert einen gültigen Timestamp aus einem ISO-String', () => {
    // Given - Eintrag mit String-Timestamp
    const entry: StatusChangeInput = {
      timestamp: '2026-03-16T14:30:00.000Z',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.timestamp).toBeInstanceOf(Date);
    expect(meta.timestamp?.toISOString()).toBe('2026-03-16T14:30:00.000Z');
  });

  it('gibt null zurück bei fehlendem Timestamp', () => {
    // Given - Eintrag ohne Timestamp
    const entry: StatusChangeInput = {};

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.timestamp).toBeNull();
  });

  it('gibt null zurück bei ungültigem Timestamp', () => {
    // Given - Ungültiger Timestamp
    const entry: StatusChangeInput = {
      timestamp: 'invalid-date',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.timestamp).toBeNull();
  });

  it('erkennt System-Herkunft bei isAutomatic=true', () => {
    // Given - Automatisch generierter Eintrag
    const entry: StatusChangeInput = {
      timestamp: new Date(),
      isAutomatic: true,
      absender: 'Führung 1',
      createdBy: 'user-123',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then - System hat Vorrang vor Absender und User
    expect(meta.source).toBe('system');
    expect(meta.sourceDisplay).toBe('System');
    expect(meta.isAutomatic).toBe(true);
  });

  it('erkennt Funk-Herkunft bei vorhandenem Absender', () => {
    // Given - Eintrag mit Funkrufname
    const entry: StatusChangeInput = {
      timestamp: new Date(),
      absender: 'Florian 1/44/1',
      createdBy: 'user-123',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then - Absender hat Vorrang vor User
    expect(meta.source).toBe('funk');
    expect(meta.sourceDisplay).toBe('Florian 1/44/1');
  });

  it('erkennt User-Herkunft mit aufgelöstem Namen bei getUserName', () => {
    // Given - Eintrag mit createdBy und getUserName-Funktion
    const entry: StatusChangeInput = {
      timestamp: new Date(),
      createdBy: 'user-abc123',
    };

    // When
    const meta = deriveStatusChangeMeta(entry, mockGetUserName);

    // Then
    expect(meta.source).toBe('user');
    expect(meta.sourceDisplay).toBe('User-user');
  });

  it('fällt auf "Nutzer" zurück wenn createdBy ohne getUserName', () => {
    // Given - Eintrag mit createdBy, aber ohne getUserName
    const entry: StatusChangeInput = {
      timestamp: new Date(),
      createdBy: 'user-abc123',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.source).toBe('user');
    expect(meta.sourceDisplay).toBe('Nutzer');
    // Actor-Fallback ohne Resolver: 'Nutzer'
    expect(meta.actor).toBe('Nutzer');
  });

  it('gibt "Unbekannt" zurück wenn keine Herkunft ableitbar', () => {
    // Given - Eintrag ohne jede Herkunft
    const entry: StatusChangeInput = {
      timestamp: new Date(),
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.source).toBe('unknown');
    expect(meta.sourceDisplay).toBe('Unbekannt');
  });

  it('erkennt aktualisierte Einträge anhand version > 1', () => {
    // Given - Eintrag mit Version > 1
    const entry: StatusChangeInput = {
      timestamp: new Date(),
      version: 3,
      createdBy: 'user-1',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.isUpdated).toBe(true);
    expect(meta.version).toBe(3);
  });

  it('erkennt aktualisierte Einträge anhand updatedBy', () => {
    // Given - Eintrag mit updatedBy aber version 1
    const entry: StatusChangeInput = {
      timestamp: new Date(),
      version: 1,
      createdBy: 'user-1',
      updatedBy: 'user-2',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.isUpdated).toBe(true);
  });

  it('gibt isUpdated=false für unveränderte Einträge zurück', () => {
    // Given - Eintrag ohne Änderung
    const entry: StatusChangeInput = {
      timestamp: new Date(),
      version: 1,
      createdBy: 'user-1',
    };

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.isUpdated).toBe(false);
    expect(meta.version).toBe(1);
  });

  it('löst den Akteur über updatedBy auf (Vorrang vor createdBy)', () => {
    // Given - Eintrag mit updatedBy und createdBy (distinkte IDs für klare Priorisierung)
    const entry: StatusChangeInput = {
      timestamp: new Date(),
      createdBy: 'creator-abc',
      updatedBy: 'editor-xyz',
    };

    // When
    const meta = deriveStatusChangeMeta(entry, mockGetUserName);

    // Then - updatedBy hat Vorrang: 'editor-xyz'.slice(0,4) = 'edit' → 'User-edit'
    expect(meta.actor).toBe('User-edit');
  });

  it('verwendet Fallback-Defaults für alle optionalen Felder', () => {
    // Given - Komplett leerer Eintrag
    const entry: StatusChangeInput = {};

    // When
    const meta = deriveStatusChangeMeta(entry);

    // Then
    expect(meta.timestamp).toBeNull();
    expect(meta.source).toBe('unknown');
    expect(meta.sourceDisplay).toBe('Unbekannt');
    expect(meta.actor).toBeNull();
    expect(meta.isAutomatic).toBe(false);
    expect(meta.isUpdated).toBe(false);
    expect(meta.version).toBe(1);
  });
});

# Story 1.10: Offline-Capability mit IndexedDB

## Story Details
- **Story ID**: ETB-1.10
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 13
- **Sprint**: Phase 3

## User Story
**Als** Einsatzkraft  
**möchte ich** auch offline arbeiten  
**damit** die Dokumentation immer funktioniert

## Acceptance Criteria
- [ ] IndexedDB-Storage implementiert
- [ ] Offline-Indicator in UI sichtbar
- [ ] Sync-Queue für offline Änderungen
- [ ] Konfliktauflösung bei Sync
- [ ] Automatische Sync bei Verbindung
- [ ] Manueller Sync-Button verfügbar
- [ ] Progress-Indicator während Sync
- [ ] Speicherplatz für 50 Einsätze (je 500 Einträge)
- [ ] Cache-Invalidierung nach 30 Tagen

## Technical Requirements
```typescript
// IndexedDB Schema:
interface OfflineStore {
  etb: {
    key: string; // einsatzId
    value: EtbWithEntries;
  };
  syncQueue: {
    key: string; // nanoid
    value: {
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      entity: 'etb' | 'entry';
      data: any;
      timestamp: Date;
      retries: number;
    };
  };
}

// Sync Strategy:
1. Offline changes → syncQueue
2. On reconnect → process queue FIFO
3. Conflict resolution: Server wins, local backup
4. Failed sync → retry with exponential backoff

// Service Worker für Background Sync
```

## Definition of Done
- [ ] IndexedDB Integration komplett
- [ ] Service Worker registriert
- [ ] Offline-Mode getestet
- [ ] Sync-Mechanismus funktioniert
- [ ] Conflict Resolution implementiert
- [ ] Performance-Tests (1000 Einträge)
- [ ] Storage-Quota Management

## Dependencies
- Story 1.5 (UI Components)
- Story 1.8 (WebSocket für Online-Status)

## Notes
- Kritisch für Feldeinsätze
- Tauri Desktop App hat bessere Offline-Unterstützung
- Progressive Web App (PWA) Manifest hinzufügen
- Background Sync API nutzen
# Story 1.8: Real-time Updates via WebSocket

## Story Details
- **Story ID**: ETB-1.8
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: MEDIUM
- **Story Points**: 8
- **Sprint**: Phase 2

## User Story
**Als** FüKW Personal  
**möchte ich** neue Einträge sofort sehen  
**damit** alle informiert sind

## Acceptance Criteria
- [ ] WebSocket-Connection etabliert
- [ ] Auto-Update bei neuen Einträgen (< 500ms)
- [ ] Update-Indikator bei neuen Einträgen
- [ ] Reconnection-Logic bei Verbindungsabbruch
- [ ] Fallback auf Polling (alle 5 Sekunden)
- [ ] Connection-Status-Indikator
- [ ] Optimistic Updates bleiben erhalten
- [ ] Conflict Resolution bei gleichzeitigen Edits

## Technical Requirements
```typescript
// Backend WebSocket Gateway:
@WebSocketGateway()
export class EtbGateway {
  @SubscribeMessage('etb:subscribe')
  handleSubscribe(client: Socket, einsatzId: string) {}
  
  @SubscribeMessage('etb:entry:created')
  handleEntryCreated(entry: EtbEintrag) {}
}

// Frontend WebSocket Hook:
const useEtbRealtime = (einsatzId: string) => {
  // Socket.io connection
  // Auto-reconnect
  // Event handling
};

// Events:
- etb:entry:created
- etb:entry:updated
- etb:entry:deleted
- etb:status:changed
```

## Definition of Done
- [ ] WebSocket Gateway implementiert
- [ ] Frontend Socket.io Integration
- [ ] Reconnection getestet
- [ ] Fallback-Polling implementiert
- [ ] Load-Tests durchgeführt (100 Clients)
- [ ] Latenz < 500ms verifiziert

## Rollback Strategy
- [ ] WebSocket kann per Environment Variable deaktiviert werden
- [ ] Automatischer Fallback auf Polling wenn WebSocket nicht verfügbar
- [ ] Bestehende REST-API bleibt unverändert funktionsfähig
- [ ] Client erkennt fehlende WebSocket-Unterstützung automatisch
- [ ] Graceful degradation ohne Datenverlust

## Dependencies
- Story 1.3 (Backend Module)
- Story 1.5 (UI Components)

## Notes
- Socket.io für bessere Browser-Kompatibilität
- Namespace pro Einsatz für Isolation
- Rate-Limiting für Spam-Schutz
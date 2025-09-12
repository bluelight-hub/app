# Story 1.9: ETB-Status-Management und Sperrung

## Story Details
- **Story ID**: ETB-1.9
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 5
- **Sprint**: Phase 2

## User Story
**Als** Einsatzleiter  
**möchte ich** das ETB sperren können  
**damit** keine nachträglichen Änderungen möglich sind

## Acceptance Criteria
- [ ] Status-Workflow implementiert:
  - [ ] DRAFT → ACTIVE → LOCKED
  - [ ] Nur Vorwärts-Transitions erlaubt
- [ ] Nur Einsatzleiter kann sperren
- [ ] UI zeigt gesperrten Status deutlich
- [ ] Gesperrte ETBs sind read-only
- [ ] Sperrung mit Zeitstempel und User
- [ ] Audit-Log dokumentiert Statusänderungen
- [ ] Warning-Dialog vor Sperrung
- [ ] Keine Entsperrung möglich (rechtliche Anforderung)

## Technical Requirements
```typescript
// Status State Machine:
enum EtbStatus {
  DRAFT = "DRAFT",       // In Bearbeitung
  ACTIVE = "ACTIVE",     // Aktiv während Einsatz  
  LOCKED = "LOCKED"      // Gesperrt nach Einsatzende
}

// Backend Service:
async lockEtb(etbId: string, userId: string) {
  // Check permission (only EL)
  // Verify current status
  // Create final audit entry
  // Update status to LOCKED
  // Set lockedAt and lockedBy
  // Notify all clients via WebSocket
}

// Frontend Lock Component:
<EtbLockButton 
  onLock={handleLock}
  requireConfirmation={true}
/>
```

## Definition of Done
- [ ] Status-Transitions im Backend validiert
- [ ] Lock-Funktion nur für EL
- [ ] UI zeigt Lock-Status prominent
- [ ] Confirmation-Dialog implementiert
- [ ] Audit-Trail vollständig
- [ ] E2E Test für Lock-Workflow

## Dependencies
- Story 1.6 (Berechtigungen)
- Story 1.3 (Backend Module)

## Notes
- Rechtliche Anforderung: Unveränderbarkeit
- Nach Sperrung keine Änderungen mehr möglich
- Backup vor Sperrung empfohlen
- 10 Jahre Aufbewahrungspflicht
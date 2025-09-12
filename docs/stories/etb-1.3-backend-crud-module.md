# Story 1.3: Backend ETB-Modul mit CRUD-Operations

## Story Details
- **Story ID**: ETB-1.3
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 8
- **Sprint**: Phase 1

## User Story
**Als** Backend-System  
**möchte ich** ETB-Einträge verwalten  
**damit** die Grundfunktionalität bereitsteht

## Acceptance Criteria
- [ ] NestJS EtbModule implementiert
- [ ] CRUD-Endpoints funktionsfähig
  - [ ] POST /api/etb - ETB erstellen
  - [ ] GET /api/etb/:einsatzId - ETB abrufen
  - [ ] POST /api/etb/:id/eintraege - Eintrag hinzufügen
  - [ ] PUT /api/etb/eintraege/:id - Eintrag bearbeiten
  - [ ] DELETE /api/etb/eintraege/:id - Eintrag löschen (soft)
  - [ ] GET /api/etb/textbausteine - Textbausteine abrufen
- [ ] OpenAPI-Dokumentation vollständig
- [ ] Validierung mit DTOs
- [ ] Error-Handling implementiert
- [ ] Repository-Pattern verwendet

## Technical Requirements
```typescript
// Module-Struktur:
packages/backend/src/etb/
├── etb.module.ts
├── etb.controller.ts
├── etb.service.ts
├── etb.repository.ts
├── dto/
│   ├── create-etb.dto.ts
│   ├── create-eintrag.dto.ts
│   └── update-eintrag.dto.ts
└── entities/
```

## Definition of Done
- [ ] Alle Endpoints mit Swagger dokumentiert
- [ ] Unit Tests > 80% Coverage
- [ ] Integration Tests für alle Endpoints
- [ ] Postman Collection erstellt
- [ ] Performance unter 100ms für Reads

## Dependencies
- Story 1.2 (Prisma Schema)

## Notes
- ADR-005: CRUD-basierter Ansatz befolgen
- Versionierung bei Updates implementieren
- Sequenznummern automatisch vergeben
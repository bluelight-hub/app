# Story 1.6: Rollenbasierte Berechtigungen

## Story Details
- **Story ID**: ETB-1.6
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 5
- **Sprint**: Phase 2

## User Story
**Als** Gruppenführer  
**möchte ich** nur meine eigenen Einträge bearbeiten  
**damit** Verantwortlichkeiten klar sind

## Acceptance Criteria
- [ ] Berechtigungsmatrix implementiert:
  - [ ] **Einsatzleiter (EL)**: Vollzugriff auf alle Einträge
  - [ ] **Gruppenführer (GF)**: Eigene Einträge bearbeiten/löschen
  - [ ] **FüKW Personal**: Vollzugriff auf alle Einträge
  - [ ] **Einsatzkraft**: Kann Vorschläge einreichen (Draft-Status)
- [ ] Backend-Enforcement in Service-Layer
- [ ] Frontend zeigt Buttons nur bei Berechtigung
- [ ] Fehlermeldung bei unberechtigten Aktionen
- [ ] Audit-Log protokolliert alle Aktionen

## Technical Requirements
```typescript
// Backend Guards:
@UseGuards(JwtAuthGuard, EtbPermissionGuard)
@Roles(['EL', 'GF', 'FüKW'])

// Frontend Permission Check:
const canEdit = useEtbPermissions(entry, currentUser);

// Permission Matrix:
interface EtbPermissions {
  canCreate: boolean;
  canEdit: (entry: EtbEintrag) => boolean;
  canDelete: (entry: EtbEintrag) => boolean;
  canLock: boolean;
  canExport: boolean;
}
```

## Definition of Done
- [ ] Permission Guards im Backend
- [ ] Permission Hooks im Frontend
- [ ] Unit Tests für alle Rollen
- [ ] E2E Tests für Permission-Szenarien
- [ ] Dokumentation der Berechtigungsmatrix

## Dependencies
- Story 1.3 (Backend Module)
- Story 1.5 (UI Components)

## Notes
- Berechtigungen müssen im Backend enforced werden
- Frontend-Checks nur für UX, nicht für Security
- Spätere Erweiterung für Custom-Rollen möglich
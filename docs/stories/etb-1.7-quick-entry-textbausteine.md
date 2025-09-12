# Story 1.7: Quick-Entry mit Textbausteinen

## Story Details
- **Story ID**: ETB-1.7
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: MEDIUM
- **Story Points**: 5
- **Sprint**: Phase 2

## User Story
**Als** Einsatzkraft  
**möchte ich** häufige Ereignisse schnell dokumentieren  
**damit** die Dokumentation effizient erfolgt

## Acceptance Criteria
- [ ] Textbausteine nach Kategorie filterbar
- [ ] Suchfunktion für Textbausteine
- [ ] Ein Klick füllt Formular aus
- [ ] Keyboard-Shortcuts (1-9 für Top-Bausteine)
- [ ] Mobile-optimiert mit großen Touch-Targets
- [ ] Admin kann Textbausteine verwalten
- [ ] Häufig genutzte Bausteine oben
- [ ] Personalisierte Favoriten möglich

## Technical Requirements
```typescript
// Components:
packages/frontend/src/components/etb/
├── EtbQuickEntry.tsx
├── EtbTextbausteinList.tsx
├── EtbTextbausteinSearch.tsx
└── EtbTextbausteinAdmin.tsx

// Beispiel-Textbausteine:
- ALARMIERUNG: "Alarmierung durch Leitstelle erhalten"
- ANKUNFT: "An Einsatzstelle eingetroffen"
- LAGEMELDUNG: "Erste Lagemeldung an Leitstelle"
- MASSNAHME: "Brandbekämpfung mit C-Rohr begonnen"
- TRANSPORT: "Patient zum Transport vorbereitet"
```

## Definition of Done
- [ ] Textbausteine aus DB geladen
- [ ] Filterung funktioniert
- [ ] Keyboard-Shortcuts dokumentiert
- [ ] Touch-optimiert (min. 48x48px)
- [ ] Performance < 50ms für Auswahl
- [ ] Admin-Interface implementiert

## Dependencies
- Story 1.2 (Prisma Schema für Textbausteine)
- Story 1.5 (ETB Form)

## Notes
- Textbausteine sollen erweiterbar sein
- Kategorien-spezifische Vorschläge
- Später: KI-basierte Vorschläge möglich
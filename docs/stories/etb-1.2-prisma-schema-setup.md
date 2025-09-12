# Story 1.2: Prisma-Schema und Datenbank-Setup für ETB

## Story Details
- **Story ID**: ETB-1.2
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 3
- **Sprint**: Phase 1

## User Story
**Als** Entwickler  
**möchte ich** die Datenbank-Struktur für ETB einrichten  
**damit** Einsatztagebuch-Daten persistent gespeichert werden

## Acceptance Criteria
- [ ] Prisma-Schema mit ETB-Models definiert (siehe PRD Zeilen 131-221)
- [ ] Migration erfolgreich angewendet
- [ ] Seed-Daten für Entwicklung erstellt
- [ ] Indizes für Performance optimiert
- [ ] Relations zu User und Einsatz korrekt
- [ ] Enums für Kategorien und Status implementiert

## Technical Requirements
```prisma
// Hauptmodelle:
- Einsatztagebuch (1:1 mit Einsatz)
- EtbEintrag (n:1 mit Einsatztagebuch)
- EtbEintragHistorie (n:1 mit EtbEintrag)
- EtbTextbaustein (standalone)
```

## Definition of Done
- [ ] Schema in `prisma/schema.prisma` erweitert
- [ ] Migration mit `pnpm prisma migrate dev` erstellt
- [ ] **Rollback-Migration erstellt und getestet**
- [ ] Seed-Script erweitert
- [ ] Datenbank-Tests laufen durch
- [ ] Performance-Indizes verifiziert

## Rollback Strategy
- [ ] Down-Migration vorbereitet mit `prisma migrate reset`
- [ ] Backup der Produktionsdatenbank vor Migration
- [ ] Rollback-Skript dokumentiert in `docs/rollback/etb-1.2.md`
- [ ] Testlauf der Rollback-Prozedur in Staging-Umgebung

## Dependencies
- Bestehende User und Einsatz Modelle

## Notes
- Versionierung für Audit-Trail beachten
- Soft-Delete Pattern verwenden
- 10 Jahre Aufbewahrungspflicht berücksichtigen
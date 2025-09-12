# Story 1.11: Export-Funktionalität

## Story Details
- **Story ID**: ETB-1.11
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: MEDIUM
- **Story Points**: 8
- **Sprint**: Phase 3

## User Story
**Als** Verwaltung  
**möchte ich** ETB-Daten exportieren  
**damit** ich Berichte erstellen kann

## Acceptance Criteria
- [ ] Export-Dialog mit Format-Auswahl
- [ ] PDF-Export mit professionellem Layout
  - [ ] Kopfzeile mit Einsatzdaten
  - [ ] Chronologische Einträge
  - [ ] Seitennummerierung
  - [ ] Wasserzeichen "Original"
- [ ] CSV-Export für Datenanalyse
  - [ ] Alle Felder als Spalten
  - [ ] UTF-8 Encoding
  - [ ] Semikolon-getrennt (Excel-kompatibel)
- [ ] Word-Export (.docx) für Nachbearbeitung
- [ ] Zeitraum-Filter (von/bis)
- [ ] Kategorie-Filter
- [ ] Vorschau vor Export
- [ ] Download startet automatisch

## Technical Requirements

### Spike Task: Export Library Evaluation (vor Implementation)
- [ ] Evaluiere PDF-Generation Libraries:
  - [ ] @react-pdf/renderer (client-side, lightweight)
  - [ ] puppeteer (server-side, full browser rendering)
  - [ ] pdfkit (server-side, programmatic)
  - Entscheidungskriterien: Performance, Dateigröße, Features, Rechtssicherheit
- [ ] Teste docx Library für Word-Export
- [ ] Verifiziere csv-stringify für Excel-Kompatibilität
- [ ] Dokumentiere Entscheidung in ADR

```typescript
// Backend Export Service:
packages/backend/src/etb/services/
├── etb-export.service.ts
├── pdf-generator.service.ts
├── csv-generator.service.ts
└── docx-generator.service.ts

// Libraries (nach Evaluation):
- PDF: [TBD nach Spike]
- CSV: csv-stringify
- DOCX: docx

// Export Endpoint:
@Get('etb/:id/export')
@Query() filters: ExportFiltersDto
async exportEtb(
  @Param('id') id: string,
  @Query('format') format: 'pdf' | 'csv' | 'docx'
)

// Frontend Export Dialog:
<EtbExportDialog
  etbId={etbId}
  onExport={handleExport}
/>
```

## Definition of Done
- [ ] Alle 3 Export-Formate funktionieren
- [ ] Filter anwendbar
- [ ] Vorschau implementiert
- [ ] Download funktioniert
- [ ] Große ETBs exportierbar (> 500 Einträge)
- [ ] Export-Audit-Log Eintrag

## Dependencies
- Story 1.3 (Backend Module)
- Story 1.5 (UI Components)

## Notes
- PDF muss rechtssicher sein (unveränderbar)
- Behörden-konforme Formatierung
- Später: Digitale Signatur möglich
- Performance: Stream für große Exporte
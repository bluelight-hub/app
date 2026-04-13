# Zeichen-Detail-Panel — Design Spec

## Kontext

Die Lagekarte zeigt taktische Zeichen als Symbol-Layer auf der Karte. Beim Klick auf Layer-Elemente (DWD-Warnungen, NINA-Meldungen) öffnet sich ein Detail-Panel via Provider-System. Taktische Zeichen haben bisher kein vergleichbares Detail-Panel. Dieses Feature ergänzt ein Detail-Panel für Zeichen — inline editierbar (Label, Notiz), visuell konsistent mit den bestehenden Layer-Detail-Panels.

## Integrationsansatz

**Eigenes Panel, kein Detail-Provider.** Das bestehende Provider-System (`LayerDetailProvider`) ist für read-only, koordinaten-basierte Abfragen konzipiert. Zeichen unterscheiden sich:

- Das konkrete Zeichen ist durch `onZeichenClick` bereits bekannt (kein Coordinate-Query nötig)
- Das Panel muss editierbar sein (Label, Notiz)
- Mutations (Update, Remove) erfordern Zugriff auf den vollen Zeichen-DTO

Stattdessen: `Dialog.SlideIn` direkt, gesteuert über State im `drawStore`. Visuell identisch mit den Layer-Detail-Panels (gleiche CSS-Klassen, Sektions-Struktur, Icon-Patterns).

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `lagekarte/ui/molecules/ZeichenDetailPanel.molecule.tsx` | Wrapper: `Dialog.SlideIn` + Datenladung |
| `lagekarte/ui/molecules/ZeichenDetailContent.tsx` | Die 6 Sektionen (Vorschau, Label/Notiz, Komposition, Position, Metadaten, Aktionen) |

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `lagekarte/stores/draw.store.ts` | Neues Feld `selectedZeichenId: string \| null`, Actions `openZeichenDetail(id)` / `closeZeichenDetail()` |
| `lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx` | `<ZeichenDetailPanel>` einbinden, `onZeichenClick` an `openZeichenDetail` verdrahten |

## Datenfluss

```
Klick auf Zeichen (Karte)
  → TaktischeZeichenLayer.onZeichenClick(zeichen)
  → drawStore.openZeichenDetail(zeichen.id)
  → LagekarteView rendert <ZeichenDetailPanel zeichenId={selectedZeichenId} />
  → Panel findet Zeichen in useEinsatzZeichen()-Cache
  → Anzeige der 6 Sektionen

Label/Notiz bearbeiten:
  → Input onChange → Debounce (500ms) → useUpdateZeichen() Mutation
  → Optimistic Update im Query-Cache
  → Invalidate useEinsatzZeichen()

"Von Karte entfernen":
  → useRemoveZeichen() Mutation (setzt istPlatziert=false, lat/lng=null)
  → drawStore.closeZeichenDetail()
  → Zeichen verschwindet von der Karte
```

## Panel-Sektionen

### 1. Zeichen-Vorschau (read-only)

- Gerendertes SVG des taktischen Zeichens (via `zeichen-image-cache` / `phjardas-adapter`)
- Label als Titel darunter (`text-base font-semibold`)
- Subtitle mit Kompositions-Zusammenfassung (`text-xs text-text-muted`)

### 2. Label & Notiz (editierbar)

- Sektions-Header: Stift-Icon + "LABEL & NOTIZ" (wie DWD/NINA-Sektions-Pattern)
- Label: Text-Input mit bestehendem Wert, Debounce-Auto-Save
- Notiz: Textarea, gleicher Auto-Save-Mechanismus
- Kein expliziter Save-Button — Änderungen speichern automatisch nach 500ms Inaktivität

### 3. Zeichen-Komposition (read-only)

- Sektions-Header: Puzzle-Icon + "ZEICHEN-KOMPOSITION"
- Pill-Badges für jedes gesetzte Feld: Grundzeichen, Organisation, Fachaufgabe, Einheit, Verwaltungsstufe
- Nur gesetzte Felder anzeigen (keine leeren Badges)
- Badge-Style: `rounded-full border border-border-subtle bg-surface-raised px-2.5 py-0.5 text-body-xs`

### 4. Position (read-only)

- Sektions-Header: Pin-Icon + "POSITION"
- Grid 2-Spaltig: Lat / Lng
- Darunter: MGRS (falls vorhanden), monospace Font

### 5. Metadaten (read-only)

- Sektions-Header: Uhr-Icon + "METADATEN"
- Kompakte Darstellung: "Erstellt von {name} · {datum}" / "Geändert · {datum}"
- `text-xs text-text-muted`

### 6. Aktionen

- "Von Karte entfernen" — Danger-Button (`intent="danger"`)
- Entfernt das Zeichen von der Karte (setzt `istPlatziert=false`), löscht es aber nicht
- Schließt das Panel nach Ausführung

## State-Erweiterung (draw.store.ts)

```typescript
// Neues Feld im State
selectedZeichenId: string | null;

// Neue Actions
openZeichenDetail(zeichenId: string): void;
closeZeichenDetail(): void;
```

`openZeichenDetail` setzt `selectedZeichenId` und schließt ggf. andere offene Panels (KartenZeichenSidebar). `closeZeichenDetail` setzt `selectedZeichenId` zurück auf `null`.

## Visueller Stil

Konsistent mit DWD/NINA-Panel-Content:

- Sektions-Header: `text-[10px] font-semibold tracking-wider text-text-muted uppercase` mit Icon `h-3.5 w-3.5 text-text-muted`
- Sektions-Trenner: `border-t border-border-subtle pt-3`
- Container: `space-y-3.5`
- Icons: Phosphor Icons (`react-icons/pi`)
- Panel-Container: `Dialog.SlideIn` mit `size="md"`

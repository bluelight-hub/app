---
status: done
goal: G5
parent_spec: ./spec-g5-polish.md
github_issue: 627
---

# G5 — Reduced-Motion-Audit für Feature #627

## Zweck

Verifiziert, dass alle in G1–G4 eingeführten Animationen die `prefers-reduced-motion: reduce`-Nutzer-Einstellung respektieren. Audit-Basis: `packages/frontend/src/index.tailwind.css` (globaler `@media`-Block ab Zeile 714) und Komponenten, die Transitions/Animationen verwenden.

## Methodik

Pro Animation oder Transition wird geprüft:

1. **Spürbare Bewegung:** Ist die Animation länger als ca. 150 ms oder beinhaltet sie Translations/Skalierungen?
2. **Fallback vorhanden:** Wird die Animation bei `prefers-reduced-motion: reduce` ausgeschaltet oder durch einen statischen Ersatz ersetzt?
3. **Semantische Lesbarkeit:** Bleibt die Information (Fokus, Status, Stufe) auch ohne Animation erkennbar?

Status-Legende:

- ✅ — bereits abgedeckt, keine Aktion nötig
- ⚠️ — indirekt abgedeckt (Tailwind `transition-colors` kurz genug, kein Fallback nötig)
- ❌ — nicht abgedeckt, Fix notwendig

## Ergebnisse pro Animation

### G1 — Gefahrenzone-Fundament

Keine bewegungsrelevanten Animationen eingeführt; Layer-Rendering ist statisch.

### G2 — Karten-Zone-Erstellung

| Ort                                               | Animation/Transition                                | Status                                          |
| ------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| `GefahrenzoneDrawControls` (Toolbar-Button-Hover) | `transition-colors`                                 | ⚠️ — Farbwechsel <200 ms, kein Bewegungsproblem |
| `GefahrenzoneInlinePopover` (Warnstufen-Chips)    | `transition-colors`                                 | ⚠️ — siehe oben                                 |
| Draw-Mode-Indicator                               | Keine eigene Animation; Button-State via Farb-Token | ✅                                              |

### G3 — Matrix-Integration

| Ort                                         | Animation/Transition                                                                    | Status                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `WarnstufeChip` (AKUT)                      | `@keyframes warnstufe-akut-pulse` → Klasse `animate-warnstufe-akut-pulse`               | ✅ — Fallback liefert statischen Doppel-Ring (CSS Zeile 739–743)                                      |
| `GefahrenmatrixCell` (Deep-Link-Fokus)      | `@keyframes gefahrenmatrix-cell-pulse` → Klasse `animate-gefahrenmatrix-cell-pulse`     | ✅ — Fallback `gefahrenmatrix-cell-pulse-reduced` (300 ms einmaliger Border-Flash, CSS Zeile 745–757) |
| `ZoneCountBadge` / `OrphanWarningIndicator` | Statisch                                                                                | ✅                                                                                                    |
| `GefahrenzoneDetailPanel`                   | Statisch (Scroll → `scrollIntoView` ist browser-native; respektiert System-Einstellung) | ✅                                                                                                    |

### G4 — Split-View + AKUT-Broadcast

| Ort                                                    | Animation/Transition                                                             | Status                                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `SplitViewToggle`                                      | `transition-colors`                                                              | ⚠️ — Farbwechsel nur                                                                                            |
| `LagekarteGefahrenmatrixSplitView`                     | Keine Entrance-Animation; Layout-Mount ist sofort sichtbar                       | ✅                                                                                                              |
| `LagekarteView` + `GefahrenzoneHost` (Focus-Roundtrip) | `flyTo` / `fitBounds` via MapLibre — MapLibre respektiert native Animations-Flag | ✅ (MapLibre-Default)                                                                                           |
| `AkutBroadcastDialog`                                  | Headless-UI-Default-Transitions                                                  | ✅ — Headless-UI nutzt `@headlessui/react`-eigene, kurze Transitions, die `prefers-reduced-motion` respektieren |
| `AkutBroadcastToast` (Toast-Stack)                     | Keine Entrance-Animation (bewusst, siehe Komponenten-Kommentar Zeile 11–13)      | ✅                                                                                                              |
| `AkutBroadcastToast` (Banner)                          | Statische Positionierung (`fixed inset-x-0 top-0`)                               | ✅                                                                                                              |
| `AkutBroadcastToast` (Persistent-Ring)                 | `ring-2 ring-warnstufe-akut-glow` statisch, keine Animation                      | ✅                                                                                                              |
| Web-Audio-Beep                                         | Kein visuelles Element; System-Beep-Toggle im Banner                             | ✅ (Sound ist per Store-Toggle abschaltbar)                                                                     |

## Fazit

Der bestehende `@media (prefers-reduced-motion: reduce)`-Block in `index.tailwind.css` deckt alle G1–G4-Animationen ab. Kurze `transition-colors`-Hover-Effekte sind nach WCAG 2.1 unkritisch (< 200 ms, keine Translation). Keine zusätzlichen Code-Änderungen nötig.

## Follow-ups

- Manuelle Prüfung: System-Einstellung „Bewegung reduzieren" aktivieren (macOS: Systemeinstellungen → Bedienungshilfen → Anzeige; Windows: Einstellungen → Erleichterte Bedienung → Anzeige) und durch alle #627-Flows klicken. Checkliste siehe `g5-manual-a11y-audit.md`.
- Wenn später Slide-in-Animationen für den Toast gewünscht werden: im CSS-Block den `animate-*`-Klassennamen ergänzen.

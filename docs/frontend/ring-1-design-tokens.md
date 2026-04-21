# Ring-1 Design-Tokens

## Zweck

Story `1.1` etabliert einen verbindlichen Ring-1-Vertrag für Einstieg und Workspace-Shell. Der Vertrag lebt technisch in [`packages/frontend/src/index.tailwind.css`](../../packages/frontend/src/index.tailwind.css) und wird über Tailwind-4-`@theme inline` in Utility-Klassen übersetzt.

Zielbild:

- dieselbe visuelle Sprache für Einstieg und Shell
- klare Informationshierarchie in Light Mode und Dark Mode
- sichtbare Fokusführung
- Statuskommunikation nicht nur über Farbe
- kompakte, operative Density statt luftiger Marketing-Optik

## Typografie

### Font-Tokens

| Token | Wert | Zweck |
| --- | --- | --- |
| `--font-sans` | `Inter Variable`, UI-Sans-Fallbacks | Standard-Schrift für UI, Formulare und Shell |
| `--font-mono` | SF Mono / UI-Mono-Fallbacks | Nummern, technische Kennungen, systemnahe Werte |

### Entscheidung

`Geist`/`Geist Mono` wurde in Story `1.1` nicht eingeführt. Stattdessen nutzt Ring 1 einen neutralen Sans-/Mono-Vertrag. Dadurch bleibt der Bootstrap zentral, ohne eine zweite Font-Logik aufzubauen.

### Typografie-Skalen

| Klasse | Einsatz |
| --- | --- |
| `text-body-xs` | Hilfstexte, Metadaten, Labels mit geringer Gewichtung |
| `text-body-sm` | Sekundärtexte, erklärende Beschriftungen |
| `text-body-md` | Standard-Fließtext |
| `text-title-sm` | kompakte Bereichsüberschriften |
| `text-title-md` | Shell- und Paneltitel |
| `text-title-lg` | Einstiegs-Headline, große Oberflächenanker |

## Farb- und Surface-Tokens

### Kernflächen

| Token | Light | Dark | Zweck |
| --- | --- | --- | --- |
| `surface-canvas` | `#f3f7fb` | `#08111f` | Seitenhintergrund |
| `surface-panel` | `#ffffff` | `#111c2d` | Panels, Header, Navigation |
| `surface-raised` | `#e8eef6` | `#162336` | Skeletons, sekundäre Container |
| `surface-elevated` | Alias auf `surface-raised` | Alias auf `surface-raised` | kompatibler Ring-1-Token für erhöhte Flächen |
| `surface-overlay` | `rgba(255,255,255,0.78)` | `rgba(17,28,45,0.82)` | translucente Overlays |
| `surface-inverse` | `#10223d` | `#eff4fa` | inverse Flächen bei Bedarf |

### Text und Trennlinien

| Token | Light | Dark | Zweck |
| --- | --- | --- | --- |
| `text-primary` | `#10223d` | `#eff4fa` | Haupttext |
| `text-secondary` | `#54667d` | `#b3c0d3` | Sekundärtext |
| `text-muted` | `#70829b` | `#8b9bb2` | technische Metadaten |
| `text-inverse` | `#f3f7fb` | `#08111f` | Text auf starken Aktionsflächen |
| `border-subtle` | `#d7e1ed` | `#26364c` | Standard-Trennlinien |
| `border-strong` | `#b0bfd2` | `#38506f` | stärkere visuelle Trennung |

### Aktionsfarben

| Token | Light | Dark | Zweck |
| --- | --- | --- | --- |
| `action-primary` | `#255aa9` | `#5e94f5` | Primäraktionen |
| `action-primary-hover` | `#1f4d92` | `#77a3f5` | Hover-Status Primäraktion |
| `action-primary-pressed` | `#183d74` | `#4079da` | aktive Primäraktion |
| `action-secondary` | `#e9f0f7` | `#16273d` | sekundäre aktive Fläche |
| `action-secondary-hover` | `#dfe8f1` | `#1a314d` | Hover auf neutralen Flächen |
| `action-secondary-pressed` | `#d1dce8` | `#214061` | aktiver neutraler Zustand |

### Abgeleitete Feedback- und Ambient-Tokens

| Token | Light | Dark | Zweck |
| --- | --- | --- | --- |
| `selection-surface` | `rgba(94,148,245,0.28)` | `rgba(127,176,255,0.28)` | Textselektion |
| `highlight-surface` | `rgba(94,148,245,0.15)` | `rgba(127,176,255,0.18)` | dezente Echtzeit-Hervorhebung |
| `auth-ambient` | radialer Blau-Ambient-Verlauf | radialer Blau-Ambient-Verlauf | Einstiegs-Hintergrund statt historischer Bild-/Gradient-Kopplung |
| `auth-top-glow` | linearer Top-Glow | linearer Top-Glow | oberer Einstiegs-Lichtsaum |
| `alarm-glow-*` | danger-basierte Schattenwerte | danger-basierte Schattenwerte | Alarm-Feedback und Reduced-Motion-Fallbacks |

## Statussemantik

Status wird immer aus mindestens zwei Signalen aufgebaut:

- farbliche Fläche oder Akzent
- lesbarer Text oder Icon

| Status | Surface | Border | Text |
| --- | --- | --- | --- |
| Info | `status-info-surface` | `status-info-border` | `status-info-text` |
| Erfolg | `status-success-surface` | `status-success-border` | `status-success-text` |
| Warnung | `status-warning-surface` | `status-warning-border` | `status-warning-text` |
| Kritisch | `status-danger-surface` | `status-danger-border` | `status-danger-text` |

Beispiele:

- Warn-/Gefahr-Prompts nutzen Icon plus Text, nicht nur Rot.
- Badge-/Chip-Zustände tragen Text oder numerische Marker zusätzlich zur Farbe.

## Fokusführung

| Token | Zweck |
| --- | --- |
| `focus-ring` | sichtbarer Fokusrahmen auf interaktiven Elementen |
| `focus-ring-offset` | Gegenfläche für den Fokuskontrast |
| `shadow-focus` | verstärkter Fokuszustand für Buttons und interaktive Controls |
| `shadow-focus-ring` | Alias für den gemeinsamen Ring-1-Fokuszustand in Utilities |

Regel:

- Fokus muss auf Light- und Dark-Flächen gleich klar erkennbar sein.
- Primäraktionen und Shell-Navigation verwenden dieselbe Fokuslogik.

## Spacing, Radius, Density

### Spacing-Tokens

| Token | Wert | Zweck |
| --- | --- | --- |
| `spacing-cluster` | `0.5rem` | enge Abstände innerhalb kleiner Gruppen |
| `spacing-panel` | `1rem` | Innenabstand von Cards und Panels |
| `spacing-shell` | `1.25rem` | größere Shell-Abstände |
| `spacing-control-x` | `0.75rem` | horizontales Control-Padding |
| `spacing-control-y` | `0.5rem` | vertikales Control-Padding |

### Density-Unterstufen

| Token | Wert | Einsatz |
| --- | --- | --- |
| `spacing-density-0` | `0.25rem` | feinste Unterstufe, Mikroabstände |
| `spacing-density-1` | `0.375rem` | kompakte Control-Abstände |
| `spacing-density-2` | `0.5rem` | Standard-Cluster |
| `spacing-density-3` | `0.75rem` | mittlere Innenabstände |
| `spacing-density-4` | `1rem` | Panel-Innenabstand |

### Radius- und Shadow-Tokens

| Token | Wert | Zweck |
| --- | --- | --- |
| `radius-control` | `0.375rem` | Buttons, Links, kleine Controls |
| `radius-panel` | `0.5rem` | Panels, Layout-Container |
| `radius-pill` | `9999px` | Chips, Status-Pills |
| `shadow-panel` | weicher tiefer Panel-Schatten | Layout- und Content-Container |
| `shadow-raised` | kompakter Shadow | Header, Navigation, aktive Controls |
| `shadow-button-primary` | verstärkter Primäraktions-Schatten | Primärbuttons und dominante CTA-Flächen |

### Density-Regeln

- Ring 1 folgt einem 4px-Raster (Basis `0.25rem`), das sich über Density-Unterstufen bis `1rem` staffelt.
- `spacing-cluster` (`0.5rem`) für kurze, dichte Gruppen.
- `spacing-panel` (`1rem`) für Standard-Container.
- `spacing-shell` (`1.25rem`) nur für größere Shell-Atemräume, nicht für jede Card.

## Warnstufen-Tokens (Issue #627)

Warnstufen sind ein operativer Kernzustand (Gefahrenmatrix → Karte). Tokens gibt es pro Stufe in vier Slots: `-fill` (Map-Füllung), `-stroke` (Map-Kontur), `-text` (UI-Kontrast) und — nur für die Stufe `akut` — `-glow` (Aufmerksamkeits-Signal).

| Stufe   | Fill (Light / Dark)                                    | Stroke (Light / Dark) | Text (Light / Dark) |
| ------- | ------------------------------------------------------ | --------------------- | ------------------- |
| keine   | `rgba(144,160,184,.15)` / `rgba(160,180,200,.2)`       | `#90a0b8` / `#b0bfd0` | `#54667d` / `#c4d0e0` |
| niedrig | `rgba(62,116,204,.22)` / `rgba(110,160,230,.3)`        | `#3e74cc` / `#6ea0e6` | `#1f4d92` / `#a8c4ea` |
| mittel  | `rgba(209,138,0,.35)` / `rgba(240,180,60,.4)`          | `#d18a00` / `#f0b43c` | `#7a4a00` / `#f0d090` |
| hoch    | `rgba(208,100,24,.45)` / `rgba(240,140,60,.5)`         | `#d06418` / `#f08c3c` | `#8a3a00` / `#f0b890` |
| akut    | `rgba(176,32,32,.55)` / `rgba(220,70,70,.6)`           | `#b02020` / `#dc4646` | `#7a0000` / `#f0b0b0` |

Zusatzsignal `akut`: `--ring-1-color-warnstufe-akut-glow` (Light `rgba(224,64,64,.55)` / Dark `rgba(255,90,90,.7)`) speist die Ring-Pulse-Animation `animate-warnstufe-akut-pulse`. Reduced-Motion-Variante ersetzt den Puls durch einen statischen Doppel-Ring aus Stroke + Glow.

**Dreifach-Signal-Regel:** Warnstufe wird an der UI **nie nur über Farbe** kommuniziert — immer Kombination aus Fill/Stroke, Text-Label und (bei `akut`) Motion/Ring. Die Tokens sind Pflicht-Eintrittstor, Komponenten wie `WarnstufeChip` oder die Map-Layer greifen ausschließlich auf sie zu.

## Motion-Tokens

`index.tailwind.css` definiert operative Animations-Primitiven, die alle `prefers-reduced-motion: reduce`-Fallbacks haben:

| Klasse                         | Einsatz                                                  | Reduced-Motion-Ersatz                 |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------- |
| `animate-card-entry`           | Card/Panel-Eintritt                                       | statisch (opacity 1, kein Transform)  |
| `animate-pulse-fast`           | Alarm Stufe 1                                             | deckend + `shadow-alarm-glow-reduced` |
| `animate-pulse-urgent`         | Alarm Stufe 2 (60 s ohne Reaktion)                        | deckend + `shadow-alarm-urgent-reduced` |
| `animate-pulse-audio-failed`   | Audio-Ausfall (0,5 s)                                     | deckend + `shadow-alarm-audio-failed-reduced` |
| `animate-border-glow(-urgent)` | Alarm-Rand                                                | statischer Shadow                     |
| `animate-highlight-new/updated`| ETB-/Live-Updates (grün/amber)                            | deaktiviert                           |
| `animate-warnstufe-akut-pulse` | Gefahrenzone AKUT                                         | statischer Doppel-Ring                |
| `animate-gefahrenmatrix-cell-pulse` | Deep-Link-Fokus auf Matrix-Zelle                      | einmaliger 300-ms-Border-Flash        |
| `animate-floating-pill-entrance/exit` | FloatingPill Ein-/Ausblendung                      | statisch                              |

Regel: Neue Motion wird **nur** über `index.tailwind.css` ergänzt, nie lokal pro Komponente. Jede neue Animation braucht einen Reduced-Motion-Fallback im selben Block.

## Anwendungsbeispiele

### Einstieg

`AuthLayout` nutzt:

- `bg-surface-canvas` als Grundfläche
- `ring-1-auth-ambient` für den tokenisierten Ambient-Hintergrund
- `ring-1-auth-top-glow` für den oberen tokenisierten Lichtsaum
- `bg-surface-panel` für die seitliche Einführungsfläche
- `ColorModeButton` auf `surface`-/`border`-Tokens

### Workspace-Shell

`SingleEinsatzLayout` nutzt:

- `bg-surface-canvas` für die Shell-Gesamtfläche
- `bg-surface-panel` für Header, Navigation und mobile Sub-Navigation
- `bg-action-secondary` für aktive Navigationszustände
- `text-text-primary` und `text-text-secondary` für Titel bzw. Metadaten

## Guardrails für Folge-Stories

- Neue Ring-2-Komponenten bauen auf diesen Tokens auf, statt neue Farb- oder Radiuswerte einzuführen.
- Bestehende `shared/ui`-Primitives bleiben die zentrale Oberfläche; keine zweite Designsystem-Schicht.
- Falls später `Geist` eingeführt wird, muss die Umstellung ausschließlich über die zentralen Font-Tokens erfolgen.

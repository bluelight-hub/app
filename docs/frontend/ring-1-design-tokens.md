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
| `spacing-cluster` | `0.75rem` | enge Abstände innerhalb kleiner Gruppen |
| `spacing-panel` | `1.5rem` | Innenabstand von Cards und Panels |
| `spacing-shell` | `2rem` | größere Shell-Abstände |
| `spacing-control-x` | `1rem` | horizontales Control-Padding |
| `spacing-control-y` | `0.625rem` | vertikales Control-Padding |

### Density-Unterstufen

| Token | Wert | Einsatz |
| --- | --- | --- |
| `spacing-density-0` | `0.25rem` | feinste Unterstufe, Mikroabstände |
| `spacing-density-1` | `0.5rem` | kompakte Control-Abstände |
| `spacing-density-2` | `0.75rem` | Standard-Cluster |
| `spacing-density-3` | `1rem` | mittlere Innenabstände |
| `spacing-density-4` | `1.5rem` | Panel-Innenabstand |

### Radius- und Shadow-Tokens

| Token | Wert | Zweck |
| --- | --- | --- |
| `radius-control` | `0.875rem` | Buttons, Links, kleine Controls |
| `radius-panel` | `1.25rem` | Panels, Layout-Container |
| `radius-pill` | `9999px` | Chips, Status-Pills |
| `shadow-panel` | weicher tiefer Panel-Schatten | Layout- und Content-Container |
| `shadow-raised` | kompakter Shadow | Header, Navigation, aktive Controls |
| `shadow-button-primary` | verstärkter Primäraktions-Schatten | Primärbuttons und dominante CTA-Flächen |

### Density-Regeln

- Ring 1 folgt einem 8px-System mit 4px-Unterstufen.
- `spacing-cluster` für kurze, dichte Gruppen.
- `spacing-panel` für Standard-Container.
- `spacing-shell` nur für große Shell-Atemräume und nicht für jede Card.

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

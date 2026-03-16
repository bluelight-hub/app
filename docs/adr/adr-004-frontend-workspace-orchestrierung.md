# ADR-004: Frontend-Workspace-Orchestrierung als eigene Feature-Schicht

## Status

Akzeptiert (2026-03-15)

## Kontext

Der aktive Einsatz-Workspace wurde bisher weitgehend in `SingleEinsatzLayout.tsx` orchestriert. Dadurch lagen Shell-Chrome, Modulnavigation, Statuszonen, Overlay-Anbindung und fachnahe Zustände eng vermischt in einer Datei.

Für die Ring-2-Weiterentwicklung braucht das Frontend einen stabilen, wiederverwendbaren Vertrag zwischen fachneutraler UI und produktnaher Shell-Orchestrierung. Gleichzeitig gelten im Projekt klare Architekturgrenzen:

- `routes -> features -> shared`
- `shared/ui` enthält nur fachneutrale sichtbare Primitives
- produktnahe Shell-Komposition gehört nicht in `shared/ui`
- es darf keine zweite sichtbare UI-Schicht neben `shared/ui` entstehen

Ohne diese Trennung würden Folge-Stories erneut Shell-Verhalten in Fachflächen oder Route-Dateien verteilen und damit den Ring-2-Rahmen wieder aufweichen.

## Entscheidung

Wir führen für den Frontend-Workspace eine explizite Orchestrierungsschicht unter `packages/frontend/src/features/workspace/` ein.

### Struktur

- `features/workspace` enthält den typisierten Workspace-Contract, die Modul-Registry, Shell-Hooks und die produktnahe Komposition `WorkspaceShell`.
- `shared/ui/organisms/workspace` enthält fachneutrale sichtbare Primitives wie `WorkspaceContextBar` und `StatusRail`.
- Route-Dateien bleiben dünn und verantworten nur URL-Vertrag, Guarding und Einstieg.
- Bestehende Shell-Anker wie `SingleEinsatzLayout` dürfen das Workspace-System konsumieren, aber nicht erneut zum Monolithen für neue Ring-2-Struktur werden.

### Vertragsregeln

- Modulnavigation wird über eine typisierte Registry modelliert statt über lose Inline-Definitionen.
- Der Contract enthält mindestens Route-Ziel, sichtbare Bezeichnung, Beschreibung, Icon, Shortcut-Metadaten, Badge-Hinweise sowie vorbereitete Sichtbarkeits- und Prioritätsfelder.
- Workspace-nahe Status- und Overlay-Anbindung werden über dieselbe Shell-Struktur geführt.
- Fachneutrale Primitives landen zuerst in `shared/ui`; produktnahe Verdrahtung bleibt in `features/workspace`.

## Konsequenzen

### Positiv

- Folge-Stories erhalten einen stabilen Einstiegspunkt für Ring-2-Flächen ohne neue Shell-Sonderwege.
- `SingleEinsatzLayout` kann schrittweise entdichtet werden, ohne bestehendes Verhalten zu verlieren.
- Shortcut-, Badge-, Status- und Navigationsmetadaten sind an einer Stelle typisiert und testbar.
- `shared/ui` bleibt die einzige generische sichtbare UI-Schicht.

### Negativ

- Die Einführung einer zusätzlichen Feature-Schicht erhöht zunächst die Anzahl der Dateien und Barrel-Exports.
- Bestehende Shell-Bausteine müssen übergangsweise zwischen altem Layout und neuem Workspace-Vertrag zusammengeführt werden.
- Nicht jede bestehende Overlay- oder Statusfläche wird sofort zu einem vollständig generischen Primitive; die Migration erfolgt inkrementell.

## Alternativen

### 1. `SingleEinsatzLayout` als zentralen Shell-Monolithen beibehalten

Abgelehnt, weil Navigation, Status, Overlays und Fachlogik weiter in derselben Datei wachsen würden und Folge-Stories keinen sauberen Workspace-Vertrag hätten.

### 2. Alle neuen Workspace-Bausteine direkt in `shared/ui` ablegen

Abgelehnt, weil Registry, Shortcut-Logik, aktive Modulauswahl und Shell-Orchestrierung produktnah sind und damit die Grenze von `shared/ui` verletzen würden.

### 3. Eine zweite generische UI-Schicht einführen

Abgelehnt, weil das Projekt `shared/ui` bereits als einzige sichtbare generische UI-Oberfläche festlegt und Parallelstrukturen zu Inkonsistenz führen würden.

## Referenzen

- [AGENTS.md](../../AGENTS.md)
- [Workspace-Fundament für Ring 2](../frontend/workspace-fundament-ring-2.md)
- [SingleEinsatzLayout](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/shared/ui/templates/SingleEinsatzLayout.tsx)
- [WorkspaceShell](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/features/workspace/ui/WorkspaceShell.tsx)

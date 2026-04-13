# Taktische Zeichen & POI-System (DV 102)

**Issue:** #636
**Datum:** 2026-04-10
**Status:** Design genehmigt

## Zusammenfassung

Vollständiges taktisches Zeichensystem nach DV 102 für Bluelight Hub. Taktische Zeichen können Fahrzeugen, Einheiten und Rollen zugewiesen und auf der Lagekarte platziert werden. Das System nutzt die Open-Source-Bibliothek `phjardas/taktische-zeichen` als Rendering-Engine hinter einer eigenen Abstraktionsschicht.

## Entscheidungsmatrix

| Aspekt | Entscheidung |
|--------|-------------|
| Zuordnung zu Entitäten | Default-Zeichen pro Typ + Override pro Instanz |
| Baukasten-Tiefe | Geführter Baukasten (Kategorie → System setzt zusammen → Override möglich) |
| SVG-Rendering | Hybrid: Frontend-Compositing + strukturierte Definition im Backend |
| Karte-Brücke | Manuelle Platzierung aus Seitenleiste (kein Auto-Place) |
| Datenpersistenz | Eigene Entität `TaktischesZeichen` (nicht POI, nicht Lagekarte-State) |
| Zeichenkatalog | Backend-Seed-Daten (~50-80 Einträge), erweiterbar |
| Rendering-Engine | `phjardas/taktische-zeichen` (MIT) + dünne Abstraktionsschicht |
| Architektur | Zeichen-zentrisch (flaches Domain-Modell) |

## Domain-Modell

### ZeichenDefinition (Value Object)

Beschreibt *was* ein taktisches Zeichen darstellt. Wird als JSON in der Datenbank gespeichert. Die Felder mappen 1:1 auf die API von `phjardas/taktische-zeichen`.

```typescript
interface ZeichenDefinition {
  grundzeichen: string;        // z.B. "kraftfahrzeug-gelaendegaengig"
  organisation?: string;       // z.B. "feuerwehr"
  fachaufgabe?: string;        // z.B. "brandbekaempfung"
  einheit?: string;            // z.B. "gruppe"
  verwaltungsstufe?: string;   // z.B. "kreis"
  symbol?: string;             // z.B. "einsatzleiter" (aus den 84 Symbolen)
  text?: string;               // Freitext-Beschriftung (z.B. "EL", "BHP 500")
}
```

### TaktischesZeichen (Aggregate)

Zentrale Entität. Vereint Zeichen-Definition, optionale Entitäts-Referenz und optionale Kartenposition.

```typescript
interface TaktischesZeichen {
  id: string;                          // CUID2
  einsatzId: string;                   // FK → Einsatz

  // Zeichen-Definition
  zeichenDefinition: ZeichenDefinition;

  // Optionale Referenz zu einer Entität
  referenzTyp?: 'EINHEIT' | 'FAHRZEUG' | 'ROLLE';
  referenzId?: string;                 // FK → EinsatzEinheit | EinsatzFahrzeug | EinsatzRollenbesetzung

  // Kartenposition (null = noch nicht platziert)
  koordinaten?: { lat: number; lng: number };
  mgrs?: string;
  lagekarteId?: string;               // FK → Lagekarte

  // Metadaten
  label?: string;                      // Anzeigename (z.B. "LZ Mitte")
  notiz?: string;                      // Freitext-Notiz
  istAusKatalog: boolean;              // Quelle war ein Katalog-Eintrag
  katalogEintragId?: string;           // Referenz zum Katalog-Eintrag

  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}
```

### ZeichenKatalogEintrag (Seed-Entität)

Vorgefertigte Zeichen-Vorlagen. ~50-80 Standardeinträge werden per Seed geladen. Nutzer können zusätzliche Einträge erstellen.

```typescript
interface ZeichenKatalogEintrag {
  id: string;                          // CUID2
  name: string;                        // z.B. "Einsatzleitung Feuerwehr"
  kategorie: string;                   // FUEHRUNG, BEREITSTELLUNG, GEFAHREN, VERSORGUNG, etc.
  beschreibung?: string;
  zeichenDefinition: ZeichenDefinition;
  tags: string[];                      // Suchbegriffe
  sortOrder: number;
  istStandard: boolean;                // true = Seed, false = benutzerdefiniert
}
```

### Default-Zeichen-Zuordnungen

Jeder Fahrzeugtyp und Einheitentyp hat ein Default-Zeichen, das bei der Erstellung eines EinsatzFahrzeugs/EinsatzEinheit automatisch vorgeschlagen wird. Pro Instanz kann das Zeichen überschrieben werden (Override).

```typescript
interface FahrzeugtypZeichenDefault {
  fahrzeugtypId: string;               // FK → Fahrzeugtyp
  zeichenDefinition: ZeichenDefinition;
}

interface EinheitentypZeichenDefault {
  einheitentyp: 'TRUPP' | 'STAFFEL' | 'GRUPPE' | 'ZUG' | 'ABSCHNITT';
  zeichenDefinition: ZeichenDefinition; // enthält organisation, fachaufgabe, etc.
}
```

## Rendering-Architektur

### Abstraktionsschicht

Ein eigenes Interface kapselt die `phjardas/taktische-zeichen`-Bibliothek:

```typescript
// Port
interface TaktischesZeichenRenderer {
  renderSvg(definition: ZeichenDefinition): string;
  renderDataUrl(definition: ZeichenDefinition): string;
  getSize(definition: ZeichenDefinition): [number, number];
}

// Adapter
class PhjardasRenderer implements TaktischesZeichenRenderer {
  renderSvg(definition: ZeichenDefinition): string {
    const zeichen = erzeugeTaktischesZeichen({
      grundzeichen: definition.grundzeichen,
      organisation: definition.organisation,
      fachaufgabe: definition.fachaufgabe,
      einheit: definition.einheit,
    });
    return zeichen.toString();
  }
  // ...
}
```

### Einsatzorte

| Ort | Größe | Methode |
|-----|-------|---------|
| Katalog-Browser | 32-48px | `renderDataUrl` → `<img>` |
| Baukasten Live-Vorschau | 128px+ | `renderSvg` → inline SVG |
| Einheiten-/Fahrzeugliste | 24-32px | `renderDataUrl` → `<img>` |
| Lagekarte (MapLibre) | skalierbar | `renderDataUrl` → `map.addImage()` |
| Druck/Export (später) | hochauflösend | Backend: `renderSvg` |

### MapLibre-Integration

Taktische Zeichen werden als **eigener Symbol-Layer** gerendert, getrennt von MapboxDraw-Features:

```typescript
map.addSource('taktische-zeichen', {
  type: 'geojson',
  data: featureCollection
});

map.addLayer({
  id: 'taktische-zeichen-layer',
  type: 'symbol',
  source: 'taktische-zeichen',
  layout: {
    'icon-image': ['get', 'iconId'],
    'icon-size': 0.5,
    'icon-allow-overlap': true,
    'text-field': ['get', 'label'],
    'text-offset': [0, 1.5],
    'text-size': 12
  }
});
```

Jedes einzigartige Zeichen wird einmal als Image registriert. Ein Cache-Key aus den Definition-Feldern verhindert Duplikate.

**Interaktion:** Klick → Detail-Panel, Drag → Position ändern, Rechtsklick → Kontextmenü (Bearbeiten, Entfernen, zur Einheit springen).

## Backend-Architektur

### Schichten (Hexagonal)

```
domain/taktische-zeichen/
├── aggregates/taktisches-zeichen.aggregate.ts
├── value-objects/zeichen-definition.vo.ts
├── events/
│   ├── zeichen-erstellt.event.ts
│   ├── zeichen-platziert.event.ts
│   ├── zeichen-verschoben.event.ts
│   └── zeichen-entfernt.event.ts
└── ports/taktisches-zeichen.repository.port.ts

application/taktische-zeichen/
├── commands/
│   ├── erstelle-zeichen.command.ts
│   ├── platziere-zeichen.command.ts
│   ├── verschiebe-zeichen.command.ts
│   ├── aktualisiere-zeichen.command.ts
│   └── entferne-zeichen.command.ts
├── queries/
│   ├── finde-zeichen-fuer-einsatz.query.ts
│   ├── finde-zeichen-fuer-lagekarte.query.ts
│   ├── finde-katalog-eintraege.query.ts
│   └── finde-default-zeichen.query.ts
└── handlers/ (ein Handler pro Command/Query)

infrastructure/taktische-zeichen/
├── prisma-taktisches-zeichen.repository.ts
└── taktisches-zeichen.seeder.ts

modules/taktische-zeichen/
├── taktische-zeichen.controller.ts
└── taktische-zeichen.module.ts
```

### API-Endpoints

```
# Katalog
GET    /api/einsaetze/:id/taktische-zeichen/katalog
GET    /api/einsaetze/:id/taktische-zeichen/katalog?suche=...&kategorie=...

# Default-Zeichen für Typen
GET    /api/taktische-zeichen/defaults/fahrzeugtypen
GET    /api/taktische-zeichen/defaults/einheitentypen

# Taktische Zeichen im Einsatz (CRUD)
GET    /api/einsaetze/:id/taktische-zeichen
POST   /api/einsaetze/:id/taktische-zeichen
PATCH  /api/einsaetze/:id/taktische-zeichen/:zeichenId
DELETE /api/einsaetze/:id/taktische-zeichen/:zeichenId

# Kartenplatzierung
PUT    /api/einsaetze/:id/taktische-zeichen/:zeichenId/position
DELETE /api/einsaetze/:id/taktische-zeichen/:zeichenId/position
```

### Prisma-Schema

```prisma
model TaktischesZeichen {
  id                String   @id @default(cuid())
  einsatzId         String
  einsatz           Einsatz  @relation(fields: [einsatzId], references: [id], onDelete: Cascade)

  zeichenDefinition Json
  referenzTyp       String?
  referenzId        String?

  lat               Float?
  lng               Float?
  mgrs              String?
  lagekarteId       String?
  lagekarte         Lagekarte? @relation(fields: [lagekarteId], references: [id])

  label             String?
  notiz             String?
  istAusKatalog     Boolean  @default(false)
  katalogEintragId  String?

  createdAt         DateTime @default(now())
  createdBy         String
  updatedAt         DateTime @updatedAt
  updatedBy         String?

  @@index([einsatzId])
  @@index([lagekarteId])
  @@index([referenzTyp, referenzId])
}

model ZeichenKatalogEintrag {
  id                String   @id @default(cuid())
  name              String
  kategorie         String
  beschreibung      String?
  zeichenDefinition Json
  tags              String[]
  sortOrder         Int      @default(0)
  istStandard       Boolean  @default(true)

  @@index([kategorie])
}
```

### Events & WebSocket

Zeichen-Änderungen werden über den bestehenden Outbox-Mechanismus publiziert. Events müssen in 4 Stellen registriert werden: Serializer, Deserializer, Adapters Module, Adapters Index. Das Frontend empfängt Events via WebSocket und aktualisiert den MapLibre Symbol-Layer in Echtzeit.

## Frontend-Architektur

### Feature-Struktur

```
features/taktische-zeichen/
├── api/
│   ├── use-zeichen-katalog.ts
│   ├── use-einsatz-zeichen.ts
│   ├── use-create-zeichen.ts
│   ├── use-update-zeichen.ts
│   ├── use-place-zeichen.ts
│   └── use-remove-zeichen.ts
├── rendering/
│   ├── renderer.ts                     # TaktischesZeichenRenderer Interface
│   ├── phjardas-adapter.ts             # Adapter für phjardas/taktische-zeichen
│   ├── zeichen-image-cache.ts          # MapLibre Image-Cache (dedup)
│   └── ZeichenPreview.tsx              # Wiederverwendbare Vorschau-Komponente
├── ui/
│   ├── organisms/
│   │   ├── ZeichenKatalog.tsx
│   │   ├── ZeichenBaukasten.tsx
│   │   └── KartenZeichenSidebar.tsx
│   ├── molecules/
│   │   ├── KatalogEintrag.tsx
│   │   ├── ZeichenEditor.tsx
│   │   ├── BaukastenSchritt.tsx
│   │   └── PlatzierungsPanel.tsx
│   └── atoms/
│       ├── GrundzeichenPicker.tsx
│       ├── FachaufgabePicker.tsx
│       ├── OrganisationPicker.tsx
│       └── EinheitPicker.tsx
└── hooks/
    ├── use-zeichen-map-layer.ts
    ├── use-zeichen-drag.ts
    └── use-zeichen-from-entity.ts
```

### UI-Flows

**Drei Zugangswege:**

1. **Katalog** — Katalog öffnen → Suchen/Filtern → Eintrag auswählen → Optional Label/Notiz → Zeichen erstellt (noch nicht auf Karte)
2. **Baukasten** — Grundzeichen → Organisation → Fachaufgabe → Einheit (geführt, 4 Schritte) → Live-Vorschau → Bestätigen → Zeichen erstellt
3. **Aus Kräfte-Modul** — Seitenleiste zeigt Einheiten/Fahrzeuge im Einsatz mit Default-Zeichen → Optional Override → Auf Karte klicken → Zeichen erstellt + platziert

### Karten-Seitenleiste

Integration als neuer Tab in die bestehende Lagekarte-UI:

- **Tab "Taktische Zeichen"** neben bestehendem "Zeichnen" und "Layer"
- **Sub-Tabs:** Kräfte | Katalog | Baukasten
- **Kräfte-Tab:** Zeigt Einheiten und Fahrzeuge im Einsatz, gruppiert nach Typ, mit Platzierungs-Status
- **Katalog-Tab:** Suchfeld + Kategorie-Filter + Einträge mit Zeichen-Vorschau
- **Baukasten-Tab:** Geführter 4-Schritt-Editor mit Live-Vorschau

## Datenflüsse

### Flow 1: Einheit → Default-Zeichen → Karte

```
EinsatzEinheit (Status: IM_EINSATZ)
  → Frontend fragt Default-Zeichen ab (GET /defaults/einheitentypen)
  → ZeichenDefinition wird aus Default zusammengesetzt
  → Seitenleiste zeigt Einheit mit gerendertem Zeichen
  → User klickt "Platzieren" → Klick auf Karte
  → POST /taktische-zeichen { zeichenDefinition, referenzTyp: "EINHEIT", referenzId }
  → PUT  /taktische-zeichen/:id/position { lat, lng }
  → WebSocket-Event → alle Clients aktualisieren MapLibre-Layer
```

### Flow 2: Katalog → Zeichen → Karte

```
User öffnet Katalog-Tab
  → GET /katalog?kategorie=FUEHRUNG
  → User wählt "Einsatzleitung"
  → POST /taktische-zeichen { zeichenDefinition, istAusKatalog: true, katalogEintragId }
  → Zeichen existiert jetzt (ohne Position)
  → PUT  /taktische-zeichen/:id/position { lat, lng }
```

### Flow 3: Baukasten → Zeichen → Karte

```
User öffnet Baukasten-Tab
  → Geführte Auswahl: Grundzeichen → Organisation → Fachaufgabe → Einheit
  → Live-Vorschau zeigt zusammengesetztes Zeichen
  → User bestätigt → POST /taktische-zeichen { zeichenDefinition }
  → Platzierung über Seitenleiste oder direkten Kartenklick
```

### Lebenszyklus eines Zeichens

```
ERSTELLT (ohne Position)
  → Sichtbar in Seitenleiste, nicht auf Karte

PLATZIERT (mit Position + lagekarteId)
  → Sichtbar auf Karte + in Seitenleiste als "✓ Platziert"
  → Verschiebbar per Drag, editierbar

VON KARTE ENTFERNT (Position gelöscht)
  → Zurück in Seitenleiste als "Platzieren"
  → Zeichen-Daten bleiben erhalten

GELÖSCHT
  → Komplett entfernt (Cascade bei Einsatz-Löschung)
```

### Override-Flow

```
Einheit hat Default-Zeichen (aus Typ abgeleitet)
  → User klickt "Bearbeiten" am Zeichen
  → ZeichenEditor öffnet sich mit vorausgefüllten Werten
  → User ändert einzelne Felder (z.B. Fachaufgabe)
  → PATCH /taktische-zeichen/:id { zeichenDefinition: { ...override } }
  → Zeichen bleibt mit Einheit verknüpft, hat aber eigene Definition
```

## Implementierungsphasen

### Phase 1: Fundament (Rendering + Domain)

- `taktische-zeichen-core` + `taktische-zeichen-react` als Dependencies
- Abstraktionsschicht (Interface + PhjardasAdapter)
- `ZeichenPreview`-Komponente
- Prisma-Schema: `TaktischesZeichen` + `ZeichenKatalogEintrag`
- Migration + Seed-Daten (~50-80 Katalog-Einträge)
- Backend: CQRS-Stack (Aggregate, Commands, Queries, Controller)

### Phase 2: Katalog & Baukasten

- API-Endpoints: Katalog (GET mit Suche/Filter), CRUD für Zeichen
- Frontend: `ZeichenKatalog`-Komponente mit Suche
- Frontend: `ZeichenBaukasten`-Komponente (4-Schritt, Live-Vorschau)
- TanStack Query Hooks für alle Endpoints

### Phase 3: Karten-Integration

- MapLibre Symbol-Layer für taktische Zeichen
- `useZeichenMapLayer` Hook (GeoJSON-Source, Image-Cache, Layer)
- `useZeichenDrag` Hook (Drag & Drop auf der Karte)
- Karten-Seitenleiste mit Tabs (Kräfte / Katalog / Baukasten)
- Platzierungs-Flow (Klick auf Karte → Position setzen)

### Phase 4: Kräfte-Verknüpfung

- Default-Zeichen-Zuordnungen für Fahrzeugtypen + Einheitentypen (Seed)
- API: Defaults-Endpoints
- Seitenleiste: Einheiten/Fahrzeuge mit ihren Zeichen
- Override-Flow
- `useZeichenFromEntity` Hook

### Phase 5: Echtzeit & Polish

- WebSocket-Events (Outbox-Integration, 4-Stellen-Registrierung)
- Kontextmenü auf der Karte
- Detail-Panel bei Klick
- Tests

## Abgrenzung

- Kein vollständiger DV 102-Zeichensatz in v1 — Fokus auf ~50-80 häufigste Zeichen
- GPS-Tracking von Fahrzeugen ist separates Feature (#238)
- Druck/Export-Funktionalität ist Folge-Feature
- Admin-UI für Katalog-Verwaltung ist Folge-Feature

## Verwandte Issues

- #239 DIN 14034 Taktische Zeichen Integration
- #260 Replace POI Icons with Tactical Symbols
- #48 Lagekarte (Original)

## Externe Abhängigkeiten

- [`phjardas/taktische-zeichen`](https://github.com/phjardas/taktische-zeichen) — MIT-Lizenz, TypeScript, DV 102-konform
  - `taktische-zeichen-core`: Dependency-freie Rendering-Engine
  - `taktische-zeichen-react`: React-Komponenten
  - 36 Grundzeichen, 42 Fachaufgaben, 8 Organisationen, 8 Einheiten, 6 Verwaltungsstufen, 84 Symbole

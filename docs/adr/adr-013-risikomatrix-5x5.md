# ADR-013: 5×5-Risikomatrix-Mapping für Eigenschutz-Gefährdungsbeurteilungen

## Status

Proposed (2026-04-22) — **PO-Freigabe ausstehend**. Dev-Agent legt diese ADR mit
dokumentiertem Vorschlag an (siehe Story 2.2 AC14); Ruben entscheidet vor Merge
über Annahme oder Anpassung.

## Kontext

Funktionale Anforderung **FR2** („fest hinterlegtes Schema") und Klärungsfrage
**Q1** („Risikomatrix 5×5 qualitativ, 4 Ergebnisklassen") des PRD legen fest,
dass jede Gefährdung nach zwei Dimensionen bewertet wird:

- **Eintrittswahrscheinlichkeit** (`Eintrittswahrscheinlichkeit`, 5 Stufen): `SELTEN`, `GELEGENTLICH`, `HAEUFIG`, `OFT`, `STAENDIG`.
- **Schadensausmaß** (`Schadensausmass`, 5 Stufen): `VERNACHLAESSIGBAR`, `GERING`, `MITTEL`, `HOCH`, `KATASTROPHAL`.

Aus der Kombination beider Dimensionen entsteht genau eine von vier
`Risikoklasse`-Werten (`GRUEN`, `GELB`, `ORANGE`, `ROT`). Die konkrete Zuordnung
der 25 Zellen ist weder im PRD noch in den Architekturen detailliert — sie ist
aber **audit-relevant** (DGUV-Prüfung) und muss nachvollziehbar begründet sein.

**Advisor-Warnung (2026-04-22):** „fest hinterlegtes Schema" meint *nachvollziehbar*,
nicht *erfunden*. Eine novel Matrix ohne Branchenquelle wäre für die weißen
Hilfsorganisationen (DRK, JUH, MHD, ASB, DLRG) im Prüffall nicht verteidigbar.

Drei kandidierende Quellen wurden bewertet:

1. **Nohl-Methode** (Joachim Nohl, 1989, verbreitet in DGUV-Handlungshilfen und
   BGHM-Praxiskatalog): numerische Skalenwerte 1–5 pro Dimension, Risikozahl =
   Produkt (1–25), vier Klassen mit fest definierten Schwellen.
2. **BGHM-Handlungshilfe „Beurteilung der Arbeitsbedingungen"** (Berufsgenossenschaft
   Holz und Metall): stark angelehnt an Nohl, etwas andere Schwellen.
3. **DGUV Regel 100-001 Anhang 2 (Gefährdungsbeurteilung)**: qualitative 3×3-Matrix,
   zu grob für die 4-Klassen-Anforderung aus Q1.

Die **Nohl-Methode** passt am besten — 5×5-Granularität, 4 Ergebnisklassen,
branchenweit akzeptiert, DGUV-referenziert.

## Entscheidung

Wir legen die 25-Zellen-Zuordnung als **Nohl-Matrix mit multiplikativer
Risikozahl** fest. Numerische Skalen sind **interne Utility-Konstanten**
(nicht im Domain-Vokabular sichtbar):

| Stufe (Eintritt)   | Wert | Stufe (Schaden)     | Wert |
| ------------------ | ---- | ------------------- | ---- |
| `SELTEN`           | 1    | `VERNACHLAESSIGBAR` | 1    |
| `GELEGENTLICH`     | 2    | `GERING`            | 2    |
| `HAEUFIG`          | 3    | `MITTEL`            | 3    |
| `OFT`              | 4    | `HOCH`              | 4    |
| `STAENDIG`         | 5    | `KATASTROPHAL`      | 5    |

Risikozahl = Eintritt × Schaden (Bereich 1–25). Klassen-Schwellen:

| Risikozahl | `Risikoklasse` |
| ---------- | -------------- |
| 1–3        | `GRUEN`        |
| 4–9        | `GELB`         |
| 10–15      | `ORANGE`       |
| 16–25      | `ROT`          |

### 25-Zellen-Mapping (Source of Truth)

Die folgende Tabelle ist aus den Schwellen oben ableitbar und dient als
verbindliche Fixture. **Zeilen = Eintrittswahrscheinlichkeit (Y-Achse),
Spalten = Schadensausmaß (X-Achse)** — entspricht der UX-Spec-Konvention
(X-Achse oben, Y-Achse links).

|                | `VERNACHLAESSIGBAR` | `GERING`   | `MITTEL`   | `HOCH`     | `KATASTROPHAL` |
| -------------- | ------------------- | ---------- | ---------- | ---------- | -------------- |
| `SELTEN`       | `GRUEN`             | `GRUEN`    | `GRUEN`    | `GELB`     | `GELB`         |
| `GELEGENTLICH` | `GRUEN`             | `GELB`     | `GELB`     | `GELB`     | `ORANGE`       |
| `HAEUFIG`      | `GRUEN`             | `GELB`     | `GELB`     | `ORANGE`   | `ORANGE`       |
| `OFT`          | `GELB`              | `GELB`     | `ORANGE`   | `ROT`      | `ROT`          |
| `STAENDIG`     | `GELB`              | `ORANGE`   | `ORANGE`   | `ROT`      | `ROT`          |

Verteilung: 5× `GRUEN`, 10× `GELB`, 5× `ORANGE`, 5× `ROT`.

### Code-Source-of-Truth

Die Matrix wird **einmal** als reine TypeScript-Funktion hinterlegt:

- **Primärer Pfad:** `packages/shared/src/utils/eigenschutz/risikoklasse.ts`
  (Funktion `calculateRisikoklasse(eintritt, schaden): Risikoklasse`).
- **Fixture:** `packages/shared/src/utils/eigenschutz/risikoklasse-5x5.fixture.ts`
  (25-Einträge-Array für parametrisierte Tests in Backend + Frontend).

Die reine Funktion hat **keine Runtime-Dependencies außer den Enum-Konstanten**
(`EINTRITTSWAHRSCHEINLICHKEIT_WERTE` / `SCHADENSAUSMASS_WERTE` aus dem Shared-
Schema-Modul). Kein Zod-Import, kein I/O — damit sowohl Backend-CJS als auch
Frontend-ESM die Funktion ohne Modul-Auflösungs-Friktion nutzen.

**Fallback-Pfad (dokumentiert, nur bei Laufzeit-Import-Fehler):** Duplikat in
`packages/backend/src/domain/eigenschutz/value-objects/risikoklasse-berechnung.ts`
+ `packages/frontend/src/features/eigenschutz/utils/risikoklasse-berechnung.ts`,
mit geteilter Fixture-JSON. Drift wird dann über eine Konsistenz-Spec detektiert,
die beide Implementierungen gegen dieselbe Fixture testet.

### Backend-autoritative Berechnung

Die Berechnung ist **Backend-autoritativ** (AC3). Der Server überschreibt ein
evtl. vom Client mitgeliefertes `risikoklasse`-Feld bei Persistierung. Der
Frontend-Utility-Aufruf ist reine **UI-Preview** (Matrix-Zellen-Farbe vor
Submit), kein Persist-Pfad.

## Konsequenzen

### Positiv

- **Nachvollziehbare Branchenreferenz.** Die Nohl-Methode ist in DGUV-/BGHM-
  Praxishilfen etabliert; Audit-Anfragen lassen sich mit einer einzigen
  Literaturreferenz beantworten.
- **Deterministisches Mapping.** Produkt-basierte Berechnung ist trivial zu
  testen, zu dokumentieren und zu reviewen. Keine Edge-Cases, keine
  Business-Rules-Ausnahmen.
- **Backend + Frontend konsistent.** Eine Shared-Utility (plus dokumentierter
  Fallback) garantiert Drift-Freiheit zwischen Server-Berechnung (Persist) und
  Client-Preview (UX).
- **Fixture-testbar.** Alle 25 Zellen sind als parametrisierter Test abgedeckt.
  Eine Abweichung zwischen Matrix-Doku und Implementierung fällt sofort auf.
- **Erweiterbar ohne Breaking-Change.** Sollte eine zukünftige HiOrg die
  Schwellen anpassen wollen, genügt eine neue ADR-Version + Deployment der
  aktualisierten Utility — keine Datenbank-Migration, weil `risikoklasse` pro
  Item re-berechnet wird und keine numerische Risikozahl persistiert ist.

### Negativ

- **Keine feingranulare Differenzierung bei Schwellen-Zellen.** Zellen an der
  Klassen-Grenze (z. B. `HAEUFIG × MITTEL = 9 → GELB` vs. `GELEGENTLICH × KATASTROPHAL = 10 → ORANGE`)
  sind konzeptuell dicht beieinander, fallen aber in unterschiedliche
  Ampel-Farben. Das ist inhärent an jeder Matrix mit diskreten Klassen und
  durch die Nohl-Standardisierung begründet.
- **Keine individuelle Gewichtung pro HiOrg/Einsatzart.** MVP-Scope — falls
  künftige Requirements eine szenarien-spezifische Gewichtung fordern (z. B.
  CBRN-Einsätze mit niedrigerer ORANGE-Schwelle), wäre das eine neue ADR.
- **Bereits persistierte `risikoklasse`-Werte divergieren bei Schwellen-Änderung.**
  Bei einer zukünftigen Matrix-Änderung würde der Server bei jedem Update die
  Werte neu berechnen — Bestands-Items in alten `GefaehrdungsbeurteilungVersion`-
  Zeilen behalten jedoch ihre damalige Klasse (Audit-Trail). Für MVP akzeptiert;
  Re-Write-Migration wäre Aufgabe einer separaten Story.

## Alternativen

### 1. BGHM-Handlungshilfe (3-Klassen-Matrix)

Abgelehnt. Die BGHM-Handlungshilfe nutzt nur 3 Ergebnisklassen (Grün / Gelb /
Rot) — Q1 fordert explizit 4 Klassen inkl. ORANGE als Zwischenstufe. Ein
Upgrade auf 4 Klassen würde die Nohl-Logik ohnehin wieder einführen.

### 2. Qualitative 5×5-Matrix ohne Risikozahl-Produkt

Abgelehnt. Zellen-per-Zelle frei zuweisbar wäre flexibler, aber ohne
numerische Begründung pro Zelle ist das Mapping im Audit nicht verteidigbar.
Die Produkt-Regel liefert eine mathematische Quelle, die konsistent mit der
Nohl-Literatur ist.

### 3. Konfigurierbare Matrix pro HiOrg

Abgelehnt für MVP. Die funktionale Anforderung FR2 verlangt ein **fest
hinterlegtes** Schema — Konfigurierbarkeit öffnet Customization-Aufwand, den
der PRD explizit ausschließt. Eine spätere Erweiterung wäre möglich (neue ADR),
aber aktuell nicht in Scope.

### 4. Additive statt multiplikative Risikozahl (Eintritt + Schaden)

Abgelehnt. Additiv ergibt nur Werte 2–10 (Range 8) und verteilt die 25 Zellen
auf nur 9 Risikozahlen — geringere Trennschärfe an den Klassen-Grenzen.
Multiplikativ (Range 1–25) differenziert feiner und ist in der Nohl-Literatur
die Standardform.

## Umsetzungshinweise

- **Keine Prisma-Migration.** Der `Risikoklasse`-Enum existiert bereits
  (`packages/backend/prisma/schema.prisma:2589`). Die Matrix ist reine
  Business-Logik.
- **Utility-Platzierung:** Shared-First (`packages/shared/src/utils/eigenschutz/`)
  — neuer `utils/`-Unterpfad im Shared-Package; Barrel-Export aus
  `packages/shared/src/index.ts` ergänzen. Fallback-Pfad nur bei Runtime-Import-
  Fehler aktivieren und in Completion Notes dokumentieren.
- **Backend-Integration:** `GefaehrdungItem.create()` ruft
  `calculateRisikoklasse(eintritt, schaden)` wenn beide Felder gesetzt sind und
  überschreibt ein evtl. vom Client mitgeliefertes `risikoklasse`-Feld
  (Backend-Autorität, AC3).
- **Frontend-Integration:** `RiskMatrix5x5`-Komponente ruft dieselbe Utility
  für die UI-Preview (Zellenfarbe während Auswahl). Die berechnete
  `risikoklasse` wird nicht als Prop hochgereicht — der Container berechnet
  sie bei Bedarf neu.
- **Testing:** Parametrisierte Spec läuft gegen die 25-Zellen-Fixture (Backend
  + Frontend). Eine Abweichung zwischen Matrix-Doku (diese ADR) und
  Implementierung ist ein Test-Fail.
- **ADR-Fortschreibung:** Änderungen an der Matrix erfordern eine neue
  ADR-Version (ADR-013v2 oder separate ADR-014 „Matrix-Schwellen-Anpassung") +
  Data-Migration-Überlegung. Für MVP: kein Auto-Rewrite von historischen
  `risikoklasse`-Werten; Server berechnet neu bei jedem Update.

## Referenzen

- [Nohl-Methode, Joachim Nohl 1989] — klassische Basisliteratur, im Bundesanzeiger
  und DGUV-Informationen zur Gefährdungsbeurteilung referenziert.
- [BGHM-Handlungshilfe „Gefährdungsbeurteilung"](https://www.bghm.de/arbeitsschutz/gefaehrdungsbeurteilung)
  — Praxishilfe der Berufsgenossenschaft Holz und Metall, nutzt Nohl-Ableitung.
- [DGUV Regel 100-001 „Grundsätze der Prävention"](https://publikationen.dguv.de/)
  — Kapitel 2.5 zur Gefährdungsbeurteilung, Anhang 2 Matrix-Beispiel.
- `_bmad-output/planning-artifacts/prd.md:442` — FR2 „fest hinterlegtes Schema".
- `_bmad-output/planning-artifacts/prd.md:593-595` — Q1 „5×5 qualitativ,
  4 Ergebnisklassen".
- `packages/shared/src/schemas/eigenschutz/gefaehrdung-item.schema.ts:9-25` —
  Enum-Konstanten für Eintritt/Schaden/Risikoklasse (Shared Source of Truth).
- [ADR-012: `EinsatzScopeGuard` als Plattform-Pattern](./adr-012-einsatz-scope-guard.md)
  — Format-Vorlage; ADR-013 folgt derselben Struktur.

> **Hinweis zu Planning-Quellen:** Detaillierte PRD-/Architektur-Dokumente
> liegen unter `_bmad-output/planning-artifacts/` als Workflow-Scratchpad und
> sind bewusst **nicht** im Repository versioniert (siehe MEMORY). Für
> aktuelle Referenzen gelten ausschließlich die hier verlinkten versionierten
> Quellen (Schema, CLAUDE.md, andere ADRs).

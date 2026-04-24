# Sprint Change Proposal — Scope-Korrektur Eigenschutz-PRD

**Datum:** 2026-04-23
**Auslöser:** Widerspruch zwischen Projekt-Zielgruppe und Formulierungen im Eigenschutz-PRD
**Betroffene Artefakte:** PRD, Architecture, UX-Spezifikation
**Scope-Klassifikation:** Minor

## 1. Issue Summary

Im PRD für das Modul **Eigenschutz** gibt es fachlichen Scope-Drift:

- Das Projekt ist laut Projektdokumentation **explizit nicht für Feuerwehr** ausgerichtet.
- Das PRD spricht an mehreren Stellen dennoch von **Feuerwehr** als Zielgruppe bzw. Beispielpersona.
- **Atemschutz-Überwachung** ist in den Planungsartefakten zwar als **Phase 2 / nicht MVP** markiert, erscheint im PRD aber so prominent, dass sie wie ein legitimer Produktpfad für die Kernzielgruppe wirkt.

Dadurch kollidieren die Artefakte semantisch: Zielgruppe und Produktnarrativ sagen unterschiedliche Dinge.

## 2. Evidenz

### Projekt-Zielgruppe

- `docs/project-documentation/00-index.md:79-81` definiert weiße Hilfsorganisationen als Zielgruppe und schließt Feuerwehr explizit aus.
- `CLAUDE.md:9` bestätigt dieselbe Scope-Grenze.

### PRD-Konflikte

- `prd.md:61` nennt als Zielnutzer u. a. **Atemschutz-Überwachungstrupps** in **Feuerwehr**-Kontexten.
- `prd.md:112-120` beschreibt Persona 2 explizit als **Freiwillige Feuerwehr** und nutzt Atemschutz-/CSA-Beispiele.
- `prd.md:152-187` führt mit Persona/Journey 5 eine klar feuerwehrspezifische **Atemschutz-Trupp-Überwachung** ein.
- `prd.md:702` grenzt Atemschutz zwar wieder als **Phase 2** ab, wodurch im selben Dokument ein widersprüchliches Signal entsteht.

### Bereits konsistentere Folgeartefakte

- `ux-design-specification.md:59-61` sagt klar: **Atemschutz Phase 2**, Zielgruppe **weiße Hilfsorganisationen**, **nicht** feuerwehrzentrierte Terminologie.
- `epics.md` nimmt Journey 5 bewusst **nicht** in den MVP/Epic-Scope auf.

## 3. Impact Analysis

### Epic Impact

- **Keine Epic- oder Story-Neuplanung nötig.**
- Die Epics sind bereits näher an der korrekten Scope-Lesart als das PRD.
- Journey 5 ist in der Umsetzungsplanung bereits ausgeklammert; das Risiko liegt primär in Fehlinterpretation, nicht in falscher Sprint-Struktur.

### Artefakt-Konflikte

- **PRD:** Muss als primäre Quelle bereinigt werden.
- **Architecture:** Verweist noch auf „Journey 5 Atemschutz-Überwachung" als Phase-2-Reservierung; diese Benennung sollte an die bereinigte PRD-Sprache angepasst werden.
- **UX-Spezifikation:** Fachlich weitgehend konsistent, aber bei Beibehaltung/Umbenennung von Journey 5 ist eine terminologische Synchronisierung sinnvoll.

### Produkt-/MVP-Impact

- **Feuerwehr ist out of target scope.**
- **Atemschutz ist nicht generell verboten**, aber aktuell nur als **Post-MVP/Phase 2** erwähnt und darf weder MVP noch Kernnarrativ des Moduls prägen.
- Die Korrektur ist daher **keine strategische Neuausrichtung**, sondern eine **Rückführung auf den bereits dokumentierten Scope**.

## 4. Empfohlener Weg

**Empfehlung:** Option 1 — Direct Adjustment

**Begründung:**

- Niedriger Umsetzungsaufwand.
- Kein Rollback nötig.
- Kein Re-Slicing der Epics nötig.
- Höchster Nutzen entsteht durch saubere Dokumentations-Synchronisierung der Planungsartefakte.

**Risiko:** Niedrig
**Aufwand:** Niedrig
**Timeline-Impact:** Vernachlässigbar

## 5. Detaillierte Change Proposals

### Proposal A — PRD Executive Summary auf Zielgruppe zurückführen

**Artefakt:** `prd.md`
**Sektion:** Executive Summary

**OLD**

> Zielnutzer sind Sicherheitsbeauftragte (S-Stab), Einsatzabschnittsleiter, Einheitsführer und Atemschutz-Überwachungstrupps in BOS-Organisationen (Katastrophenschutz, Feuerwehr, Rettungsdienst, THW).

**NEW**

> Zielnutzer sind Sicherheitsbeauftragte (S-Stab), Abschnittsleiter und Einheitsführer in weißen Hilfsorganisationen des Sanitätsdienstes und Katastrophenschutzes (z. B. DRK, JUH, MHD, ASB, DLRG). Feuerwehr-spezifische Workflows gehören nicht zur Zielausrichtung des Moduls.

**Rationale**

- Bringt das PRD wieder in Einklang mit der globalen Produkt-Zielgruppe.
- Entfernt den Eindruck, Feuerwehr sei Primärmarkt des Moduls.

### Proposal B — Persona 2 von Feuerwehr-Beispiel auf weiße HiOrg umstellen

**Artefakt:** `prd.md`
**Sektion:** Persona 2 / Journey 2

**OLD**

> Steffi, 35, Oberfeldwebel der Freiwilligen Feuerwehr ...
>
> ... Checkliste der neuen Ausrüstung (CSA, umgebungsluftunabhängiger Atemschutz) ...

**NEW**

> Steffi, 35, Abschnittsleiterin einer Sanitäts- bzw. Betreuungseinheit ...
>
> ... Checkliste der aktivierten PSA-Profile (z. B. Warnschutz, Infektionsschutz, CBRN-Patientenversorgung) ...

**Rationale**

- Journey 2 bleibt funktional erhalten.
- Die Beispiele entsprechen dem definierten PSA-Profil-Modell und der weißen HiOrg-Zielgruppe.
- Feuerwehr-/Atemschutz-Semantik verschwindet aus einem MVP-relevanten Kernflow.

### Proposal C — Journey 5 nicht mehr als feuerwehrspezifische Produktnarrative führen

**Artefakt:** `prd.md`
**Sektion:** Persona/Journey 5, Journey Summary, Scope-Verweise

**OLD**

> Persona 5 — Lukas, Atemschutzgeräteträger-Überwacher (Growth-Phase)
>
> Journey 5 — Atemschutz-Trupp-Überwachung (Post-MVP)

**NEW**

Variante 1 (bevorzugt):

> Persona/Journey 5 vollständig aus dem PRD-Kerntext entfernen und in einem kurzen Abschnitt „Deferred Future Considerations" zusammenfassen:
>
> „Erweiterte Spezialschutz- und Sonderlagen-Workflows sind kein Bestandteil des aktuellen PRD und werden bei Bedarf in einem separaten Folge-PRD spezifiziert."

Variante 2 (wenn ein Platzhalter bewusst erhalten bleiben soll):

> Journey 5 in einen weißen-HiOrg-kompatiblen Phase-2-Platzhalter umbenennen, z. B. „Spezialschutz-/CBRN-Patientenversorgungs-Lage (Post-MVP)", ohne feuerwehrspezifische Atemschutz-Trupp-Logik.

**Rationale**

- Der aktuelle Journey-Text ist fachlich klar feuerwehrspezifisch.
- Er steht quer zur globalen Produktausrichtung.
- Ein separater Folge-PRD wäre sauberer als ein halbintegrierter Fire-Service-Nebenpfad.

### Proposal D — Folgeartefakte terminologisch synchronisieren

**Artefakte:** `architecture.md`, `ux-design-specification.md`, optional `implementation-readiness-report`

**OLD**

> Journey 5 Atemschutz-Überwachung — Phase 2

**NEW**

> Falls Proposal C Variante 1 umgesetzt wird: Verweise auf Journey 5 entfernen oder als generische „spätere Spezialschutz-Workflows" formulieren.

> Falls Proposal C Variante 2 umgesetzt wird: alle Referenzen konsistent auf die neue, nicht-feuerwehrspezifische Benennung umstellen.

**Rationale**

- Verhindert, dass der Scope-Drift nach PRD-Bereinigung in Folgeartefakten bestehen bleibt.

## 6. Checklist-Status

### Section 1 — Trigger and Context

- `[x]` 1.1 Trigger identifiziert: PRD-Scope-Drift im Modul Eigenschutz
- `[x]` 1.2 Problem präzisiert: Missverständnis/Drift der ursprünglichen Anforderungen
- `[x]` 1.3 Evidenz gesammelt: konkrete Fundstellen in PRD, Projekt-Doku, UX, Epics

### Section 2 — Epic Impact Assessment

- `[x]` 2.1 Aktuelle Epics bleiben tragfähig
- `[x]` 2.2 Keine Epic-Level-Neudefinition nötig
- `[x]` 2.3 Zukünftige Epics nicht invalidiert
- `[x]` 2.4 Keine neuen Epics nötig
- `[N/A]` 2.5 Keine Prioritäts- oder Reihenfolgeänderung nötig

### Section 3 — Artifact Conflict and Impact Analysis

- `[x]` 3.1 PRD-Konflikt bestätigt
- `[x]` 3.2 Architecture-Terminologie partiell betroffen
- `[x]` 3.3 UX fachlich weitgehend konsistent, ggf. Begriffssync nötig
- `[x]` 3.4 Sekundärartefakte: Implementation-Readiness-Report ggf. mitziehen

### Section 4 — Path Forward Evaluation

- `[x]` 4.1 Direct Adjustment viable
- `[ ]` 4.2 Potential Rollback viable
- `[ ]` 4.3 PRD MVP Review nötig
- `[x]` 4.4 Empfohlener Pfad gewählt

### Section 5 — Proposal Components

- `[x]` 5.1 Issue Summary erstellt
- `[x]` 5.2 Auswirkungen dokumentiert
- `[x]` 5.3 Empfehlung begründet
- `[x]` 5.4 MVP-Impact und Aktionsplan beschrieben
- `[x]` 5.5 Handoff-Vorschlag definiert

## 7. Implementation Handoff

**Empfohlene Zuständigkeit:** Product Owner / Developer

**Konkrete Aufgaben:**

1. PRD an den Projekt-Scope angleichen.
2. Entscheidung treffen, ob Journey 5 entfernt oder neutralisiert wird.
3. Architecture- und UX-Referenzen auf die finale PRD-Lesart synchronisieren.
4. Kurz prüfen, ob Folge-Dokumente oder Issues dieselbe Feuerwehr-/Atemschutz-Semantik geerbt haben.

**Success Criteria**

- Kein Planungsartefakt stellt Feuerwehr als Zielgruppe dar.
- Atemschutz taucht nicht mehr als MVP- oder Kernnarrativ des Moduls auf.
- Falls Atemschutz als spätere Option erhalten bleibt, ist er klar als separater, nicht-feuerwehrzentrierter Folgepfad beschrieben.

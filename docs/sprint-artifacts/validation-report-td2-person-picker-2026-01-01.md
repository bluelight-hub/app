# Validation Report: Story TD2.6 Person-Picker

**Document:** `/docs/sprint-artifacts/td2-person-picker.md`
**Checklist:** `/docs/.bmad/bmm/workflows/4-implementation/create-story/checklist.md`
**Date:** 2026-01-01
**Validator:** SM Agent (Claude Opus 4.5) mit 4 parallelen Subagents

---

## Summary

- **Overall:** 18/22 Items passed (82%)
- **Critical Issues:** 2
- **Enhancements:** 4
- **Optimizations:** 3

| Category | Pass | Partial | Fail | N/A |
|----------|------|---------|------|-----|
| Technical Requirements | 8 | 2 | 1 | 0 |
| Reinvention Prevention | 2 | 1 | 1 | 0 |
| File Structure | 4 | 0 | 0 | 0 |
| LLM Optimization | 4 | 1 | 0 | 0 |

---

## Section Results

### 1. Story Metadata & Context

**Pass Rate:** 5/5 (100%)

✓ **Story Title klar und präzise**
Evidence: Zeile 1 - "Story TD2.6: Person-Picker für Rollenbesetzung"

✓ **User Story Format korrekt (Als... möchte ich... damit...)**
Evidence: Zeilen 9-11 - Vollständiges Format mit Einsatzleiter-Persona

✓ **Hintergrund dokumentiert mit Zeilennummern**
Evidence: Zeilen 14-22 - MVP-Referenz auf BesetzeRolleDialog.tsx:155-176, MVP-Kommentar Zeile 172

✓ **Dependencies explizit benannt**
Evidence: Zeile 23 - "Dependency: Basiert auf `td2-dialog-integration` (Done)"

✓ **Story Points geschätzt**
Evidence: Zeile 25 - "Aufwand: ~3 SP (ca. 6-8 Stunden)"

---

### 2. Acceptance Criteria Vollständigkeit

**Pass Rate:** 5/5 (100%)

✓ **AC1: Query Hook spezifiziert**
Evidence: Zeilen 29-36 - Vollständige Spezifikation mit API-Aufruf, Response-Typ, Query Key, staleTime

✓ **AC2: Komponenten-Interface definiert**
Evidence: Zeilen 38-59 - TypeScript Interface mit allen Props, Anzeige-Format, Filterung, Loading-State

✓ **AC3: Integration spezifiziert**
Evidence: Zeilen 61-67 - Ersetzung Zeilen 155-176, Form Field Verbindung, MVP-Kommentar entfernen

✓ **AC4: Exclude-Logik definiert**
Evidence: Zeilen 69-75 - useRollenBesetzungen laden, excludePersonIds übergeben, Backend-Fallback

✓ **AC5: Code Quality Anforderungen**
Evidence: Zeilen 77-84 - TypeScript strict, Tailwind, Biome, TanStack Query, alphabetische Imports

---

### 3. Technische Spezifikationen

**Pass Rate:** 5/8 (62.5%)

✓ **API Endpoint korrekt dokumentiert**
Evidence: Zeilen 133-149 - `GET /api/v-alpha/einsaetze/{einsatzId}/personen` mit vollständigem DTO
**Subagent-Verifizierung:** API existiert und DTO stimmt überein (abb0d94)

✓ **Combobox Pattern aus existierendem Code**
Evidence: Zeilen 152-168 - Pattern aus PersonHinzufuegenDialog referenziert
**Subagent-Verifizierung:** PersonHinzufuegenDialog Pattern korrekt (ae5a831)

✓ **Query Hook Vorlage vollständig**
Evidence: Zeilen 172-191 - Komplettes Code-Snippet mit staleTime, enabled, gcTime

✓ **Picker Komponente Vorlage vollständig**
Evidence: Zeilen 195-267 - Komplettes Code-Snippet mit JSDoc, Mapping, Loading State

✓ **BesetzeRolleDialog Integration Vorlage**
Evidence: Zeilen 270-309 - Aktueller vs. neuer Code mit excludePersonIds

⚠ **PARTIAL: Query Key Diskrepanz**
Story referenziert: `KRAEFTE_QUERY_KEYS.personen(einsatzId)` (Zeile 34)
Subagent-Befund: Existierender Hook `useEinsatzPersonen` im **einsatz** Feature nutzt `EINSATZ_QUERY_KEYS.personen(einsatzId)`
**Impact:** Potenzielle Cache-Inkonsistenz wenn beide Keys parallel existieren

⚠ **PARTIAL: Hook-Lokation Ambiguität**
Story sagt: "Hook `useEinsatzPersonen(einsatzId)` existiert in `features/kraefte/api/`" (Zeile 31)
Subagent-Befund: Hook existiert bereits in `features/einsatz/api/use-einsatz-personen.ts`
**Impact:** Entwickler könnte duplizieren statt wiederverwenden

✗ **FAIL: Fehlende Wiederverwendungs-Anweisung**
Story gibt keine klare Anweisung ob existierender Hook wiederverwendet oder neuer erstellt werden soll.
**Impact:** CRITICAL - Rad-Neuerfindung möglich

---

### 4. Reinvention Prevention

**Pass Rate:** 2/4 (50%)

✓ **Headless Combobox referenziert**
Evidence: Zeile 18 - "Headless Combobox existiert: `/packages/frontend/src/shared/ui/headless/combobox.tsx`"
**Subagent-Verifizierung:** Komponente existiert mit allen benötigten Props (a446f0a)

✓ **Pattern-Vorlage referenziert**
Evidence: Zeile 21 - "Pattern-Vorlage: `PersonHinzufuegenDialog` mit Combobox + Autocomplete"
**Subagent-Verifizierung:** Pattern korrekt dokumentiert (ae5a831)

⚠ **PARTIAL: useEinsatzPersonen bereits vorhanden**
Subagent-Befund: `/packages/frontend/src/features/einsatz/api/use-einsatz-personen.ts` existiert bereits mit:
```typescript
export const useEinsatzPersonen = (einsatzId: string | null, options?: { enabled?: boolean }) => {
  return useQuery<EinsatzPersonResponseDto[], ResponseError>({
    queryKey: EINSATZ_QUERY_KEYS.personen(einsatzId ?? ''),
    queryFn: async () => {
      const response = await api.einsatzPersonen().einsatzPersonenControllerFindAllVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId && (options?.enabled ?? true),
    staleTime: 30_000,
  });
};
```
**Impact:** Story schlägt Neuerstellung vor statt Wiederverwendung

✗ **FAIL: Keine Re-Export Anweisung**
Story fehlt Anweisung: "Re-exportiere `useEinsatzPersonen` aus einsatz Feature in kraefte Feature index.ts"
**Impact:** CRITICAL - Duplikat-Code wahrscheinlich

---

### 5. File Structure & Organization

**Pass Rate:** 4/4 (100%)

✓ **molecules Ordner korrekt**
Evidence: Zeile 94 - `features/kraefte/ui/molecules/EinsatzPersonenPicker.tsx`
**Subagent-Verifizierung:** molecules Ordner existiert mit RollenKarte, StaerkeCard, etc. (ae5a831)

✓ **queries.ts Erweiterung dokumentiert**
Evidence: Zeilen 311-323 - Query Keys erweitern falls fehlt
**Subagent-Verifizierung:** `KRAEFTE_QUERY_KEYS.personen` existiert bereits Zeile 30 (a446f0a)

✓ **Project Structure Alignment**
Evidence: Zeilen 345-359 - Ordnerstruktur klar dokumentiert

✓ **File List vollständig**
Evidence: Zeilen 407-414 - Zu erstellen und zu modifizieren klar getrennt

---

### 6. LLM-Dev-Agent Optimization

**Pass Rate:** 4/5 (80%)

✓ **Actionable Tasks mit Checkboxen**
Evidence: Zeilen 87-117 - Klare Tasks mit Subtasks und AC-Referenzen

✓ **Code-Snippets direkt verwendbar**
Evidence: Zeilen 152-343 - Alle Code-Vorlagen copy-paste-ready

✓ **Zeilennummern-Referenzen**
Evidence: Zeilen 123-128 - Tabelle mit exakten Zeilennummern für relevante Dateien
**Subagent-Verifizierung:** Zeilen 155-176 korrekt bestätigt (a446f0a)

✓ **Wichtige Hinweise klar markiert**
Evidence: Zeilen 369-376 - 5 kritische Hinweise nummeriert

⚠ **PARTIAL: Hook-Entscheidung nicht eindeutig**
Story sagt "Prüfe ob `useEinsatzPersonen` bereits existiert" (Zeile 88) aber gibt keine klare Handlungsanweisung was zu tun ist WENN er existiert.
**Impact:** LLM-Dev-Agent könnte falsche Entscheidung treffen

---

## Failed Items

### ✗ FAIL 1: Fehlende Wiederverwendungs-Anweisung für Hook

**Location:** AC1 / Task 1
**Problem:** Story gibt keine eindeutige Anweisung ob existierender `useEinsatzPersonen` Hook aus einsatz Feature wiederverwendet oder neuer Hook erstellt werden soll.

**Current State:**
```
Task 1: Query Hook erstellen (AC: 1)
  - Prüfe ob `useEinsatzPersonen` bereits existiert
  - Falls nein: Erstelle in `features/kraefte/api/use-einsatz-personen.ts`
```

**Problem:** Was wenn JA? Keine Anweisung!

**Recommendation:**
```markdown
- [ ] **Task 1: Query Hook Integration (AC: 1)**
  - [ ] `useEinsatzPersonen` existiert BEREITS in `features/einsatz/api/`
  - [ ] **Wiederverwendung statt Neuerstellung:**
    - Option A: Import direkt aus einsatz Feature
    - Option B: Re-export in `features/kraefte/api/index.ts`:
      ```typescript
      export { useEinsatzPersonen } from '@/features/einsatz/api';
      ```
  - [ ] **NIEMALS** duplizieren - DRY Principle!
```

---

### ✗ FAIL 2: Query Key Cache-Inkonsistenz Risiko

**Location:** AC1 Zeile 34 vs. existierender Hook
**Problem:** Story referenziert `KRAEFTE_QUERY_KEYS.personen()` aber existierender Hook nutzt `EINSATZ_QUERY_KEYS.personen()`.

**Risk:** Wenn Entwickler neuen Hook mit KRAEFTE_QUERY_KEYS erstellt, könnten Cache-Invalidierungen nicht synchron sein.

**Recommendation:**
Füge expliziten Hinweis hinzu:
```markdown
### Wichtiger Hinweis: Query Key Alignment

Der existierende `useEinsatzPersonen` Hook nutzt `EINSATZ_QUERY_KEYS.personen()`.
Für Cache-Konsistenz:
1. Bei Wiederverwendung: EINSATZ Keys verwenden
2. Bei Neuerstellung: Sicherstellen dass beide Keys invalidiert werden
```

---

## Partial Items

### ⚠ PARTIAL 1: Hook-Entscheidungslogik unvollständig

**Current:** Task 1 sagt "Prüfe ob existiert... Falls nein: Erstelle"
**Missing:** "Falls ja: [konkrete Handlungsanweisung]"
**Fix:** Hinzufügen von Option für "Falls ja: Importiere/Re-exportiere"

---

### ⚠ PARTIAL 2: Empty State fehlt

**Current:** Loading State dokumentiert (Zeilen 246-252)
**Missing:** Was passiert wenn `personen?.length === 0`?
**Fix:** Hinzufügen:
```typescript
if (personen && personen.length === 0) {
  return (
    <div className="text-gray-500 text-sm">
      Keine Personen registriert. Registrieren Sie zuerst Einsatzkräfte.
    </div>
  );
}
```

---

### ⚠ PARTIAL 3: Accessibility Details fehlen

**Current:** Komponente hat `label`, `error` Props
**Missing:**
- `aria-describedby` für helperText
- `aria-invalid` bei Error
- `role="combobox"` explizit erwähnt

**Fix:** Hinzufügen in Komponenten-Vorlage

---

## Recommendations

### 1. Must Fix (Critical)

1. **Hook-Wiederverwendung klar machen:**
   - Explizit sagen: "useEinsatzPersonen aus einsatz Feature importieren, NICHT neu erstellen"
   - Oder Re-Export Pattern dokumentieren

2. **Query Key Konsistenz sicherstellen:**
   - Entscheidung treffen: EINSATZ oder KRAEFTE Keys
   - Cache-Invalidierung dokumentieren

### 2. Should Improve (Important)

1. **Empty State hinzufügen:**
   - UI für "Keine Personen registriert" Fall

2. **Accessibility verbessern:**
   - aria-* Attribute in Vorlage

3. **Task 1 If-Else komplett machen:**
   - "Falls ja" Pfad dokumentieren

### 3. Consider (Nice to Have)

1. **Error Handling für API-Fehler in Picker:**
   - Was wenn API 403/500 zurückgibt?

2. **Keyboard Navigation erwähnen:**
   - Arrow Keys, Enter, Escape Verhalten

3. **Performance Hinweis:**
   - "Alle Personen werden geladen (< 50 typisch), Client-seitige Filterung optimal"

---

## Overall Assessment

**Story Quality:** GOOD (82%)

Die Story ist gut strukturiert mit detaillierten Code-Vorlagen und klaren Acceptance Criteria. Die kritischen Issues betreffen primär die **Wiederverwendung existierender Infrastruktur** - ein typisches LLM-Fehler-Muster.

**Empfehlung:** Story mit den 2 Critical Fixes aktualisieren bevor Entwicklung beginnt.

---

## Subagent Analysis Summary

| Agent ID | Focus | Key Findings |
|----------|-------|--------------|
| a446f0a | Codebase Validation | MVP-Input Zeilen 155-176 ✅, Combobox existiert ✅, Query Key existiert ✅ |
| abb0d94 | API Integration | Endpoint existiert ✅, DTO korrekt ✅, Methodenname korrekt ✅ |
| ae5a831 | UI Pattern Analysis | PersonHinzufuegenDialog Pattern ✅, molecules Struktur ✅, TanStack Form Pattern ✅ |
| aece17d | Previous Story Intel | td2-dialog-integration Learnings ✅, KraefteDashboard Integration ✅, Error Codes ✅ |

---

**Report generated by:** SM Agent (Bob) via validate-workflow.xml
**Validation timestamp:** 2026-01-01T15:30:00Z

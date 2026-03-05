# ADR-003: Gitmoji Source of Truth für Commit-Validierung

## Status

Akzeptiert (2026-03-05)

## Kontext

Bluelight Hub erzwingt ein strukturiertes Commit-Format über den `commit-msg`-Hook. Die erlaubten Emojis waren bisher mehrfach hart kodiert:

- `.husky/commit-msg`
- `scripts/commit-helper.sh`

Dadurch entstanden Pflegeaufwand und Drift-Risiken. Gleichzeitig soll der Check streng bleiben und nicht nur lokal, sondern auch in CI durchgesetzt werden.

Zusätzlich war offen, ob die Release-Logik in `.releaserc.js` angepasst werden muss.

## Entscheidung

Wir führen eine zentrale, verbindliche Quelle für erlaubte Commit-Emojis ein.

1. **Externe Source of Truth:**
   - `https://raw.githubusercontent.com/carloscuesta/gitmoji/master/packages/gitmojis/src/gitmojis.json`
2. **Lokale Laufzeitquelle im Repository:**
   - `scripts/gitmojis.snapshot.json`
3. **Zentraler Validator:**
   - `scripts/gitmoji-commit-validator.mjs`
   - nutzt ausschließlich den lokalen Snapshot
   - validiert Format `<emoji>(<scope>): <message>`
   - behält Scope-Regel `[a-zA-Z0-9-]+`
   - toleriert Unterschiede beim Variation Selector `\uFE0F` (z. B. `♻` und `♻️`)
   - erzwingt weiterhin `max 72` Zeichen in der ersten Zeile
4. **Durchsetzungsebenen:**
   - lokal: `.husky/commit-msg`
   - serverseitig: CI-Job für Commit-Range-Validierung
5. **Automatische Aktualität:**
   - wöchentlicher GitHub-Workflow erzeugt bei Snapshot-Änderungen automatisch einen PR
6. **Release-Konfiguration bleibt unverändert:**
   - `.releaserc.js` wird **nicht** angepasst
   - zusätzliche zulässige Emojis erweitern nur die Commit-Validierung, nicht die Version-Bump-Logik

## Alternativen

### 1. Weiterhin harte Whitelists im Hook/Helper

**Vorteile:** Keine Netzabhängigkeit, einfache Implementierung.  
**Nachteile:** Hohe Drift-Gefahr, doppelte Pflege, schlechte Nachvollziehbarkeit.

**Entscheidung:** Abgelehnt.

### 2. Live-HTTP-Abfrage im `commit-msg`-Hook

**Vorteile:** Immer aktuell.  
**Nachteile:** Netzabhängig, unzuverlässig offline, langsamer Commit-Flow.

**Entscheidung:** Abgelehnt.

### 3. Nur lokaler Hook ohne CI-Gate

**Vorteile:** Einfach.  
**Nachteile:** Umgehbar (`--no-verify`, Web-Commits), keine verbindliche Server-Durchsetzung.

**Entscheidung:** Abgelehnt.

## Konsequenzen

### Positiv

- Eine einzige, transparente Quelle für erlaubte Emojis.
- Konsistente Validierung in Hook, CI und Commit-Helper.
- Offline-stabile lokale Commits (kein HTTP zur Commit-Zeit).
- Automatische, nachvollziehbare Updates per Bot-PR.

### Negativ / Trade-offs

- Zusätzliche Maintenance-Skripte (`sync`, `range-check`, Validator).
- Neuer CI-Job kann fehlschlagen, wenn historische/ungeprüfte Commits im Range liegen.

### Risiken und Mitigation

- **Upstream-Format ändert sich.**  
  Mitigation: strikte Payload-Validierung im Sync-Skript, klarer Fehler mit Exit-Code.
- **Snapshot driftet.**  
  Mitigation: wöchentlicher Bot-PR + `pnpm gitmoji:check`.

## Umsetzungsnotizen

- Neue Skripte:
  - `scripts/sync-gitmojis.mjs`
  - `scripts/gitmoji-commit-validator.mjs`
  - `scripts/check-commit-range.mjs`
  - `scripts/commit-helper.mjs`
- Neue CI-Automation:
  - `.github/workflows/gitmoji-sync.yml`
- Anpassungen:
  - `.husky/commit-msg`
  - `.github/workflows/ci.yml`
  - `scripts/commit-helper.sh`
  - `docs/project-documentation/05-entwicklungshandbuch.md`
  - `.husky/README.md`

## Referenzen

- [Gitmoji Source JSON](https://raw.githubusercontent.com/carloscuesta/gitmoji/master/packages/gitmojis/src/gitmojis.json)
- [Gitmoji Repository](https://github.com/carloscuesta/gitmoji)

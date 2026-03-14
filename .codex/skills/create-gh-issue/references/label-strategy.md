# Label-Strategie

Die Labels zuerst live aus GitHub laden:

```bash
gh label list --limit 200
```

Nur Labels verwenden, die im aktuellen Repository tatsächlich existieren. Keine ähnlichen Varianten erfinden.

## Auswahlreihenfolge

1. 1 primäres Typ-Label wählen, wenn das Repository eine klare Entsprechung hat.
2. 1 bis 2 Scope-Labels für Stack, Oberfläche oder Subsystem wählen.
3. 0 bis 2 Domänen-Labels wie `bereich:*` oder `modul-seite` wählen.
4. 0 bis 1 Dringlichkeits- oder Risiko-Label wählen.
5. 0 bis 1 Qualifizierungs-Label wählen, wenn es echten Zusatznutzen bringt.

Meist bei insgesamt 2 bis 5 Labels stoppen.

## Aktuelle Label-Familien im Repo

Das sind Beispiele aus der aktuellen Repo-Taxonomie. Vor Verwendung trotzdem live neu prüfen.

### Type Labels

- `bug`
- `enhancement`
- `documentation`
- `epic`
- `technical-debt`
- `question`
- `audit`

### Scope / Stack Labels

- `frontend`
- `backend`
- `api`
- `ui/ux`
- `ux`
- `infrastructure`
- `integration`
- `security`
- `performance`
- `mobile`
- `tauri`
- `testing`
- `ci`
- `ci/cd`
- `tools`
- `configuration`
- `deployment`
- `dependencies`
- `code-quality`
- `architecture`
- `ddd`
- `agents`
- `tanstack-query`
- `authentication`
- `auth`
- `availability`
- `health-check`

### Domain Labels

- `bereich:führung`
- `bereich:kommunikation`
- `bereich:übersicht`
- `bereich:kräfte`
- `bereich:sicherheit`
- `bereich:betreuung`
- `bereich:logistik`
- `bereich:patienten`
- `bereich:uav`
- `modul-seite`

### Priority / Risk Labels

- `high-priority`
- `blocker`
- `breaking-change`

## Zuordnungsheuristiken

- Feature / User Story:
  - `enhancement` bevorzugen.
  - Stack- und Domänen-Labels ergänzen, die beschreiben, wo der Nutzen landet.
- Bug:
  - `bug` bevorzugen.
  - Den betroffenen Bereich ergänzen, zum Beispiel `frontend`, `backend`, `api`, `tauri`, `mobile` oder `ui/ux`.
- Tech Debt / Refactor:
  - `technical-debt` bevorzugen, wenn technische Schuld der Kernpunkt ist.
  - `refactor`, `refactoring`, `code-quality` oder `architecture` nur ergänzen, wenn sie das Problem schärfen statt zu duplizieren.
- Research / Spike:
  - `question` bevorzugen, wenn das Issue primär eine unbekannte Frage beantworten soll.
  - `audit` für evaluative Arbeit und `architecture` für Design-Trade-offs ergänzen.
- Documentation:
  - `documentation` bevorzugen.
  - `architecture` oder Subsystem-Labels ergänzen, wenn die Doku zu einem klaren Bereich gehört.
- Chore / Ops:
  - Das konkreteste operative Label bevorzugen, etwa `tools`, `configuration`, `deployment`, `dependencies`, `ci`, `ci/cd` oder `infrastructure`.
- Epic:
  - `epic` bevorzugen.
  - Nur die breitesten Scope-Labels ergänzen, die beim Routing helfen.

## Vermeiden

- Triage-Labels wie `duplicate`, `invalid` oder `wontfix` für neu angelegte Arbeit nicht verwenden, außer der Nutzer verlangt ausdrücklich Triage.
- Nahe Dubletten nicht kombinieren, außer sie drücken wirklich verschiedene Dimensionen aus.
- Issues nicht mit allen theoretisch passenden Labels überladen.

## Beispiele

- Neue Dashboard-Seite für Lageübersicht:
  - `enhancement`, `frontend`, `bereich:übersicht`, `modul-seite`
- Tauri-spezifischer Sync-Bug:
  - `bug`, `frontend`, `tauri`
- Bereinigung der Query-Invalidierung bei Reminder-API-Nutzung:
  - `technical-debt`, `frontend`, `tanstack-query`
- ADR für den Authentication-Ansatz:
  - `documentation`, `architecture`, `authentication`

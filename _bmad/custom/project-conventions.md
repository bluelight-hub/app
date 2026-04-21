# Bluelight Hub — BMad Projekt-Konventionen

> **Zweck:** Single Source of Truth für projektweite Konventionen, denen alle
> BMad-Workflows (insb. BMM: `bmad-create-story`, `bmad-sprint-planning`,
> `bmad-dev-story`) folgen sollen.
>
> **Ablage:** `_bmad/custom/project-conventions.md` — offizieller Ort gemäß
> [BMad Customize-Doku](https://docs.bmad-method.org/how-to/customize-bmad/).
> Überlebt `bmad update`.
>
> **Referenzierung:** Via `[modules.bmm].project_conventions` in
> `_bmad/custom/config.toml`.

---

## 1. Story-Key-Konvention

### Format

```
{gh-issue-nr}-{epic}-{story}-{kebab-title}
```

### Beispiele

| Situation                               | Story-Key                                                    |
| --------------------------------------- | ------------------------------------------------------------ |
| Branch `415-eigenschutz-...`, Story 1.1 | `415-1-1-plattform-push-notifications-backend-adr-011`       |
| Branch `415-eigenschutz-...`, Story 1.2 | `415-1-2-plattform-push-clients-service-worker-tauri-bridge` |
| Branch `999-neues-feature`, Story 1.1   | `999-1-1-irgendein-titel`                                    |

### Ableitung des Präfix

Der Präfix `{gh-issue-nr}` entspricht der GitHub-Issue-Nummer des aktuellen
Feature-Branches. Sie wird aus dem Branch-Namen extrahiert:

```bash
git branch --show-current
# Ausgabe z. B.: 415-eigenschutz-einsatzkraefte-sicherheit-psa
```

Die führende Zahl vor dem ersten `-` ist die Issue-Nummer (Regex: `^(\d+)-`).

### Fehler-Fälle (HALT)

| Branch                          | Verhalten                                      |
| ------------------------------- | ---------------------------------------------- |
| `415-feature-xyz`, `999-bugfix` | ✅ Präfix = `415` bzw. `999`                   |
| `alpha`, `main`, `develop`      | ❌ **HALT** — keine Stories auf Hauptbranches  |
| `fix-tauri-bug`, `hotfix`       | ❌ **HALT** — ohne Issue-Präfix nicht zulässig |
| Detached HEAD                   | ❌ **HALT**                                    |

Fehler-Meldung (empfohlen):

> "Story-Erstellung nur auf Issue-Branches (`<nummer>-<beschreibung>`) zulässig.
> Aktueller Branch `<branch>` hat kein führendes Zahlen-Präfix.
> Branch wechseln oder Branch entsprechend umbenennen."

### Epic-Keys

Epic-Keys bleiben **ohne Präfix** (`epic-1`, `epic-2`, ..., `epic-N`).
Der Scope ist bereits durch den Branch impliziert — das Präfix würde nur Rauschen
erzeugen. Retrospektiv-Keys analog: `epic-1-retrospective`.

### Begründung

PRDs leben pro Branch/Issue in `_bmad-output/planning-artifacts/`. Ohne Präfix
kollidieren Story-IDs, wenn zwei Issues beide mit Story `1.1` starten. Der
Präfix erzeugt globale Eindeutigkeit und macht Keys grepbar (`grep "^415-"`).

---

## 2. Aufnahme in `project-context.md`

Sobald via `bmad-generate-project-context` eine `project-context.md` generiert
wird, ist die Story-Key-Konvention dort aufzunehmen (BMM-Skills laden
`project-context.md` automatisch). Diese Datei (`project-conventions.md`)
bleibt dennoch als Referenz erhalten.

---

## 3. Aktivierungs-Status

Dieser Override folgt dem offiziellen BMad-Customize-Pattern. Die aktuelle
BMad-Version (6.3.0) hat für BMM-Skills noch keinen integrierten
Resolver-Aufruf — die Override-Wirksamkeit kommt:

1. **Sofort** durch manuelle Referenzierung (Orchestrator liest diese Datei),
2. **Automatisch**, sobald BMM-Skills einen Resolver-Aufruf erhalten (zukünftige
   BMad-Version oder via lokalem Workflow-Patch).

Bis dahin ist diese Datei **die verbindliche Referenz** für jeden Agent, der
Story-Keys generiert oder parst.

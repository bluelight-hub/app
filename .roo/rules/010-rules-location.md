---
description: REJECT .md files outside .roo/rules and SUGGEST moving them there
globs: *.md
alwaysApply: false
---

# Rule Location Enforcement

## Context
- Alle `.md`-Dateien müssen im Verzeichnis `.roo/rules/` liegen
- Gilt beim Anlegen neuer Rule-Dateien und beim Verschieben vorhandener

## Requirements
1. **Pflichtverzeichnis**
   - `.md`-Dateien **nur** unter `.roo/rules/` ablegen
2. **Naming**
   - `PREFIX-name.md` (z. B. `000-rule-creation-standards.md`)
3. **Verstöße**
   - Automatisch zurückweisen (REJECT), wenn `.md`-Datei außerhalb `.roo/rules/` angelegt wird
4. **Konflikte**
   - Falls existierende `.md`-Datei nicht in `.roo/rules/` liegt, umgehend verschieben

## Examples

<example>
description: REJECT .md files that are not in .roo/rules
globs: "*"

# Rule Location Enforcement

## Context
- Must place new rules inside .roo/rules
</example>

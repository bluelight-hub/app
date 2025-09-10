# Husky Git Hooks

Diese Verzeichnis enthält alle Git Hooks für das Bluelight-Hub Projekt.

## 🚀 Automatische Installation

Husky installiert die Git Hooks automatisch bei:

- `npm install`
- `pnpm install`
- `yarn install`

Dies geschieht über das `prepare` Script in der `package.json`.

## 📋 Verfügbare Hooks

### `commit-msg`

**Zweck:** Validiert Commit-Nachrichten nach den Projektstandards

**Was wird geprüft:**

- ✅ Korrekte Emoji + Context Format: `✨(frontend): Beschreibung`
- ✅ Maximale Länge der ersten Zeile (72 Zeichen)
- ⚠️ Warnung bei einzeiligen Commits für substantielle Änderungen
- ❌ Lehnt falsche Formate komplett ab

**Referenz:** Siehe `.cursor/rules/030-commit-rules.mdc`

### `pre-commit`

**Zweck:** Führt alle Tests vor jedem Commit aus

**Was passiert:**

- Führt `pnpm test` für alle Packages aus
- Verhindert Commits wenn Tests fehlschlagen
- Stellt Code-Qualität sicher

## 🔧 Hook-Bypass (Notfälle)

```bash
# Hook umgehen (nur in Ausnahmefällen!)
git commit --no-verify -m "emergency fix"
git push --no-verify
```

## 🛠️ Hook-Entwicklung

### Hook bearbeiten

```bash
# Hook-Datei bearbeiten
nano .husky/commit-msg

# Ausführbar machen
chmod +x .husky/commit-msg
```

### Hook testen

```bash
# Commit-msg Hook testen
echo "test message" | .husky/commit-msg /dev/stdin

# Pre-commit Hook testen
.husky/pre-commit
```

### Hook hinzufügen

```bash
# Neuen Hook erstellen
pnpx husky add .husky/pre-push "pnpm build"
```

## 📖 Weitere Informationen

- **Husky Dokumentation:** https://typicode.github.io/husky/
- **Commit Standards:** `.cursor/rules/030-commit-rules.mdc`
- **Commit Helper:** `git commit-helper` für interaktive Commits

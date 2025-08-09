# Git Commit erstellen

Erstelle einen professionellen Git Commit mit perfekter Commit-Message nach den Projekt-Standards.

## Schritte:

1. **Status prüfen**: Führe parallel aus:
   - `git status` - Zeige alle ungetrackten Dateien
   - `git diff` - Zeige staged und unstaged Änderungen
   - `git log --oneline -5` - Zeige letzte Commits für Stil-Referenz

2. **Änderungen analysieren**:
   - Identifiziere Art der Änderungen (Feature, Fix, Refactoring, etc.)
   - Prüfe auf sensitive Informationen
   - Bestimme das passende Emoji und den Kontext

3. **Commit vorbereiten**:
   - Stage relevante Dateien mit `git add`
   - Erstelle Commit-Message im Format: `<emoji>(<context>): <title>`

   **Emoji-Auswahl:**
   - 💥 Breaking Changes (Major Version)
   - ✨ Neue Features (Minor Version)
   - 🐛 Bug Fixes (Patch Version)
   - 🚑 Critical Hotfixes
   - 🔒 Security Fixes
   - ♻️ Code Refactoring
   - 🔧 Configuration Changes
   - 📝 Documentation
   - ✅ Tests
   - 🎨 UI/Style Updates

4. **Commit erstellen** mit HEREDOC für korrekte Formatierung:

   ```bash
   git commit -m "$(cat <<'EOF'
   <emoji>(<context>): <title>

   <optional detailed description>
   EOF
   )"
   ```

5. **Verifizieren**:
   - `git status` - Bestätige erfolgreichen Commit
   - Bei Pre-commit Hook Änderungen: Commit erneut ausführen

## Wichtige Regeln:

- Denke nach, verwende dabei `ultrathink`
- NIEMALS `--no-verify` verwenden
- Bei fehlenden Änderungen keinen leeren Commit erstellen
- Commit-Message auf Englisch verfassen
- Imperative Mood verwenden ("Add" nicht "Added")
- Titel: 50-72 Zeichen
- Body: Optional, nach Leerzeile
- Schlagen Tests fehl, orientiere dich an folgendem Vorgehen:
  - Simple Fixes & Linting: Direkt beheben
  - Komplexe Fixes & Linting: Zurückmelden und Commit abbrechen

## Beispiele für die erste Zeile der Commit-Message:

- `✨(frontend): Add user dashboard`
- `🐛(backend): Fix database connection timeout`
- `♻️(shared): Refactor date utility functions`
- `💥(api): Change response format to nested structure`

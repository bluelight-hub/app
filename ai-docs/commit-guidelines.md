# Commit Message Guidelines

## Format

```
<emoji>(<context>): <kurze, prägnante Nachricht>

<zusätzliche Beschreibung, falls nötig>
- <detaillierter Stichpunkt 1>
- <detaillierter Stichpunkt 2>
- <detaillierter Stichpunkt 3>

<optional: 💥 BREAKING CHANGE>
```

## Mehrzeilige Messages (OBLIGATORISCH)

- **OBLIGATORISCH** für substantielle Änderungen (>3 Dateien oder >50 Zeilen)
- Verwende eine temporäre Datei (z. B. `commit-message.txt`)
- Lösche sie nach dem Commit
- Git Hook validiert automatisch Format und Länge

## Emojis & Semantic Versioning

### Major (Breaking Changes)

- 💥 (boom) - Breaking Changes, inkompatible API-Änderungen

### Minor (New Features)

- ✨ (sparkles) - Neue Features oder größere Verbesserungen

### Patch (Fixes und Verbesserungen)

- 🐛 (bug) - Bugfixes
- 🚑 (ambulance) - Kritische Hotfixes
- 🔒 (lock) - Sicherheitsverbesserungen
- 🧹 (broom) - Code-Bereinigung, Entfernen von Legacy-Code
- ♻️ (recycle) - Refactoring ohne Funktionsänderung
- 🔧 (wrench) - Konfigurationsänderungen, Tooling-Updates

### Zusätzliche Emojis

- 📦 (package) - Dependencies aktualisieren
- 📝 (memo) - Dokumentation aktualisieren
- 💄 (lipstick) - UI/Styling-Verbesserungen
- ⚡ (zap) - Performance-Verbesserungen
- 🗑 (wastebasket) - Entfernen von Dateien oder Code
- 🛠 (hammer_and_wrench) - Entwicklungs-Tools oder Skripte
- 🚀 (rocket) - Deployment oder Performance-Verbesserungen
- 🎉 (tada) - Initiale Commits oder Meilensteine

## Kontext

- z. B. `frontend`, `backend`, `shared`, `deps`, `docs` usw.
- Sollte den Bereich des Projekts klar identifizieren
- Bei globalen Änderungen: `global`, `project` oder `repo`

## Detaillierte Stichpunkte

- Füge nach der Hauptnachricht eine Liste mit detaillierten Stichpunkten hinzu
- Beschreibe **was** geändert wurde und **warum**
- Beginne jeden Stichpunkt mit einem Verb im Präsens
- Vermeide vage Beschreibungen wie "Fixes" oder "Updates"
- Verweise auf relevante Issue-Nummern mit # (z.B. #123)
- Halte jeden Stichpunkt auf maximal eine Zeile begrenzt

## Beispiele

### Richtig

```
✨(frontend): Neue Kartenfunktion für Einsatzplanung

Implementiert eine interaktive Karte zur besseren Visualisierung.
- Fügt OpenStreetMap-Integration für realtime-Tracking hinzu
- Optimiert die Darstellung für mobile Geräte
- Verbessert die Performance durch Caching von Geo-Daten
- Unterstützt das Hinzufügen von Custom-Markern #42
```

### Richtig mit Breaking Change

```
💥(api): Ändere Authentifizierungs-Endpunkte

Die OAuth-Implementierung wurde komplett überarbeitet.
- Entfernt veraltete Basic-Auth Endpoints
- Implementiert moderne OAuth2-Flows mit PKCE
- Fügt Refresh-Token-Rotation für erhöhte Sicherheit hinzu
- Reduziert Token-Lebensdauer auf 15 Minuten

💥 BREAKING CHANGE: Alle Clients müssen aktualisiert werden, um den neuen Auth-Flow zu nutzen
```

### Falsch

```
# Falsch - zu vage
add stuff

# Falsch - fehlt Kontext
✨: Neue Features
```

## Semantic Release Integration

Diese Commit-Konventionen werden von unserem Semantic Release System genutzt, um automatisch die Versionsnummer zu erhöhen und Release Notes zu generieren. Die Emojis bestimmen dabei die Art des Releases:

- Major (Breaking): Inkompatible API-Änderungen (💥)
- Minor: Neue Features (✨)
- Patch: Bugfixes und kleine Verbesserungen (🐛, 🚑, 🔒, 🧹, ♻️, 🔧)

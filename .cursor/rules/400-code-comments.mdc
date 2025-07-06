---
description: 
globs: 
alwaysApply: true
---

# Richtlinien für effektive Code-Kommentare

## Context
- Gilt für alle Code-Dateien im Projekt
- Verbessert Lesbarkeit, Wartbarkeit und Wissenstransfer
- Besonders wichtig für komplexe Teile der Anwendung

## Requirements

1. **Kurz und präzise**
   - Klare, einfache Formulierungen verwenden
   - Unnötige Details vermeiden
   - Eine Zeile pro Kommentar bevorzugen

2. **Zweck erläutern**
   - Code kommentieren, der nicht selbsterklärend ist
   - "Warum" statt "Was" erklären
   - Entscheidungen und Überlegungen dokumentieren

3. **Aktualität sicherstellen**
   - Kommentare bei Code-Änderungen aktualisieren
   - Veraltete Kommentare entfernen
   - Versionsinformationen bei Bedarf hinzufügen

4. **Redundanz vermeiden**
   - Nicht das Offensichtliche neu formulieren
   - Keine Wiederholung von Variablen- oder Funktionsnamen
   - Kein "Code-Echo" (z.B. "// Füge 1 hinzu" für `count += 1`)

5. **Komplexität hervorheben**
   - Komplexe Algorithmen erklären
   - Workarounds und Hacks dokumentieren
   - Wichtige Randbedingungen und Edge Cases kommentieren

6. **Einheitlicher Stil**
   - Konsistente Formatierung
   - Einheitliche Sprache (Deutsch für Kommentare und JSDoc-Dokumentation)
   - Code, Variablen- und Funktionsnamen bleiben auf Englisch
   - Gleichbleibender Ton im ganzen Projekt

7. **Kontext liefern**
   - Links zu externen Ressourcen oder Dokumentationen
   - Referenzen zu Ticket-Nummern oder Pull Requests
   - Hinweise auf verwandte Codestellen

8. **TODOs kennzeichnen**
   - Format: `// TODO: Beschreibung des Problems`
   - Format: `// FIXME: Beschreibung des zu behebenden Fehlers`
   - Bei Bedarf Ticket-Referenzen hinzufügen

9. **Sinnvoller Ort**
   - Kommentare nahe am zugehörigen Code platzieren
   - Block-Kommentare über dem zu erklärenden Code
   - Inline-Kommentare nur für kurze Hinweise

10. **JSDoc für alle Klassen und Methoden**
   - Jede Klasse muss mit JSDoc-Kommentar dokumentiert werden
   - Jede Methode muss mit JSDoc-Kommentar dokumentiert werden
   - Parameter, Rückgabewerte und mögliche Fehler dokumentieren
   - Bei komplexen Methoden Beispiele hinzufügen
   - JSDoc-Kommentare bei Änderungen aktualisieren
   - JSDoc-Beschreibungen und Erklärungen MÜSSEN auf Deutsch sein
   - Technische Bezeichner in @param, @returns etc. bleiben auf Englisch

## Examples

```tsx
// Gutes Beispiel

/**
 * Berechnet die optimale Route basierend auf aktueller Position,
 * Verkehrslage und Nutzerpräferenzen.
 * Verwendet den A*-Algorithmus mit Gewichtung für Staus.
 * 
 * @see https://github.com/org/repo/issues/123 für detaillierte Diskussion
 */
function calculateOptimalRoute(start, end, preferences) {
  // Spezialfall: Start und Ziel identisch
  if (start.equals(end)) return [];
  
  // FIXME: Bei mehr als 100 Wegpunkten wird der Algorithmus ineffizient
  // Ticket: BLH-456
  
  // Implementierung des modifizierten A* mit Verkehrsdaten
  // ...
}
```

```tsx
// Schlechtes Beispiel

// Diese Funktion berechnet eine Route
function calcRoute(a, b, c) {
  // Prüfe ob a gleich b ist
  if (a.equals(b)) return [];  // Leeres Array zurückgeben
  
  // Berechne die Route
  // ...
  
  // Gebe das Ergebnis zurück
  return result;
}
```

## JSDoc-Beispiele

```tsx
/**
 * Verwaltet die Benutzerauthentifizierung und -autorisierung.
 * Verantwortlich für Login, Logout und Berechtigungsprüfungen.
 * 
 * @class AuthenticationManager
 * @see UserService für Benutzeroperationen
 */
class AuthenticationManager {
  /**
   * Authentifiziert einen Benutzer mit seinen Anmeldedaten.
   * Validiert die Eingaben und generiert ein JWT-Token bei erfolgreicher Anmeldung.
   * 
   * @param {string} username - Der Benutzername oder die E-Mail-Adresse
   * @param {string} password - Das unverschlüsselte Passwort
   * @returns {Promise<AuthResult>} Authentifizierungsergebnis mit Token bei Erfolg
   * @throws {AuthenticationError} Bei ungültigen Anmeldedaten oder gesperrtem Konto
   * @example
   * const authResult = await authManager.login('user@example.com', 'password123');
   * if (authResult.success) {
   *   console.log('Login successful:', authResult.token);
   * }
   */
  async login(username, password) {
    // Implementierung...
  }
}
```

```tsx
/**
 * Definiert die Struktur eines Authentifizierungsergebnisses.
 * Wird von AuthenticationManager.login() zurückgegeben.
 * 
 * @interface AuthResult
 */
interface AuthResult {
  /**
   * Gibt an, ob die Authentifizierung erfolgreich war
   * @type {boolean}
   */
  success: boolean;
  
  /**
   * Das JWT-Token bei erfolgreicher Anmeldung, sonst undefined
   * @type {string|undefined}
   */
  token?: string;
  
  /**
   * Fehlermeldung bei nicht erfolgreicher Anmeldung, sonst undefined
   * @type {string|undefined}
   */
  errorMessage?: string;
}
``` 
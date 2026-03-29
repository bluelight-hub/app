# Operative Rollen-Verwaltung im Admin-Panel

**Datum:** 2026-03-28
**Status:** Genehmigt
**Branch:** 98-operative-nutzer-rollen

## Kontext

Die Backend-Infrastruktur für operative Rollen (Führungskraft, Einsatzkraft, Externe) und Stammperson-Zuweisungen ist vollständig implementiert. Es fehlt die Admin-UI, um diese Zuweisungen vorzunehmen. Das Feature wird in bestehende Admin-Seiten integriert — keine neuen Seiten.

### Bestehende Backend-Endpoints

- `PATCH /admin/users/:id/operative-role` — Operative Rolle ändern (ChangeOperativeRoleDto)
- `PATCH /admin/users/:id/stammperson` — Stammperson zuweisen/entfernen (AssignStammpersonDto)
- API-Client-Funktionen bereits generiert in `AdminApi.ts`

## Änderungen

### 1. AdminUsers-Tabelle (UsersTable.tsx)

**Neue Spalten** (nach "Rolle", vor "Status"):

| Spalte | Inhalt | Details |
|--------|--------|---------|
| Operative Rolle | Farbcodierter Badge | Gold = Führungskraft, Blau = Einsatzkraft, Grau = Externe |
| Stammperson | Name + Personalnummer | Format: "Nachname, Vorname (P-XXX)" oder "—" wenn keine |

**Warnung bei fehlender Stammperson:** FK/EK ohne zugewiesene Stammperson wird rot angezeigt: "⚠ Keine Stammperson". Externe ohne Stammperson zeigen "—" ohne Warnung (Externe brauchen keine Stammperson laut Domain-Logik `requiresStammperson()`).

**ID-Spalte entfernen** — schafft Platz. ID ist im Edit-Dialog sichtbar.

**Filter-Leiste** über der Tabelle:
- Dropdown "Operative Rolle": Alle Rollen / Führungskraft / Einsatzkraft / Externe
- Checkbox "Nur ohne Stammperson": Filtert auf User die `requiresStammperson()` erfüllen aber keine haben

### 2. EditUserDialog Details-Tab (EditUserDialog.tsx)

Bestehende Felder (Benutzername, Rolle) bleiben. Darunter:

**Trennlinie** mit Label "Operative Einstellungen"

**Operative Rolle** (Dropdown):
- Optionen: Externe (default), Einsatzkraft, Führungskraft
- Hilfetext: "Bestimmt den Zugriff auf Einsätze und operative Funktionen"
- Änderung ruft `PATCH /admin/users/:id/operative-role` auf

**Stammperson** (Combobox — bestehende Projekt-Combobox-Komponente wiederverwenden):
- Suchfeld mit Autocomplete
- Dropdown gruppiert in zwei Sektionen:
  - **"Verfügbar"**: Stammpersonen ohne User-Zuweisung, klickbar. Format: "Nachname, Vorname (P-XXX)"
  - **"Bereits zugewiesen"**: Stammpersonen mit User-Zuweisung, ausgegraut. Zeigt zugewiesenen User rechts: "→ benutzername". Aktuelle Zuweisung des bearbeiteten Users blau hervorgehoben mit "aktuell"-Label
- Hilfetext: "Führungskräfte und Einsatzkräfte benötigen eine zugewiesene Stammperson"
- Änderung ruft `PATCH /admin/users/:id/stammperson` auf
- Leer-Auswahl möglich (setzt stammpersonId auf null)

**Validierung:** Wenn operative Rolle FK/EK ist und keine Stammperson zugewiesen, wird eine Warnung angezeigt (orange Box): "⚠ Diese Rolle erfordert eine Stammperson." Speichern ist trotzdem möglich (Backend erzwingt dies nicht als Hard-Constraint).

**Speichern:** Sendet bis zu zwei API-Calls sequenziell — zuerst Rolle ändern, dann Stammperson zuweisen. Nur geänderte Felder werden gesendet. Bei Fehler in einem der Calls wird ein Fehler-Toast angezeigt und der andere Call nicht ausgeführt.

### 3. AdminStammPersonen-Tabelle (StammPersonenTable.tsx)

**Neue Spalte** "Benutzer-Account" (nach "Vorname", vor "Qualifikationen"):

| Zustand | Anzeige |
|---------|---------|
| User zugewiesen | Benutzername als blauer Link mit ↗-Icon |
| Kein User zugewiesen | "—" (grau) |

**Link-Verhalten:** Navigiert zur Admin-Users-Seite (`/admin/users`). Der verlinkte User sollte dort auffindbar sein (ggf. mit Query-Parameter für Filterung oder direkte Dialog-Öffnung — Implementierungsdetail).

**BOS-Kennung Spalte entfernen** — schafft Platz. BOS-Kennung ist im Edit-Dialog sichtbar.

**Read-only** — keine Bearbeitungsmöglichkeit von dieser Seite aus.

### 4. Backend-Anpassungen

**User-Liste Query:** Die bestehende `findAll`-Query im UserManagementController muss `operativeRole` und die zugehörige `stammperson` (mit Name und Personalnummer) im Response mitliefern, falls noch nicht der Fall.

**Stammpersonen-Liste Query:** Die bestehende Stammpersonen-Liste muss den zugewiesenen `userAccount` (mit Benutzername) mitliefern, falls noch nicht der Fall.

**Stammpersonen für Combobox:** Es wird ein Endpoint benötigt, der alle Stammpersonen mit ihrem Zuweisungsstatus (frei/zugewiesen + an welchen User) zurückgibt. Möglicherweise kann der bestehende Stammpersonen-Endpoint erweitert werden.

### 5. API-Client Regenerierung

Nach Backend-Anpassungen: `pnpm run generate-api` ausführen, um den API-Client zu aktualisieren.

## Nicht im Scope

- Keine neue Admin-Seite
- Keine Bearbeitung von der Stammpersonen-Seite aus (nur read-only Link)
- Kein Bulk-Zuweisungs-Feature
- Keine Inline-Bearbeitung in der Tabelle (nur über Edit-Dialog)

## Technische Hinweise

- **Bestehende Combobox-Komponente** wiederverwenden — keine neue UI-Komponente für das Suchfeld
- **Domain-Logik `requiresStammperson()`** für Warnung/Filter nutzen (FK/EK → ja, Externe → nein)
- **Zwei separate API-Calls** beim Speichern im Dialog (Rolle + Stammperson sind getrennte Endpoints)
- **Optimistic Updates** für Tabellen-Aktualisierung nach Speichern (Invalidierung der Query-Cache)
- **Farbkodierung** der operativen Rollen konsistent über Tabelle und Edit-Dialog

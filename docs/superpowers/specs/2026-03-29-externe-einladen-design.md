# Externe zu Einsatz einladen

**Datum:** 2026-03-29
**Status:** Genehmigt
**Branch:** 98-operative-nutzer-rollen

## Kontext

EXTERNE können aktuell keinen Einsatz sehen oder öffnen. Es gibt keinen Mechanismus, sie zu einem Einsatz hinzuzufügen. Die bestehende `EinsatzBeitrittsanfrage`-Infrastruktur (mit Status OFFEN/GENEHMIGT/ABGELEHNT) wird wiederverwendet.

## Änderungen

### 1. Backend — Einladungs-Endpoint

Neuer Endpoint auf dem Beitrittsanfrage-Controller:

**`POST /einsatz/:einsatzId/beitrittsanfragen/einladen`**
- Guard: JwtAuthGuard + OperativeRoleGuard (nur FUEHRUNGSKRAFT)
- Body: `{ userId: string }`
- Validierung:
  - User existiert
  - User hat operative Rolle `EXTERNE`
  - Keine bestehende aktive Beitrittsanfrage für diesen Einsatz+User
- Erstellt `EinsatzBeitrittsanfrage` mit:
  - `status: GENEHMIGT`
  - `resolvedBy: FK-UserId` (einladende FK)
  - `resolvedAt: now()`
- Response: Die erstellte Beitrittsanfrage

**`DELETE /einsatz/:einsatzId/beitrittsanfragen/:userId`**
- Guard: JwtAuthGuard + OperativeRoleGuard (nur FUEHRUNGSKRAFT)
- Setzt bestehende genehmigte Beitrittsanfrage auf Status `ABGELEHNT`
- Validierung: Anfrage existiert und ist `GENEHMIGT`
- Response: Die aktualisierte Beitrittsanfrage

### 2. Backend — Einsatz-Liste für EXTERNE

Der `GetAllEinsaetzeQuery`-Handler filtert Einsätze nach operativer Rolle. Aktuell werden EXTERNE komplett ausgeschlossen. Anpassung:

- Wenn User `EXTERNE` ist: Nur Einsätze zurückgeben, für die eine genehmigte `EinsatzBeitrittsanfrage` existiert
- Der Handler benötigt dafür die `userId` als Parameter (wird aus dem Controller durchgereicht)
- Join auf `EinsatzBeitrittsanfrage` mit `WHERE userId = :userId AND status = 'GENEHMIGT'`

### 3. Frontend — "Externe einladen" im Einsatz-Dashboard

**Sichtbarkeit:** Nur für Führungskräfte (FK) im aktiven Einsatz-Dashboard.

**Button:** "Externe einladen" — öffnet Dialog.

**Dialog:**
- Combobox (bestehende Headless-Komponente) mit allen Usern die operative Rolle `EXTERNE` haben
- Format: "Benutzername"
- Bereits eingeladene User (genehmigte Beitrittsanfrage für diesen Einsatz) ausgegraut mit Label "Bereits eingeladen"
- Bestätigung-Button: "Einladen"
- Nach erfolgreicher Einladung: Toast "Externe Person eingeladen"

**Einladung widerrufen:** In der Teilnehmer-/Eingeladenen-Übersicht ein "Einladung widerrufen" Button pro eingeladenem EXTERNE.

### 4. Frontend — Einsatz-Liste für EXTERNE

`useOperativeRole` bleibt unverändert (`canAccessEinsatzList = false` für EXTERNE).

Stattdessen wird die Einsatz-Liste-Komponente erweitert:
- Prüfung: Hat der EXTERNE genehmigte Beitrittsanfragen? (neuer Query-Hook)
- Wenn ja: Einsatz-Liste anzeigen (nur eingeladene Einsätze, Backend filtert)
- Wenn nein: Bestehender "Kein Zugang"-Hinweis bleibt

### 5. Backend — Lesezugriff für eingeladene EXTERNE

`ensureEinsatzAccess` prüft bereits auf genehmigte Beitrittsanfragen. Keine Änderung nötig — ein eingeladener EXTERNE hat automatisch Lesezugriff auf `findOne` und `getEinsatzDetails`.

### 6. Datenmodell

Kein neues Modell. Wiederverwendung von `EinsatzBeitrittsanfrage`:

```
EinsatzBeitrittsanfrage {
  einsatzId   String
  userId      String         // Der eingeladene EXTERNE
  status      GENEHMIGT      // Direkt genehmigt (= Einladung)
  resolvedBy  String         // FK die eingeladen hat
  resolvedAt  DateTime       // Einladungszeitpunkt
  createdAt   DateTime
}
```

Unique Constraint `@@unique([einsatzId, userId])` verhindert Doppel-Einladungen.

## Nicht im Scope

- Kein Einladungs-Link/Code-System
- Keine Benachrichtigungen (Push/E-Mail) für den EXTERNE
- Keine Bulk-Einladung (ein User pro Aktion)
- EXTERNE bekommt keinen Auto-Join mit Stammperson
- Kein Einladungs-Ablaufdatum

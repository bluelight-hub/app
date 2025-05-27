---
description: 
globs: docs/architecture/adr/*.adoc
alwaysApply: false
---

# Standardformat für Architecture Decision Records

## Context
- Gilt für alle Architecture Decision Records (ADRs) im `adr/`-Ordner
- Sichert einheitliche Dokumentation und Nachvollziehbarkeit von Architekturentscheidungen
- Erleichtert Verständnis und Wartung der Architektur

## Requirements

1. **Dateistruktur**
   - Ablage unter `adr/`
   - Dateiname: `NNN-kurztitel.adoc`, wobei NNN eine fortlaufende Nummer ist (z.B. `001-verbindungskonzept.adoc`)
   - Format: AsciiDoc (`.adoc`)

2. **Dokumentstruktur**
   - Überschrift Level 1: Titel der Entscheidung
   - Überschriften Level 2 für obligatorische Abschnitte

3. **Obligatorische Abschnitte**
   - **Status**: Aktueller Status der Entscheidung (Vorgeschlagen, In Prüfung, Angenommen, Abgelehnt, Ersetzt)
   - **Kontext**: Beschreibung der Situation und des Problems
   - **Optionen**: Auflistung der Lösungsalternativen
   - **Entscheidung**: Gewählte Option mit Datum
   - **Begründung**: Argumente für die getroffene Entscheidung
   - **Konsequenzen**: Auswirkungen der Entscheidung auf das System

4. **Status-Angaben**
   - Status muss eines der folgenden sein:
     - "Vorgeschlagen" oder "Proposed" (neue Entscheidung)
     - "In Prüfung" oder "Under Review" (wird evaluiert)
     - "Angenommen" oder "Accepted" (mit Datum)
     - "Abgelehnt" oder "Rejected" (mit Datum und Grund)
     - "Ersetzt" oder "Superseded" (mit Referenz auf neuere ADR)

5. **Datumsformat**
   - ISO-Format (YYYY-MM-DD)
   - Bei Statusänderungen: Datum angeben (z.B. "Angenommen (2025-03-20)")

6. **Verlinkung**
   - Verwandte ADRs verlinken: `<<NNN-kurztitel.adoc#,Titel>>`
   - Referenzierte Dokumente mit AsciiDoc-Links verknüpfen

7. **Review-Prozess**
   - Jede ADR muss von mindestens einem Architekten gereviewed werden
   - Änderungen am Status müssen dokumentiert werden

## Examples

<example>
= ADR-001: Verbindungskonzept-Architektur

== Status
Angenommen (2025-01-15)

== Kontext
Bluelight-Hub muss in Einsatzszenarien funktionieren, in denen verschiedene Konnektivitätsszenarien auftreten können. Das System muss in lokalen Netzwerken (FüKW) funktionieren und optional erweiterte Funktionen bieten, wenn Internetverbindung besteht.

== Optionen
. *Online-Optimiert mit lokalem Fallback*: Primär für Internetverbindung optimiert, bei Verbindungsverlust auf lokale Verbindung zum FüKW beschränkt.
. *Verbindungskonzept mit definierten Konnektivitätsszenarien*: System unterstützt verschiedene Szenarien: lokale Verbindung (offline), vollständige Verbindung (online) und zukünftig autonomer Modus.
. *Hybridansatz*: Teilweise Funktionalität bei lokaler Verbindung, vollständige Funktionalität nur bei Internetverbindung.

== Entscheidung
Wir haben uns für Option 2 (Verbindungskonzept mit definierten Konnektivitätsszenarien) entschieden.

== Begründung
* Hohe Zuverlässigkeit in verschiedenen Einsatzszenarien
* Konsistente Benutzererfahrung mit klaren Indikatoren für den Verbindungsstatus
* Optimierte Performance durch angepasste Datenhaltung
* Klare Definition der Funktionalität in jedem Konnektivitätsszenario

== Konsequenzen
* Komplexität bei der Verwaltung verschiedener Verbindungszustände
* Notwendigkeit einer robusten lokalen Datenhaltung im FüKW
* Erhöhter Aufwand für Tests der verschiedenen Verbindungsszenarien
* Klare Benutzerkommunikation über verfügbare Funktionen je nach Verbindungsstatus
</example>

<example type="invalid">
= ADR-002: JWT-Authentifizierung

== Kontext
Wir brauchen einen Authentifizierungsmechanismus für das System.

== Entscheidung
Wir verwenden JWT.

== Begründung
JWT ist modern und gut unterstützt.

== Probleme
- Fehlendes Statusfeld
- Keine Auflistung von Optionen
- Unzureichende Begründung
- Keine Datumsangabe bei der Entscheidung
- Fehlendes Konsequenzen-Kapitel
</example> 
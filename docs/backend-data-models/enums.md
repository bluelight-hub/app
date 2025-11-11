# Enums

## UserRole

**Beschreibung:** Benutzerrollen für Zugriffskontrolle

**Werte:**
- **SUPER_ADMIN**: Voller Systemzugriff, kann andere Admins verwalten
- **ADMIN**: Administrativer Zugriff mit Einschränkungen
- **USER**: Standard-Benutzer mit eingeschränkten Rechten

---

## EinsatzStatus

**Beschreibung:** Lifecycle-Status eines Einsatzes

**Werte:**
- **ANGELEGT**: Einsatz wurde neu angelegt
- **IN_BEARBEITUNG**: Einsatz ist aktiv in Bearbeitung
- **ABGESCHLOSSEN**: Einsatz ist abgeschlossen
- **ARCHIVIERT**: Einsatz wurde archiviert (No-Delete Policy)

---

## EtbStatus

**Beschreibung:** Status des Einsatztagebuchs

**Werte:**
- **DRAFT**: Entwurf - kann frei bearbeitet werden
- **ACTIVE**: Aktiv - wird aktiv gepflegt
- **LOCKED**: Gesperrt - keine Änderungen mehr möglich (finale Version)

---

## EtbKategorie

**Beschreibung:** DRK-konforme Kategorisierung von ETB-Einträgen

**Werte:**
- **ALARMIERUNG**: Alarmierungsmeldung
- **ANKUNFT**: Ankunft am Einsatzort
- **BEFEHL**: Befehle und Anweisungen
- **ERKUNDUNG**: Erkundungsergebnisse
- **LAGE**: Lagemeldungen
- **MASSNAHME**: Durchgeführte Maßnahmen
- **PERSONAL**: Personaländerungen
- **FAHRZEUG**: Fahrzeugbewegungen
- **MATERIAL**: Material- und Ausrüstungseinsatz
- **KOMMUNIKATION**: Kommunikation mit anderen Stellen
- **WETTER**: Wetteränderungen
- **DOKUMENTATION**: Dokumentarische Einträge (Screenshots, Fotos, Anhänge)
- **SONSTIGES**: Sonstige Einträge
- **SYSTEM**: Systemeinträge (automatisch generiert)

---

## PoiType

**Beschreibung:** Typen für Points of Interest auf der Lagekarte

**Werte:**
- **EINSATZORT**: Haupt-Alarmierungsadresse
- **EINSATZABSCHNITT**: Abschnitt A, B, C
- **EINSATZLEITUNG**: Einsatzleitstelle, Führungsstelle
- **FAHRZEUG**: Statisch platzierte Fahrzeuge
- **EINHEIT**: Statisch platzierte Einheiten
- **GEFAHRENQUELLE**: Punktuelle Gefahr (z.B. Gasleck)
- **SPERRBEREICH**: Absperrpunkt
- **VERSORGUNGSPUNKT**: Wasser, Strom, Verpflegung
- **BEREITSTELLUNGSRAUM**: Bereitstellung von Einheiten/Material
- **BEHANDLUNGSPLATZ**: Verletzten-Versorgung
- **SAMMELSTELLE**: Betroffenen-/Helfer-Sammelpunkt
- **UNTERKUNFT**: Notunterkunft
- **SONSTIGES**: Custom POI

---

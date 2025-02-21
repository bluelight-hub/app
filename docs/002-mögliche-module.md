# Mögliche Module (erweitert)

## 1. Einsatz- und Lage-Management

### 1.1 Einsatzübersicht
- Übersicht aktueller Einsätze (inkl. Status, Art des Einsatzes, beteiligte Einheiten, Uhrzeiten)
- Zuweisung von Verantwortlichkeiten

### 1.2 Einsatztagebuch
- Chronologische Aufzeichnung aller relevanten Ereignisse
- Funkprotokoll: Dokumentation des Funkverkehrs (Zuordnung zu Opta)
- Lagemeldungen: Eingehende und ausgehende Lagemeldungen strukturiert erfassen
- Optional: Automatische Protokollierung von Funksprüchen (Sprachaufzeichnung)

### 1.3 Einsatzabschnitte
- Anlegen unterschiedlicher Einsatzabschnitte (z.B. Nord, Süd, Bereitstellungsraum)
- Zuordnung von Kräften, Material und Fahrzeugen zu einzelnen Abschnitten

### 1.4 Checklisten
- Standardisierte Abläufe für unterschiedliche Einsatzszenarien (z.B. Unwetter, MANV, Sucheinsatz)
- Möglichkeit zur Abarbeitung und Nachverfolgung von Punkten in Echtzeit

### 1.5 Wecker und Erinnerungen
- Erinnerung an anstehende Aufgaben, Fristen oder Checklisten-Schritte
- Zeitgesteuerte Alarme (z.B. „Nächste Lagebesprechung in 15 Minuten")

### 1.6 Lagekarte
- Grundlegende Funktionen: Anzeige von Einsatzorten, Ressourcen und relevanten POIs
- Historie der Änderungen (optional): Dokumentation aller Änderungen am Kartenbild
- UAV-Integration: Live-Bild oder Daten von Drohnen (z.B. zur Lageerkundung)

### 1.7 MANV-Modul (Massenanfall von Verletzten)
- Schwerpunktszenario bei Großschadenslagen
- Erfassung und Triage von Patienten inkl. Dringlichkeit, Schadenskategorie
- Koordination von Transport- und Behandlungskapazitäten

#### Erweiterungsideen (1.x)
- Automatische Lagebildaktualisierung (z.B. Wetter, Verkehr, BOS-Funk)
- Alarmszenarien & Notfallpläne

## 2. Personal- und Kräfteverwaltung

### 2.1 Einsatzkräfte-Übersicht
- Zentrale Datenbank aller verfügbaren Helfer, Qualifikationen und Rollen (Anbindung an APager möglich)
- Registrierung von Einsatzkräften: Einfache, schnelle Registrierung vor Ort (z.B. via QR-Code)

### 2.2 Stärkeübersicht
- Erfassung der An- und Abmeldung von Kräften, Schichtpläne
- Anzeige von Personalstärken pro Abschnitt und pro Qualifikation

### 2.3 Telefonbuch / Kontaktliste
- Kontaktdaten relevanter Personen und Ansprechpartner
- Kommunikationsverzeichnis (wer ist für welchen Bereich zuständig?)

### 2.4 Rettungshunde (optional)
- Spezialisierte Einheit, eigene Ressourcenverwaltung (Hundeführer, Hunde, Ausrüstung)
- Einsatzplanung, Suchrouten, Leistungsnachweise

#### Erweiterungsideen (2.x)
- Schulungs- und Qualifikationsverwaltung (Fortbildungsstände, automatische Benachrichtigung)
- Digitale Zeiterfassung (Check-In/Out-System)

## 3. Fahrzeuge und Ressourcen

### 3.1 Fahrzeugübersicht
- Liste aller eingesetzten Fahrzeuge (Funkrufnamen, Position, Besatzung, Status)

### 3.2 GPS-Positionen der Einsatzmittel
- Echtzeit-Verfolgung von Fahrzeugen und Geräten
- Optional: FMS-Integration (automatische Statusmeldung)

### 3.3 Verbrauchsdokumentation (optional)
- Erfassung von Materialverbrauch (Medizinprodukte, Kraftstoff, Verpflegung)
- Echtzeitaktualisierung der Lagerbestände

### 3.4 Generator für Taktische Zeichen
- Schnelle, normkonforme Kennzeichnung von Fahrzeugen, Einheiten und Standorten
- Ausgabe in Lagekarte oder Export für Einsatzdokumentation

#### Erweiterungsideen (3.x)
- Material- und Geräteverwaltung (Wartungsintervalle, Prüfungen)
- Fahrzeugdisposition (dynamische Planung basierend auf Einsatzanforderungen)

## 4. Patienten-, Betroffenen- und Sanitätsmanagement

### 4.1 Patienten & Betroffene
- Erfassung von Personendaten (Name, Zustand, Verletzungen, Standort)
- Dokumentation von Maßnahmen (Erstversorgung, Transportziel)

### 4.2 Sanitätsdienst (optional)
- Detaillierte Dokumentation von Behandlungsmaßnahmen
- Vernetzung mit Einsatzabschnitt „Behandlungsplatz“ oder „Patientensammelstelle“

### 4.3 MANV-Modul
*(Siehe 1.7 – kann hier integriert oder verknüpft werden)*

#### Erweiterungsideen (4.x)
- DSGVO-konforme Speicherung sensibler Daten
- Schnittstellen zu Kliniken / Leitstellen (Bettenkapazitäten, Übergaben)

## 5. Kommunikation und Funk

### 5.1 Funkkanallisten
- Übersicht aller verfügbaren Funkkanäle, Frequenzen, Zuordnungen
- Schnelle Kanalumschaltung

### 5.2 Kommunikationsverzeichnis
- Wer ist auf welchem Kanal erreichbar?
- Kontaktwege (Telefon, Messenger, BOS-Funk etc.)

### 5.3 FMS (optional)
- Automatische Statusmeldungen (Status 1-6 etc.) an Leitstelle oder Koordinationsstelle
- Verknüpfung mit Fahrzeugübersicht (Live-Statusanzeige)

#### Erweiterungsideen (5.x)
- Digitale Einsatzzentrale (Austausch von Textnachrichten, Dokumenten)
- Sprachaufzeichnung und -analyse (Archivierung von Funksprüchen)

## 6. Dokumentation, Reporting und Nachbereitung

### 6.1 Dokumentation von Ablauf und Ressourcen
- Zusammenführung von Einsatztagebuch, Verbrauchsdokumentation und Personalübersicht
- Export als PDF, Excel oder für internes Berichtswesen

### 6.2 Analyse und Nachbereitung
- Statistiken (Anzahl Einsätze, Beteiligte, Verbrauch, Dauer etc.)
- Lessons Learned (Dokumentation von Optimierungspotenzial)

### 6.3 Revisionssichere Archivierung
- Speicherung aller relevanten Einsatzdaten nach gesetzlichen Vorgaben

#### Erweiterungsideen (6.x)
- Automatisierte Berichterstellung
- Integration in DRK-interne Systeme (Schnittstellen zu vorhandenen Datenbanken)

## Weitere Querschnittsthemen
- Benutzer- und Rechteverwaltung
- Offline-Funktionalität und Daten-Synchronisation
- Mobile App (Android / iOS) mit Fokus auf Schnell-Erfassung
- E-Learning und Simulation
- Psychosoziale Notfallversorgung (PSNV)
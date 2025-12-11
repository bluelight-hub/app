---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - docs/analysis/product-brief-kraefte-2025-12-09.md
workflowType: 'research'
lastStep: 6
research_type: 'domain'
research_topic: 'Kräfte-Management BOS'
research_goals: 'Implementierungsrelevante Domain-Kenntnisse für Kräfte-Modul'
user_name: 'Ruben'
date: '2025-12-09'
web_research_enabled: true
source_verification: true
---

# Domain Research: Kräfte-Management im deutschen BOS-Bereich

**Datum:** 2025-12-09
**Autor:** Mary (Business Analyst) + Research Agents
**Projekt:** Bluelight Hub - Kräfte-Management (GitHub Issue #49)
**Zielgruppe:** Entwickler, Architekten

---

## Executive Summary

Diese Domain-Recherche liefert das fachliche Fundament für die Implementierung des Kräfte-Management-Moduls in Bluelight Hub. Die Recherche deckt sechs Kernbereiche ab, die direkt das Datenmodell, die Geschäftslogik und die UI-Gestaltung beeinflussen:

1. **Funkstatus 1-0** - Nicht bundesweit einheitlich, Status 7-9 müssen konfigurierbar sein
2. **Taktische Stärke** - Format `Führer/Unterführer/Helfer/Gesamt` ist de-facto Standard
3. **Qualifikationen** - Hierarchie NotSan → RS → RH, Führung VF → ZF → GF → TF
4. **Führungsrollen** - LNA (medizinisch) + OrgL (organisatorisch) = Einsatzabschnittsleitung
5. **Fahrzeugtypen** - DIN EN 1789 Klassifikation (Typ A1, A2, B, C)
6. **ETB-Standards** - Unveränderliche Einträge, Auto-ETB bei Statuswechsel

**Zentrale Erkenntnis:** Viele Standards sind regional unterschiedlich geregelt. Das System muss **konfigurierbar** sein, um verschiedene Leitstellen-Bereiche abzubilden.

---

## Inhaltsverzeichnis

1. [Funkstatus-Systematik (Status 0-9)](#1-funkstatus-systematik-status-0-9)
2. [Taktische Stärke](#2-taktische-stärke)
3. [Qualifikations-Hierarchie](#3-qualifikations-hierarchie)
4. [Führungsrollen bei MANV/Großeinsätzen](#4-führungsrollen-bei-manvgroßeinsätzen)
5. [Fahrzeugtypen-Klassifikation](#5-fahrzeugtypen-klassifikation)
6. [ETB-Standards](#6-etb-standards)
7. [Implementierungsempfehlungen](#7-implementierungsempfehlungen)
8. [Quellenverzeichnis](#8-quellenverzeichnis)

---

## 1. Funkstatus-Systematik (Status 0-9)

### 1.1 Standard-Statusbelegung

| Status | Bedeutung | Alarmierbar? | Beschreibung |
|--------|-----------|--------------|--------------|
| **0** | Notruf | ❌ | Akute Bedrohungslage, automatisches Senden |
| **1** | Einsatzbereit über Funk | ✅ | Unterwegs, auf Streife |
| **2** | Einsatzbereit auf Wache | ✅ | Stationiert und bereit |
| **3** | Einsatzauftrag übernommen | ❌ | Auf dem Weg zur Einsatzstelle |
| **4** | Am Einsatzort | ❌ | An Einsatzstelle eingetroffen |
| **5** | Sprechwunsch | ⚠️ | Dringender Gesprächsbedarf |
| **6** | Nicht einsatzbereit | ❌ | Defekt, Werkstatt, außer Betrieb |
| **7** | Patient aufgenommen (RD) | ❌ | Nur Rettungsdienst: Transport läuft |
| **8** | Am Transportziel (RD) | ✅ | Nur Rettungsdienst: Am Krankenhaus |
| **9** | Handquittung / Regional | ⚠️ | Stark regional unterschiedlich |

### 1.2 Regionale Unterschiede

**Kritisch für Implementierung:** Status 7-9 sind **NICHT bundesweit einheitlich**!

| Region | Status 7 | Status 8 | Status 9 |
|--------|----------|----------|----------|
| **Standard RD** | Patient aufgenommen | Am Transportziel | Handquittung |
| **Bayern (Nürnberg)** | Nicht einsatzbereit über Funk | Auf Wache ohne Personal | Funkaufschaltung 4m↔2m |
| **NRW (HSK)** | Patient aufgenommen | Am Krankenhaus | Notarzt aufgenommen |
| **Allgäu (NEF)** | Transportbegleitung | - | - |

### 1.3 Technischer Standard

- **Norm:** TR-BOS Funkmeldesystem (1980)
- **Übertragung:** 1200 Baud, 48 Bit Telegramm
- **Datentelegramm:** BOS-Kennung + Bundesland + Ortskennung + Fahrzeugkennung + Status

### 1.4 Implementierungsempfehlung

```typescript
enum FmsCategory {
  AVAILABLE      // Status 1, 2
  IN_PROGRESS    // Status 3, 4
  TRANSPORT      // Status 7, 8 (nur RD)
  UNAVAILABLE    // Status 6
  EMERGENCY      // Status 0
  COMMUNICATION  // Status 5, 9
}

interface FmsStatusConfig {
  code: number;              // 0-9
  label: string;
  category: FmsCategory;
  isAlarmable: boolean;
  applicableTo: OrganizationType[];
  regionalCode?: string;     // z.B. "BY", "NRW" - für regionale Varianten
}
```

**Quellen:**
- [Funkmeldesystem – Wikipedia](https://de.wikipedia.org/wiki/Funkmeldesystem)
- [Statusmeldungen – Rettungsdienst Aktuell](https://rettungsdienstaktuell.de/statusmeldungen/)
- [FMS-Richtlinie ILS Allgäu](https://extranet.ils-allgaeu.de/)

---

## 2. Taktische Stärke

### 2.1 Format und Berechnung

**Schema:** `Führer / Unterführer / Helfer / Gesamtstärke`

| Position | Bedeutung | Beispiele |
|----------|-----------|-----------|
| 1. Zahl | Führungskräfte | Zugführer, Verbandführer, Ärzte |
| 2. Zahl | Unterführer | Gruppenführer, Staffelführer, Truppführer |
| 3. Zahl | Helfer | Einsatzkräfte ohne Führungsfunktion |
| 4. Zahl | Gesamtstärke | Summe (oft unterstrichen) |

**Beispiele:**

| Einheit | Stärke | Bedeutung |
|---------|--------|-----------|
| Trupp | `0/0/2/2` | 2 Helfer |
| Gruppe | `0/1/8/9` | 1 GF + 8 Helfer |
| Zug | `1/3/18/22` | 1 ZF + 3 GF + 18 Helfer |
| Sanitätszug | `1/3/17/21` | 1 ZF/Arzt + 3 GF + 17 Helfer |

### 2.2 Standardisierung

- **FwDV 3:** "Einheiten im Lösch- und Hilfeleistungseinsatz" (bundesweit)
- **DRK-DV 102:** "Taktische Zeichen" (organisationsintern)
- **Keine DIN-Norm**, aber de-facto Standard über alle BOS

### 2.3 Wichtig für Implementierung

- Kategorisierung erfolgt nach **aktueller Funktion**, nicht nach höchster Qualifikation!
- Ärzte zählen als "Führer" (1. Kategorie)
- Gesamtstärke = automatisch berechnet

### 2.4 Implementierungsempfehlung

```typescript
interface TaktischeStaerke {
  fuehrer: number;        // ZF, Ärzte
  unterfuehrer: number;   // GF, TF
  helfer: number;         // Einsatzkräfte
  gesamt: number;         // Berechnet: fuehrer + unterfuehrer + helfer
}

function formatStaerke(s: TaktischeStaerke): string {
  return `${s.fuehrer}/${s.unterfuehrer}/${s.helfer}/${s.gesamt}`;
}
```

**Quellen:**
- [DRK-DV 102 - Taktische Zeichen](https://www.lv-saarland.drk.de/fileadmin/user_upload/DRK_Dienstvorschrift_102.pdf)
- [Taktische Einheit – Wikipedia](https://de.wikipedia.org/wiki/Taktische_Einheit)

---

## 3. Qualifikations-Hierarchie

### 3.1 Rettungsdienstliche Qualifikationen

| Qualifikation | Abk. | Ausbildung | Status |
|---------------|------|------------|--------|
| **Notfallsanitäter** | NotSan, NFS | 3 Jahre | Höchste nicht-ärztliche Qualifikation |
| **Rettungsassistent** | RettAss, RA | 2 Jahre | **Auslaufend** seit 2015 |
| **Rettungssanitäter** | RS | 520 Stunden | Reform ab 2026 |
| **Rettungshelfer** | RH | 320 Stunden | Landesrechtlich geregelt |

### 3.2 Ärztliche Qualifikationen

| Qualifikation | Abk. | Voraussetzungen |
|---------------|------|-----------------|
| **Notarzt** | NA | Facharzt + Zusatzweiterbildung Notfallmedizin |
| **Leitender Notarzt** | LNA | NA + 5 Jahre + 40h Seminar |

### 3.3 Führungsqualifikationen

| Funktion | Abk. | Führt | Ausbildung |
|----------|------|-------|------------|
| **Truppführer** | TF | Trupp (2 Pers.) | Teil Grundausbildung |
| **Gruppenführer** | GF | Gruppe (9 Pers.) | Mind. 70 Stunden |
| **Zugführer** | ZF | Zug (~22 Pers.) | Aufbau auf GF |
| **Verbandsführer** | VF | Verband | Mind. 35 Stunden |

### 3.4 Hierarchie-Übersicht

```
Rettungsdienst:           Führung:
NotSan                    VF (Verband)
  ↑                         ↑
RettAss (auslaufend)      ZF (Zug)
  ↑                         ↑
RS                        GF (Gruppe)
  ↑                         ↑
RH                        TF (Trupp)
```

**Quellen:**
- [Rettungsfachpersonal – Wikipedia](https://de.wikipedia.org/wiki/Rettungsfachpersonal)
- [Gruppenführer – Wikipedia](https://de.wikipedia.org/wiki/Gruppenf%C3%BChrer)

---

## 4. Führungsrollen bei MANV/Großeinsätzen

### 4.1 Einsatzabschnittsleitung Gesundheit

| Rolle | Funkruf-Kennziffer | Verantwortung |
|-------|-------------------|---------------|
| **LNA** (Leitender Notarzt) | `04` | Medizinische Leitung, Triage, Behandlungspriorität |
| **OrgL** (Organisatorischer Leiter) | `03` | Taktische Organisation, Logistik, Personalführung |

**LNA + OrgL = Sanitätseinsatzleitung (SanEL)**

### 4.2 Führungsstruktur bei MANV

```
Gesamteinsatzleitung (TEL Feuerwehr)
    │
    ├─ EA Brandbekämpfung (Feuerwehr)
    │
    ├─ EA Gesundheit (LNA + OrgL)
    │   ├─ UA Patientenablage
    │   ├─ UA Behandlungsplatz (BHP)
    │   └─ UA Transport
    │
    └─ EA Betreuung
```

### 4.3 Weitere Führungsrollen

| Rolle | Beschreibung |
|-------|--------------|
| **TEL** | Technischer Einsatzleiter (Gesamtführung) |
| **LvD** | Leiter vom Dienst (Leitstelle) |
| **EAL** | Einsatzabschnittsleiter |
| **Leiter BHP** | Leitung Behandlungsplatz |

### 4.4 Normen

- **FwDV 100:** "Führung und Leitung im Einsatz"
- **DIN 13050:** Begriffe im Rettungswesen

### 4.5 Implementierungsempfehlung für Rollen

```typescript
const STANDARD_ROLLEN = [
  { name: 'LNA', funkrufKennziffer: '04', typ: 'FUEHRUNG' },
  { name: 'OrgL', funkrufKennziffer: '03', typ: 'FUEHRUNG' },
  { name: 'Leiter BHP', funkrufKennziffer: null, typ: 'FUEHRUNG' },
  { name: 'Transportorganisator', funkrufKennziffer: null, typ: 'FUNKTION' },
  { name: 'Sichtung', funkrufKennziffer: null, typ: 'FUNKTION' },
];
```

**Quellen:**
- [FwDV 100 - IDF NRW](https://www.idf.nrw.de/dokumente/wir-ueber-uns/aufgaben-des-idf/fwdv100.pdf)
- [Leitender Notarzt – Wikipedia](https://de.wikipedia.org/wiki/Leitender_Notarzt)
- [Massenanfall von Verletzten – Wikipedia](https://de.wikipedia.org/wiki/Massenanfall_von_Verletzten)

---

## 5. Fahrzeugtypen-Klassifikation

### 5.1 DIN EN 1789 Klassifikation (Rettungsdienst)

| Typ | Fahrzeug | Besatzung | Verwendung |
|-----|----------|-----------|------------|
| **A1** | KTW | 2x RS | Einzelpatiententransport |
| **A2** | KTW | 2x RS | Krankentransport |
| **B** | N-KTW | NotSan + RS | Minderdringliche Notfälle |
| **C** | RTW | NotSan + RS (+Azubi) | Notfallrettung |
| **C+NA** | NAW | NA + 2x NotSan | Kompaktsystem |

### 5.2 Weitere Fahrzeugtypen

| Fahrzeug | Norm | Besatzung | Verwendung |
|----------|------|-----------|------------|
| **NEF** | DIN 75079 | NA + Fahrer | Rendezvous-System |
| **ITW** | DIN 75076 | NA + Intensivpflege + Fahrer | Intensivtransport |
| **GW-San** | BBK | Variabel | Katastrophenschutz |
| **ELW 1** | DIN 14507-2 | EL + Assistent | Einsatzleitung |
| **ELW 2** | DIN 14507-3 | Führungsstab | Großeinsätze |

### 5.3 Funkrufnamen-Schema

**Aufbau:** `[Kennwort] + [Ort] + [Kennziffer]`

| Kennwort | Organisation |
|----------|--------------|
| **Florian** | Feuerwehr |
| **Heros** | THW |
| **Rotkreuz** | DRK |
| **Sama** | ASB |
| **Akkon** | JUH |

**Beispiel:** "Florian Stuttgart 11/42-1"

### 5.4 Implementierungsempfehlung

```typescript
enum FahrzeugTyp {
  KTW_A1 = 'KTW_A1',
  KTW_A2 = 'KTW_A2',
  NKTW = 'NKTW',      // Typ B
  RTW = 'RTW',        // Typ C
  NAW = 'NAW',
  NEF = 'NEF',
  ITW = 'ITW',
  GW_SAN = 'GW_SAN',
  ELW_1 = 'ELW_1',
  ELW_2 = 'ELW_2',
}

interface Fahrzeug {
  opta: string;           // Operativ-taktische Adresse
  funkrufname: string;    // z.B. "Rotkreuz Musterstadt 83/1"
  typ: FahrzeugTyp;
  sollBesatzung: number;  // Regelbesatzung
  status: number;         // FMS 0-9
}
```

**Quellen:**
- [DIN EN 1789 - BAND e.V.](https://band-online.de/europaeische-norm-krankenkraftwagen-en-1789/)
- [Rettungswagen – Wikipedia](https://de.wikipedia.org/wiki/Rettungswagen)
- [Funkrufname – Wikipedia](https://de.wikipedia.org/wiki/Funkrufname)

---

## 6. ETB-Standards

### 6.1 Definition und Zweck

Das **Einsatztagebuch (ETB)** ist ein urkundlicher, chronologischer Nachweis aller einsatzbezogenen Anordnungen, Informationen und Maßnahmen.

**Zweck:**
- Führungsinstrument während des Einsatzes
- Rechtliches Beweismittel
- Grundlage für Einsatzauswertung
- **10 Jahre Aufbewahrungspflicht**

### 6.2 Rechtliche Grundlagen

- **FwDV 100:** Sachgebiet S2 "Lage" ist zuständig für Einsatzdokumentation
- **Keine spezifische DIN-Norm** für ETB

### 6.3 Pflichtfelder pro Eintrag

| Feld | Beschreibung | Pflicht |
|------|--------------|---------|
| **Zeitstempel** | Datum + Uhrzeit (HH:MM:SS) | ✅ |
| **Lfd. Nummer** | Fortlaufende Nummerierung | ✅ |
| **Ereignistyp** | Art des Ereignisses | ✅ |
| **Beschreibung** | Freitext | ✅ |
| **Quelle** | Woher stammt die Info? | ✅ |
| **Verantwortlicher** | Person/Funktion | Optional |

### 6.4 Ereignistypen

```typescript
enum EreignisTyp {
  ALARMIERUNG = 'ALARMIERUNG',
  MELDEBILD = 'MELDEBILD',
  LAGEFESTSTELLUNG = 'LAGEFESTSTELLUNG',
  LAGEBEURTEILUNG = 'LAGEBEURTEILUNG',
  ENTSCHLUSS = 'ENTSCHLUSS',
  BEFEHL = 'BEFEHL',
  MASSNAHME = 'MASSNAHME',
  KOMMUNIKATION = 'KOMMUNIKATION',
  ANFORDERUNG = 'ANFORDERUNG',
  STATUSMELDUNG = 'STATUSMELDUNG',
  ANKUNFT = 'ANKUNFT',
  STAERKEMELDUNG = 'STAERKEMELDUNG',
}

enum EtbQuelle {
  MANUELL = 'MANUELL',
  FMS = 'FMS',
  LEITSTELLE = 'LEITSTELLE',
  SYSTEM = 'SYSTEM',
}
```

### 6.5 Events für automatische ETB-Einträge

| Domain Event | ETB-Ereignistyp |
|--------------|-----------------|
| `fahrzeug.status_geaendert` | STATUSMELDUNG |
| `fahrzeug.am_einsatzort` (Status 4) | ANKUNFT |
| `fahrzeug.patient_aufgenommen` (Status 7) | STATUSMELDUNG |
| `anforderung.erstellt` | ANFORDERUNG |
| `staerke.aktualisiert` | STAERKEMELDUNG |
| `einsatz.erstellt` | ALARMIERUNG |

### 6.6 Compliance-Anforderungen

- ✅ **Unveränderlichkeit:** Einträge können nach Speicherung nicht gelöscht/geändert werden
- ✅ **Nachtragsfunktion:** Nachträge müssen als solche gekennzeichnet sein
- ✅ **Durchnummerierung:** Fortlaufend pro Einsatz
- ✅ **ETB-Führer:** Jeder Einsatz hat einen benannten ETB-Führer
- ✅ **PDF-Export:** Druckfähig mit Unterschriftenfeld

**Quellen:**
- [Einsatztagebuch - Einsatztraining](https://einsatztraining.de/einsatztagebuch-der-schluessel-zur-lueckenlosen-einsatzdokumentation/)
- [ETB - HCT Stabsschulung](https://www.hct-stabsschulung.de/einsatztagebuch)
- [Fireboard - Modul Einsatzführung](https://fireboard.net/produkte/module/modul-einsatzfuehrung/)

---

## 7. Implementierungsempfehlungen

### 7.1 Konfigurierbarkeit

| Bereich | Empfehlung |
|---------|------------|
| **Funkstatus** | Status 0-6 vordefiniert, Status 7-9 konfigurierbar pro Leitstelle |
| **Fahrzeugtypen** | Vordefinierte Typen nach DIN, erweiterbar |
| **Qualifikationen** | Vordefinierte Liste, Admin kann erweitern |
| **Rollen** | Standard-Rollen (LNA, OrgL), Admin kann weitere anlegen |

### 7.2 Datenmodell-Kernentitäten

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Fahrzeug   │────▶│   Person    │────▶│ Qualifikat. │
│  - OPTA     │     │   - Name    │     │   - Stufe   │
│  - Typ      │     │   - Funktion│     │   - Abk.    │
│  - Status   │     └─────────────┘     └─────────────┘
└─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   Rolle     │     │ ETB-Eintrag │
│  - Name     │     │ - Zeitstempel│
│  - Funkruf  │     │ - Typ       │
│  - Person?  │     │ - Beschreib.│
└─────────────┘     └─────────────┘
```

### 7.3 Taktische Stärke - Berechnungslogik

```typescript
function berechneTaktischeStaerke(personen: Person[]): TaktischeStaerke {
  const fuehrer = personen.filter(p =>
    p.funktion === 'ZF' || p.funktion === 'VF' || p.qualifikation === 'ARZT'
  ).length;

  const unterfuehrer = personen.filter(p =>
    ['GF', 'TF', 'SF'].includes(p.funktion)
  ).length;

  const helfer = personen.length - fuehrer - unterfuehrer;

  return {
    fuehrer,
    unterfuehrer,
    helfer,
    gesamt: personen.length
  };
}
```

### 7.4 Auto-ETB Integration

```typescript
// Event Handler für automatische ETB-Einträge
@OnEvent('fahrzeug.status_geaendert')
async handleStatusChange(event: FahrzeugStatusEvent) {
  await this.etbService.createEintrag({
    einsatzId: event.einsatzId,
    ereignistyp: EreignisTyp.STATUSMELDUNG,
    beschreibung: `${event.funkrufname}: Status ${event.neuerStatus}`,
    quelle: EtbQuelle.FMS,
    automatischErzeugt: true,
  });
}
```

---

## 8. Quellenverzeichnis

### Normen und Dienstvorschriften

| Norm | Titel | Link |
|------|-------|------|
| FwDV 100 | Führung und Leitung im Einsatz | [IDF NRW](https://www.idf.nrw.de/dokumente/wir-ueber-uns/aufgaben-des-idf/fwdv100.pdf) |
| FwDV 3 | Einheiten im Lösch- und Hilfeleistungseinsatz | - |
| DIN EN 1789 | Krankenkraftwagen | [BAND e.V.](https://band-online.de/europaeische-norm-krankenkraftwagen-en-1789/) |
| DIN 13050 | Begriffe im Rettungswesen | [Wikipedia](https://de.wikipedia.org/wiki/DIN_13050) |
| DRK-DV 102 | Taktische Zeichen | [DRK Saarland](https://www.lv-saarland.drk.de/fileadmin/user_upload/DRK_Dienstvorschrift_102.pdf) |
| TR-BOS FMS | Funkmeldesystem | - |

### Fachquellen

| Thema | Quelle |
|-------|--------|
| Funkstatus | [Wikipedia](https://de.wikipedia.org/wiki/Funkmeldesystem), [Rettungsdienst Aktuell](https://rettungsdienstaktuell.de/statusmeldungen/) |
| Taktische Stärke | [DRK Oberhausen-Rheinhausen](https://www.drk-oberhausen-rheinhausen.de/ausbildungsunterlagen/staerkeangabe-staerkemeldung.html) |
| Qualifikationen | [Wikipedia Rettungsfachpersonal](https://de.wikipedia.org/wiki/Rettungsfachpersonal) |
| Führungsrollen | [Wikipedia LNA](https://de.wikipedia.org/wiki/Leitender_Notarzt), [Wikipedia OrgL](https://de.wikipedia.org/wiki/Organisatorischer_Leiter_Rettungsdienst) |
| Fahrzeugtypen | [Leitstelle Nord](https://www.leitstelle-nord.de/), [Wikipedia RTW](https://de.wikipedia.org/wiki/Rettungswagen) |
| ETB | [Einsatztraining](https://einsatztraining.de/einsatztagebuch-der-schluessel-zur-lueckenlosen-einsatzdokumentation/), [HCT Stabsschulung](https://www.hct-stabsschulung.de/einsatztagebuch) |

### Software-Referenzen

| System | Link |
|--------|------|
| Fireboard | [fireboard.net](https://fireboard.net/) |
| GroupAlarm | [groupalarm.com](https://www.groupalarm.com/) |
| MissionBuddies | [missionbuddies.de](https://www.missionbuddies.de/) |
| Einsatz Status | [einsatz-status.net](https://www.einsatz-status.net/) |

---

**Recherche durchgeführt:** 2025-12-09
**Methodik:** 6 parallele Research Agents mit Web-Recherche
**Qualitätssicherung:** Quellenverifikation, Mehrfachquellen für kritische Informationen

# UX-Guidelines

> **Stand:** 2026-03-13
> **Quelle:** Konsolidiert aus `_bmad-output/planning-artifacts/ux-design-specification.md`
> **Geltungsbereich:** Alle neuen oder grundlegend überarbeiteten Frontend-Flächen in Bluelight Hub

---

## 1. Zielbild

Bluelight Hub ist ein `Desktop-first` Einsatz-Workspace. Die Anwendung soll sich nicht wie eine Sammlung einzelner Verwaltungsseiten anfühlen, sondern wie ein zusammenhängendes operatives Werkzeug, das Orientierung, Dokumentation und Folgeaktionen in einem stabilen Arbeitskontext verbindet.

Die UX verfolgt vier Kernziele:

- Nutzer verstehen den aktiven Lagezustand innerhalb weniger Sekunden.
- Dokumentation im ETB bleibt auch unter Unterbrechungen schnell, robust und fortsetzbar.
- Kontextwechsel zwischen Übersicht, ETB und Lagekarte verursachen keinen Kontext- oder Eingabeverlust.
- Die Oberfläche wirkt modern, professionell und systematisch, ohne generisch oder verspielt zu werden.

Primäre Nutzer sind Einsatzkräfte im I&K- und Führungsumfeld. Die UI muss daher `power-user-tauglich`, stressfest und informationsdicht sein, ohne visuell chaotisch zu werden.

---

## 2. Verbindliche UX-Prinzipien

| Prinzip | Bedeutung für Umsetzung und Review |
|---------|-----------------------------------|
| **Kontext vor Aktion** | Vor jeder Interaktion muss klar sein, in welchem Einsatz gearbeitet wird, was relevant ist und welcher Zustand aktiv ist. |
| **Ein Workspace statt Einzelseiten** | Übersicht, ETB und Lagekarte sind verbundene Arbeitszustände innerhalb einer stabilen Shell. |
| **Power-User zuerst** | Tastaturbedienung, Shortcuts, Vorbelegungen und geringe Interaktionsreibung sind Kernanforderungen. |
| **Kein Kontextverlust** | Entwürfe, Filter, Fokus und Arbeitszustände bleiben bei Navigation, Unterbrechung und Fehlern erhalten. |
| **Wenige Modals, mehr Fluss** | Standardinteraktionen laufen inline, panel-basiert oder im bestehenden Kontext statt in Dialogketten. |
| **Ruhe durch Klarheit** | Informationsdichte ist erlaubt, aber nur mit klarer Priorisierung, sauberen Abständen und verständlicher Statussemantik. |
| **Professionelle Modernität** | Neue Flächen bauen auf `shadcn/ui` und `shared/ui` auf, entwickeln daraus aber eine eigenständige Bluelight-Identität. |

Diese Prinzipien sind nicht nur Stilrichtung, sondern Review-Kriterien für neue UI-Arbeit.

---

## 3. Informationsarchitektur und Kernflows

### 3.1 Arbeitsmodell

Die App bleibt in einer stabilen Einsatz-Shell mit:

- persistenter globaler Navigation
- modulbezogener Subnavigation
- dauerhaft sichtbarem Einsatzkontext
- klar getrennten Bereichen für Navigation, Status und Folgeaktionen

Die Shell darf beim Bereichswechsel nicht „springen“. Nur der Inhaltsbereich wechselt.

### 3.2 Kernflächen

| Fläche | Hauptfrage | UX-Erwartung |
|-------|------------|--------------|
| **Übersicht** | Was ist jetzt wichtig? | priorisierte Lageinformationen, offene Punkte, direkte Folgeaktionen |
| **ETB** | Wie dokumentiere ich ohne Reibung weiter? | stabiler Composer, sichtbarer Draft-/Sync-Status, schneller nächster Eintrag |
| **Lagekarte** | Welchen räumlichen Bezug muss ich prüfen? | schneller Kartenkontext ohne Verlust des Einsatzkontexts |

### 3.3 Leitplanken für Kernflows

- Einstieg in einen Einsatz führt schnell in einen arbeitsfähigen Zustand, nicht in eine lose Navigationslandschaft.
- Die Übersicht priorisiert zuerst Orientierung und danach Folgeaktionen.
- Das ETB ist die zentrale Dauerhandlung und wird als produktiver Workspace statt als Formularseite behandelt.
- Bereichswechsel zwischen Übersicht, ETB und Lagekarte müssen Rückkehr und Wiederaufnahme ohne Neuaufbau ermöglichen.

---

## 4. Interaktionsmuster

### 4.1 Aktionshierarchie

- Pro sichtbarem Arbeitsbereich gibt es genau eine dominante Primäraktion.
- Sekundär- und Tertiäraktionen treten visuell klar zurück.
- Destruktive Aktionen werden nie wie normale Primäraktionen behandelt.
- Wiederkehrende Power-User-Aktionen dürfen sichtbare Shortcut-Hinweise tragen.

### 4.2 Feedback und Status

- Normale Erfolgs- und Speicherrückmeldungen erscheinen inline im Arbeitskontext.
- Toasts sind seltene Ausnahmen für globale oder bereichsübergreifende Ereignisse.
- Fehler dürfen keine Eingaben zerstören.
- Status wie `Draft gespeichert`, `Synchronisierung ausstehend`, `gesperrt` oder `Konflikt` werden textlich und konsistent dargestellt.

### 4.3 Formulare

- Formulare sind kompakte Arbeitsoberflächen, keine langen Verwaltungsstrecken.
- Felder werden logisch gruppiert und sinnvoll vorbelegt.
- Validierung erscheint feldnah und nachvollziehbar.
- Werte bleiben bei Kontextwechseln möglichst erhalten.
- Für häufige Aktionen werden Tastaturpfade wie `Strg/Cmd + Enter` sichtbar dokumentiert.

### 4.4 Navigation

- Navigation ist ein Kontextsystem, kein starres Seitenverzeichnis.
- `Command Palette` ist das primäre Cross-Navigation-Muster für Power User.
- Suche, Filter und relevante UI-Zustände bleiben beim Bereichswechsel erhalten.
- Pflichtschritte wie Einsatzbeitritt oder Zuordnung werden klar geführt und nicht versteckt.

### 4.5 Modals und Overlays

- Modals sind die Ausnahme.
- Standardfall sind Inline-, Panel- oder Docked-Interaktionen.
- Dialoge werden nur für diskrete Spezialfälle, Bestätigungen mit echtem Fokusbruch oder Systemaufgaben eingesetzt.
- `Command Palette` und Fullscreen sind erlaubte Spezialmuster, aber kein Freibrief für Overlay-lastige UX.

### 4.6 Empty, Loading, Search und Filter

- Empty States unterscheiden klar zwischen `keine Daten`, `keine Treffer`, `noch nicht arbeitsfähig` und `nicht verfügbar`.
- Skeletons orientieren sich am späteren Layout und transportieren Struktur.
- Suche ist der primäre Einstieg in Filterlogik.
- Aktive Filter bleiben sichtbar und einzeln zurücksetzbar.

---

## 5. Visuelle Leitplanken

### 5.1 Design-System-Basis

Bluelight Hub baut auf `shadcn/ui` als technischem Fundament und `shared/ui` als projektspezifischer Abstraktion auf. Ziel ist kein Standard-`shadcn`-Look, sondern ein eigenständiges System für operative, dichte Arbeitsflächen.

### 5.2 Farbe

- `Blau` ist primärer Identitätsanker.
- Neutrale Flächen bleiben kühl, ruhig und professionell.
- Statusfarben sind semantisch klar und zurückhaltend.
- Light und Dark Mode müssen denselben Ernstgrad, dieselbe Hierarchie und dieselbe Lesbarkeit liefern.

### 5.3 Typografie

- Die Typografie soll modern, technisch und präzise wirken.
- UI-Text bleibt nüchtern, sehr gut lesbar und auf dichte Arbeitsflächen ausgelegt.
- Monospace wird gezielt für Zeitstempel, IDs, Shortcuts und systemnahe Informationen genutzt.
- Die Hierarchie ist app-orientiert, nicht marketinghaft.

### 5.4 Spacing und Dichte

- Basis ist ein `8px`-System mit `4px`-Unterstufen.
- Flächen sind kompakt, aber nicht eng.
- Große Leerflächen und überdimensionierte Cards werden vermieden.
- Panels, Statusleisten und Eingabebereiche folgen einer ruhigen, konsistenten Tiefen- und Abstandssystematik.

---

## 6. Bevorzugte Produktbausteine

Neue oder überarbeitete Flächen sollen bevorzugt mit folgenden produktnahen Mustern arbeiten:

| Baustein | Zweck |
|---------|-------|
| **EinsatzContextBar** | Persistenter Kopfbaustein mit aktivem Einsatz, Status, Zeitbezug und globalen Aktionen |
| **PrioritySurface** | priorisierte Lage- und Folgeaktionsfläche für die Übersicht |
| **WorkspaceSidebar** | ruhige, strukturierte Subnavigation mit klaren Rückkehrpunkten |
| **ETBComposer** | produktiver Schreibbereich mit Kontext, Draft und Primäraktion |
| **DraftStatusIndicator** | systematisches Muster für Autosave-, Sync- und Konfliktzustände |
| **ETBEntryStream** | lesbarer, filterbarer und editierbarer Protokoll-Stream |
| **AssignmentGate** | geführter Einstieg bei fehlender Einsatzkraft- oder Rollen-Zuordnung |

Die Produktidentität entsteht in Bluelight Hub primär über solche Kompositionsbausteine und nicht über zusätzliche generische Atoms.

---

## 7. Responsive Design und Accessibility

### 7.1 Responsive Strategie

- `Desktop` ist die führende Referenz.
- `Tablet` ist eine reduzierte Workspace-Form.
- `Mobile` priorisiert Überblick, Lagekarte, Statussicht und kurze Folgeaktionen statt vollständiger Desktop-Gleichzeitigkeit.

Empfohlene Größenklassen:

- unter `640px`: Mobile
- `640px` bis `1023px`: Large Mobile / Small Tablet
- ab `1024px`: Desktop
- ab `1536px`: Wide Desktop

### 7.2 Accessibility-Standard

Bluelight Hub nutzt `WCAG 2.1 AA` als verbindlichen Zielstandard.

Verpflichtend sind:

- sichtbare Fokusindikatoren
- vollständige Tastaturbedienung für Kernflows
- Statuskommunikation nicht nur über Farbe
- robuste semantische Struktur und Landmarken
- screenreader-taugliche Labels, Fehler und Statusmeldungen
- gleichwertige Lesbarkeit in Light und Dark Mode

Besonders kritisch sind Fokusführung in ETB-Flows, Statusverständlichkeit bei Draft/Sync/Fehlern und eine verlässliche Fokus-Rückgabe nach Overlays oder Moduswechseln.

---

## 8. Review- und Umsetzungsregeln

Jede neue oder grundlegend überarbeitete UI-Fläche muss vor Merge gegen diese Fragen geprüft werden:

1. Ist der aktive Einsatzkontext sofort erkennbar?
2. Beantwortet die Oberfläche zuerst `Was ist jetzt wichtig?` und erst dann `Was kann ich tun?`
3. Bleiben Entwürfe, Filter, Fokus und relevante Zustände bei Wechseln erhalten?
4. Ist die häufigste Aufgabe mit Maus und Tastatur reibungsarm bedienbar?
5. Werden Status und Fehler inline, verständlich und ohne Kontextverlust kommuniziert?
6. Nutzt die Fläche bestehende `shadcn/ui`- und `shared/ui`-Primitives sowie die Bluelight-Muster statt Sonderlösungen?
7. Erfüllt die Fläche die Accessibility-Anforderungen in ihrem Kernflow?

Wenn eine Änderung diese Leitlinien bewusst verletzt, muss die Abweichung im PR oder in der betroffenen Doku explizit begründet werden.

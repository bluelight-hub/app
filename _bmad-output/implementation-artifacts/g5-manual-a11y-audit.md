---
status: ready-for-qa
goal: G5
parent_spec: ./spec-g5-polish.md
github_issue: 627
---

# G5 — Manuelle Accessibility-Audit-Checkliste für Feature #627

## Zielgruppe

Dieses Dokument richtet sich an QA / UX-Reviewer, die Feature #627 (Lagekarte-Integration der Gefahrenmatrix) manuell mit Screen-Reader und Tastatur prüfen. Automatisierte a11y-Tests mit `@axe-core/playwright` sind als Follow-up geplant, sobald Playwright im Projekt aufgesetzt wird.

## Voraussetzungen

- macOS: VoiceOver (Cmd+F5 ein/aus). Alternativ: Apple-Tutorial zur Sprachausgabe.
- Windows: NVDA (kostenlos, https://www.nvaccess.org). Einschalten: Ctrl+Alt+N.
- Browser: aktueller Chrome/Firefox/Safari.
- Konto: `rubeen` / `MyPass123*` im lokalen Dev-Environment.
- Setup: `pnpm -r dev`, dann `https://localhost:3090` öffnen.

## Testszenarien

### 1. Gefahrenmatrix-Route — Tastatur-Navigation

1. Navigiere nach `/einsatz/:id/sicherheit/gefahren` (Matrix-Route).
2. Drücke `Tab` wiederholt. **Erwartung:**
   - Reihenfolge: Hilfe-Button, Split-View-Toggle, Matrix-Zellen (Listbox pro Zelle), Badge-Buttons, Hilfe-Dialog-Trigger.
   - Jedes fokussierbare Element hat einen sichtbaren Focus-Ring (`shadow-focus-ring`).
3. Drücke `Enter` auf einer Matrix-Zelle. **Erwartung:** Listbox öffnet sich, Pfeiltasten navigieren, `Enter` bestätigt, `Esc` schließt.
4. Tastatur-Shortcut `Cmd+Shift+G` / `Ctrl+Shift+G` aktiviert die Verknüpfte Ansicht.

### 2. Lagekarte-Route — Tastatur-Navigation

1. Navigiere nach `/einsatz/:id/übersicht/karte`.
2. `Tab` erreicht den Split-View-Toggle. **Erwartung:** Fokus-Ring sichtbar, `Enter` toggelt Split-View.
3. Der Karten-Viewport selbst ist nicht Teil der Tab-Reihenfolge (MapLibre-Default). Zoom-Controls rechts oben sind fokussierbar und bedienbar.

### 3. Split-View — Focus-Roundtrip

1. Aktiviere Split-View (Toggle oder `Cmd+Shift+G`).
2. `Tab` navigiere zu einer Matrix-Zelle mit einer Gefahrenzone. **Erwartung:** Karte zoomt auf die Bounding-Box der verknüpften Zonen.
3. Auf der Karte eine Zone anklicken. **Erwartung:** Matrix-Zelle pulst und scrollt ins Viewport. Die Zone-Zelle zeigt den `animate-gefahrenmatrix-cell-pulse`-Ring (bei `prefers-reduced-motion: reduce` ersetzt durch statischen Border-Flash).

### 4. AKUT-Confirm-Dialog (einzige Modal-Stelle)

1. Stufe eine Matrix-Zelle von HOCH auf AKUT hoch. **Erwartung:** Dialog öffnet sich.
2. **VoiceOver / NVDA:** Sprachausgabe liest Titel („AKUT-Warnstufe senden?") und Body-Text.
3. **Tastatur:**
   - `Esc` schließt und setzt Warnstufe zurück.
   - `Tab` / `Shift+Tab` zyklisch zwischen Cancel + Primary-Button (Focus-Trap).
   - `Enter` auf „AKUT senden" feuert den Broadcast.

### 5. AKUT-Broadcast-Toast — `aria-live` Narration

Setup: zwei Browser-Sessions desselben Einsatzes. Als Benutzer A AKUT-Broadcast in der Matrix senden.

1. **Session B mit aktivem Screen-Reader:**
   - Stage 1 (sofort): Toast erscheint oben rechts. VoiceOver/NVDA sagt „AKUT: {Gefahrentyp}, {Schutzobjekt}, gemeldet von {Absender}" (`aria-live="assertive"`).
   - System-Beep (500 ms 800 Hz) hörbar, es sei denn der Sound-Toggle im Banner wurde deaktiviert (Persist via localStorage).
2. Stage 2 (nach 10 s ohne Klick): Toast wird persistent; visuell durch Ring hervorgehoben.
3. Stage 3 (nach 30 s ohne Klick): Header-Banner oben am Bildschirm. Narration des Banners bleibt konsistent.
4. Klick auf Toast/Banner navigiert zur Split-View mit Fokus auf die AKUT-Zelle — Screen-Reader sagt neue Route an.

### 6. Undo-Mechanik (`Cmd+Z`)

1. Erstelle eine neue Gefahrenzone.
2. Drücke `Cmd+Z` (macOS) bzw. `Ctrl+Z`. **Erwartung:** Zone wird sofort entfernt, Toast „Aktion zurückgenommen" mit „Wiederherstellen"-Button erscheint.
3. Screen-Reader: Toast ist via Sonner-Standard `role="status"` angebunden, Narration erfolgt.
4. Klick „Wiederherstellen" innerhalb von 30 s legt die Zone erneut an.
5. Wiederhole für Delete-Flow (Zone im DetailPanel löschen → `Cmd+Z`).
6. Offline-Test: Netzwerk trennen, `Cmd+Z` drücken → Info-Toast „Undo offline nicht verfügbar".

### 7. Onboarding-Coach-Mark

1. Mit einem frischen Browser-Profil (oder `localStorage.removeItem('bluelight:coachmark:gefahrenzone:v1')`) anmelden.
2. Split-View mit mindestens einer Zone öffnen. **Erwartung:** Coach-Mark erscheint unten.
3. Tastatur: `ArrowRight` → nächster Step, `ArrowLeft` → voriger Step, `Enter` → nächster Step (oder Verstanden am Ende), `Esc` → Tour schließt (mit Persist).
4. Screen-Reader liest Step-Titel und Body (`aria-labelledby` + `aria-describedby`).
5. Nach Reload: Coach-Mark erscheint nicht mehr (Persist-Flag `v1`).

### 8. Reduced-Motion-Prüfung

1. System-Einstellung „Bewegung reduzieren" aktivieren (macOS: Systemeinstellungen → Bedienungshilfen → Anzeige; Windows: Einstellungen → Erleichterte Bedienung → Anzeige).
2. Alle Flows (1–7) wiederholen. **Erwartungen:**
   - AKUT-WarnstufeChip-Pulse → statischer Doppel-Ring.
   - Matrix-Cell-Focus-Pulse → einmaliger 300-ms-Border-Flash, kein wiederholtes Pulsen.
   - Coach-Mark → keine Entry-Animation.
   - AkutBroadcastToast → statisches Erscheinen (keine Slide-in-Animation).
3. Detailbefunde vergleichen mit `g5-reduced-motion-audit.md`.

## Befund-Protokoll

Für jede Abweichung bitte folgende Felder notieren:

- **Szenario:** (z. B. „5 — AKUT-Toast Narration")
- **Browser / Screen-Reader:** (z. B. „Safari 17 / VoiceOver")
- **Erwartet:**
- **Beobachtet:**
- **Severity:** critical / serious / moderate / minor
- **Screenshot / Recording:** (wenn möglich)

Befunde sammeln wir in einem gemeinsamen Ticket (QA-Tracker). Kritische / schwerwiegende Findings blockieren den PR-Merge.

## Follow-ups (außerhalb G5)

- Automatisierter a11y-Check via `@axe-core/playwright` (erfordert Playwright-Setup).
- Visuelle Regressionstests mit Playwright-Screenshots (Warnstufen-Chip, Matrix-Zustände, AKUT-Toast in allen drei Stages, Coach-Mark).
- Beide Punkte sind in `spec-g5-polish.md` als Follow-up dokumentiert.

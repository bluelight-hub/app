# Eigenschutz-Konsistenz

Diese Datei ist der fachliche Anker für ruhiges Feedback und destruktive Aktionen im Eigenschutz-Modul.

## Zero-Success-Toast

Erfolgreiche Mutationen zeigen keinen Sonner-Erfolgs-Toast. Erfolg wird über Statusänderung sichtbar: Drawer schließen, Listen aktualisieren, Banner verschwinden, Sync-Status wechseln oder eine Seite zeigt den neuen Eintrag. Fehler bleiben inline, damit die operative Fläche nicht durch zusätzliche Pop-ups unruhig wird.

Der Vorfall-Export bleibt bewusst auf derselben Linie. `api/use-export-vorfall-as-pdf.ts` und `api/use-export-vorfall-as-json.ts` nutzen `meta: { silentError: true }`; Retry-Informationen erscheinen über Inline-Banner und Page-Status, nicht als Export-Erfolgs-Toast. Das weicht von einzelnen Export-Patterns anderer Module ab, ist im Eigenschutz aber konsistent mit `SeverityBanner` und der Statuszeile.

## Destructive Actions Pattern

Destruktive Aktionen brauchen drei sichtbare Elemente im selben Aktionskontext:

- ein Pflichtfeld für die Begründung,
- den Hinweistext `Diese Änderung wird historisiert und kann nicht gelöscht werden.`,
- einen `Button` mit `intent="danger"` und `appearance="outline"`.

Auf Desktop steht der destruktive Confirm rechts neben Abbrechen/Speichern mit ausreichendem Abstand. Auf Mobile stapeln sich die Aktionen vertikal. Das Pflichtfeld ist die bewusste Reibung; zusätzliche „Bist du sicher?"-Modale werden nicht verwendet, wenn die Aktion bereits in einem Drawer oder Dialog bestätigt wird.

## Erlaubte Ausnahmen

`consistency-allow: destructive-pattern` ist nur für Quelltext-Stellen erlaubt, die durch die einfache Heuristik wie destruktive Aktionen aussehen, aber keine destruktive Backend-Mutation ausführen oder an einen Pattern-konformen Dialog delegieren.

Aktuell gepflegte Marker:

- `ui/pages/GefaehrdungenPage.tsx` — roter Retry-Button bei Ladefehler.
- `ui/pages/GefaehrdungenDetailPage.tsx` — roter Retry-Button bei Ladefehler.
- `ui/pages/SicherheitsregelnPage.tsx` — roter Retry-Button bei Ladefehler.
- `ui/pages/SicherungspostenDetailPage.tsx` — Retry ist Fehler-Recovery; Auflösen öffnet `AufloeseSicherungspostenDialog`.
- `ui/organisms/SicherungspostenDrawer.tsx` — Personal-Entfernen betrifft nur lokale Formularzeilen.
- `ui/molecules/GefaehrdungItemEditor.tsx` — Gefährdungs-Entfernen betrifft lokale Draft-Zeilen; Persistenz bleibt versioniert im Parent-Editor.

Neue Marker müssen hier ergänzt werden. Ohne Dokumentation soll der Konsistenz-Test fehlschlagen.

## Konsistenz-Test

`__tests__/consistency.spec.ts` liest die Eigenschutz-Quellen und blockiert:

- neue `toast.success(`-Aufrufe,
- destruktive Buttons ohne Hinweistext,
- destruktive Buttons ohne Begründungsfeld,
- destruktive Buttons ohne Outline-Danger-Variante,
- nicht dokumentierte `consistency-allow`-Marker.

Fehlermeldungen nennen Datei und Regel auf Deutsch, damit die Reparatur ohne Kontextsuche möglich ist.

## Code-Anker

- `ui/organisms/VorfallMeldenDrawer.tsx` — Erfolg schließt den Drawer und invalidiert die Liste über den bestehenden Hook, ohne Toast.
- `ui/organisms/PSAChangeDrawer.tsx` — Last-Basis-Entfernung nutzt Inline-Hinweis, Begründung und Outline-Danger im Drawer.
- `ui/organisms/AufloeseSicherungspostenDialog.tsx` — destruktiver Dialog mit Pflicht-Begründung und historisiertem Confirm.
- `ui/organisms/MeldeLueckeDialog.tsx` — Lückenmeldung als destruktive Rückmeldung mit Pflicht-Notiz.
- `api/use-export-vorfall-as-pdf.ts` und `api/use-export-vorfall-as-json.ts` — Export-Sonderfall mit Inline-Banner statt Toast.

# Eigenschutz Hilfetexte-Audit (G8)

- **Datum:** 2026-05-12
- **Scope:** Frontend-Hilfetexte im Eigenschutz-Modul
  (`packages/frontend/src/features/eigenschutz/ui/{pages,organisms,molecules}/`)
- **Audit-Typ:** Inventur + Tone-Vorschlag, **kein Rewrite**
- **Folge-Story:** separat, siehe Abschnitt „Folge-Story-Vorschlag" am Ende.

## Vorgehen

Untersucht wurden alle `.tsx`-Dateien unter den drei UI-Ordnern (ohne
`__tests__/` und `*.stories.tsx`). Erfasst wurden Strings, die der Nutzer
direkt liest:

- `title=` / `description=` / `subtitle=` / `helpText=` an Page-Header,
  Drawer/Dialog, `EmptyState`, `Alert`, `SeverityBanner`.
- `placeholder=` an Inputs/Textareas/Selects.
- `aria-label=` an Sections, Buttons, Icon-Triggern (nur dort markiert, wo
  Impl-Vokabular durchschlägt — reine A11y-Labels mit fachsprachlich
  korrekten Begriffen sind als „okay" gewertet).
- Tooltip-`title=` an Icon-/Badge-Buttons.
- Fließtext-Hinweise in `<p>` innerhalb von Banner/Drawer (Help-/Status-Zeilen).
- Inline-Fehlermeldungen (`setSubmitError`, `setInlineError`, `aria-alert`).

Backend-/Schema-Strings, Toast-Texte aus Shared-Utilities und reine
DEV-Hinweise (z. B. `"Verfügbar ab Story 3.6"`) sind explizit
**out-of-scope** und am Schluss separat aufgeführt.

## UX-Tone-Guide (Kurz-Erinnerung)

1. **Verb-zentriert:** „Was tut der Nutzer hier?" — nicht „Was sind die
   Daten?".
2. **Konsequenz benennen:** „Was passiert beim Klick? Wer wird benachrichtigt?".
3. **Voraussetzungen sichtbar machen:** „Welche Eingabe braucht das System?"
   ohne den DB-Mechanismus zu nennen.
4. **Implementation-Vokabular vermeiden** in User-facing Strings:
   - Versionierung, expectedVersion, Optimistic-Concurrency-Token
   - Aggregate, Outbox, Read-Model, Event, Read-Only
   - cuid2, CUID, FR50, UX-DR, Sentinel
   - Multi-Device, Propagation, Lost-Update, Sender-Sicht
   - Audit-Trail, auditierbar, Mutation, Konsistenz-Regel
   - „Eingang Süd, Halle 3" (entwickler-spezifischer Placeholder)
5. **Konsistenz in den Begriffen:** „Sicherheitsbeauftragter" vs.
   „Einsatzleiter" vs. „BEFEHLSGEBER" — Audit markiert Diskrepanzen.

## Severity-Skala

| Tier | Bedeutung |
| --- | --- |
| **muss umformuliert** | Impl-Sprache, Fachjargon oder Code-Begriff sichtbar; Nutzer versteht den Mehrwert nicht oder bekommt Angst vor dem Klick. |
| **sollte umformuliert** | Inhaltlich okay, aber redundant zur Headline / unklar / mehrdeutig / nennt ein technisches Detail unnötig. |
| **nice to have** | Verständlich, könnte aber knackiger/verb-zentrierter sein. |
| **okay** | Kein Handlungsbedarf. (Mengen, keine Liste.) |

---

## Tier 1 — Muss umformuliert (Impl-Sprache / Jargon)

| File:Line | Bisheriger Text | Problem-Klasse | Vorschlag-Neutext |
| --- | --- | --- | --- |
| `packages/frontend/src/features/eigenschutz/ui/pages/SicherungspostenPage.tsx:41` | „Sicherungsposten anlegen, bearbeiten und auflösen — Versionierung und Auflöse-Begründung sind Pflicht." | Implementation-Sprache („Versionierung"); Nutzer-Beispiel aus G8. | „Wer hält wo Wache? Posten anlegen, ablösen oder am Einsatzende auflösen. Beim Auflösen ist eine Begründung Pflicht — sie bleibt im Verlauf sichtbar." |
| `packages/frontend/src/features/eigenschutz/ui/pages/SyncConflictsPage.tsx:55` | „Multi-Device-Konflikte (FR50) — auf jeder Zeile entscheiden, welche Version gilt." | Implementation-Sprache („Multi-Device-Konflikte", „FR50"). | „Wenn dieselbe Information auf zwei Geräten parallel geändert wurde, landet sie hier. Pro Zeile entscheiden, welche Variante gilt." |
| `packages/frontend/src/features/eigenschutz/ui/pages/PsaProfilePage.tsx:232` | „Schutzstufe pro Einheit aktivieren oder deaktivieren — jede Änderung ist auditierbar." | Implementation-Sprache („auditierbar"); Nutzer fragt sich, wovor er Angst haben muss. | „Schutzstufe pro Einheit ein- oder ausschalten. Jede Änderung wird mit Zeitpunkt und Person festgehalten." |
| `packages/frontend/src/features/eigenschutz/ui/pages/VorfaellePage.tsx:178` | „Filter persistent über URL — als Deep-Link teilbar." | Implementation-Sprache („persistent über URL", „Deep-Link"). | „Vorfälle dieses Einsatzes. Die gesetzten Filter bleiben beim Neuladen erhalten und können per Link an Kolleginnen weitergegeben werden." |
| `packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenDetailPage.tsx:140` | Tooltip auf Version-Badge: „Optimistic-Concurrency-Token — wird beim Speichern mitgeschickt." | Implementation-Sprache („Optimistic-Concurrency-Token"). | „Versionsstand dieser Beurteilung. Hilft zu erkennen, ob jemand anderes parallel etwas geändert hat." |
| `packages/frontend/src/features/eigenschutz/ui/pages/SicherungspostenDetailPage.tsx:229` | Tooltip auf Version-Badge: „Optimistic-Concurrency-Token — wird beim Speichern mitgeschickt." | Implementation-Sprache, identisch zur Gefährdungs-Detail-Page. | „Versionsstand dieses Postens. Hilft zu erkennen, ob jemand anderes parallel etwas geändert hat." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/PsaProfilDetailDrawer.tsx:144` | (Read-Only-Pfad) „Sender-Sicht — Soll-Ausrüstung als Referenz, keine Aktionen." | Implementation-Sprache („Sender-Sicht"); Nutzer weiß nicht, was Sender heißt. | „So sieht die andere Einheit ihre Soll-Ausrüstung. Nur zur Ansicht — von hier aus keine Quittung möglich." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/VorfallMeldenDrawer.tsx:283` (Help-Text im Drawer) | „Erfasse den Vorfall mit Pflichtfeldern „Was" und „Wann" sowie optionalen Angaben zu Ort, Beteiligten und Maßnahmen. Der Vorfall wird unmittelbar im Audit-Trail protokolliert." | Implementation-Sprache („Audit-Trail protokolliert"). | „Beschreibe kurz, was passiert ist und wann. Ort, beteiligte Personen und ergriffene Maßnahmen sind optional. Nach dem Absenden ist der Vorfall sofort für alle sichtbar und bleibt nachvollziehbar." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/VorfallMeldenDrawer.tsx:231` (Inline-Fehler) | „Eingabe verletzt eine Konsistenz-Regel — bitte prüfen." | Implementation-Sprache („Konsistenz-Regel"). | „Eingabe passt nicht zu den Regeln dieses Vorfalls. Bitte Felder prüfen — z. B. Zeitpunkt vor Einsatzbeginn oder Einheit nicht im Einsatz." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/MeldeLueckeDialog.tsx:110` (Inline-Fehler) | „Berechtigung oder Konsistenz-Prüfung fehlgeschlagen — bitte Eingabe prüfen." | Implementation-Sprache („Konsistenz-Prüfung"); zwei Ursachen in einer Meldung. | „Lücke konnte nicht gemeldet werden. Möglich: Bekanntgabe ist bereits geschlossen, oder die Eingabe ist zu kurz." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/ConflictResolutionList.tsx:270` | EmptyState description: „Alle Multi-Device-Konflikte wurden aufgelöst." | Implementation-Sprache („Multi-Device-Konflikte"). | „Aktuell sind keine Konflikte offen. Sobald wieder zwei Geräte parallel etwas Unterschiedliches gespeichert haben, taucht es hier auf." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/ConflictResolutionList.tsx:465` | Placeholder: „cuid2 (24 Zeichen)" | Implementation-Sprache („cuid2"). | „Einheit-ID eingeben" (oder ganz weglassen, falls das Eingabefeld nur als Filter dient — dann statt freitext einen Einheit-Picker). |
| `packages/frontend/src/features/eigenschutz/ui/organisms/PSAChangeDrawer.tsx:479–481` (Hint-Banner „Versionen divergieren") | „Versionen divergieren — bitte aktualisieren" + „… haben die ausgewählten Einheiten unterschiedliche Versionen. Aktualisiere den Server-Stand, bevor du deaktivierst — sonst greift der Lost-Update-Schutz nicht." | Implementation-Sprache („Versionen divergieren", „Server-Stand", „Lost-Update-Schutz"). | Headline: „Daten haben sich inzwischen geändert" / Body: „Die ausgewählten Einheiten haben für {Profile} unterschiedliche Stände. Bitte vor dem Deaktivieren aktualisieren — sonst überschreibst du Änderungen, die ein Kollege gerade gemacht hat." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenDrawer.tsx:522` | Placeholder: „User-ID (CUID)" | Implementation-Sprache („User-ID (CUID)"). | „Person aus dem Einsatz wählen" — und das Feld auf einen Picker umstellen, sonst ist die manuelle CUID-Eingabe sowieso kein Nutzerverhalten. (Falls Freitext bleiben muss: „ID der Person aus dem Einsatz".) |
| `packages/frontend/src/features/eigenschutz/ui/organisms/VorfallMeldenDrawer.tsx:455` | Placeholder: „User-CUID" | Implementation-Sprache („User-CUID"). | „Person aus dem Einsatz wählen" — gleicher Hinweis wie oben: lieber Picker statt Freitext. |
| `packages/frontend/src/features/eigenschutz/ui/organisms/VorfallMeldenDrawer.tsx:430` | Placeholder Wo-Freitext: „Eingang Süd, Halle 3" | Entwickler-Vokabular im Beispiel — nicht im KatS-Kontext. | „z. B. Verpflegungszelt, Sammelplatz Tor 2" (am Einsatzort sind Halle 3 / Eingang Süd untypisch — eher Sammelplatz/Verpflegung/RTW-Standort). |
| `packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenDrawer.tsx:387` | Radio-Label: „Koordinaten (WGS84)" | Implementation-Sprache („WGS84"). | „Geo-Koordinaten" — der Hinweis auf WGS84 hilft Nutzern nicht; alle Karten-Picker im Repo arbeiten auf WGS84. |
| `packages/frontend/src/features/eigenschutz/ui/molecules/KonfliktErkanntMikroBanner.tsx:81` | Headline: „Sync-Konflikt auf Abschnitt {label} – jetzt auflösen" + Body „Server-Version X, lokal erwartet Y." | Implementation-Sprache („Sync-Konflikt", „Server-Version", „lokal erwartet"). | Headline: „{label}: Änderung kollidiert — jetzt prüfen" / Body: „Auf einem anderen Gerät wurde der Stand bereits geändert. Bitte vergleichen und entscheiden." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/AmpelDashboard.tsx:71` | „Noch kein Sicherheitsstatus vorhanden." | Schwammig — Nutzer weiß nicht, was zu tun ist. | „Noch keine Einheit im Einsatz, für die ein Schutzstatus existiert. Sobald Einheiten beigetreten sind, erscheinen sie hier." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/SicherheitsregelDrawer.tsx:295` | (Create-Pfad) „Regel für den gesamten Einsatz oder einzelne Einheiten anlegen." | Knapp, aber Konsequenz fehlt: Wer sieht die Regel? Wer muss quittieren? | „Regel für den gesamten Einsatz oder einzelne Einheiten anlegen. Sobald gespeichert, erhalten die betroffenen Einheiten eine Benachrichtigung und müssen sie quittieren." |

## Tier 2 — Sollte umformuliert (unklar / redundant / verb-arm)

| File:Line | Bisheriger Text | Problem-Klasse | Vorschlag-Neutext |
| --- | --- | --- | --- |
| `packages/frontend/src/features/eigenschutz/ui/pages/EigenschutzEntryPage.tsx:31` | „Arbeitsschutz und Sicherheitsmaßnahmen" | Datenetiketten-Stil, keine Aktion erkennbar. | „Überblick über Schutzstatus, Gefährdungen, Posten und Vorfälle des laufenden Einsatzes." |
| `packages/frontend/src/features/eigenschutz/ui/pages/SicherheitsregelnPage.tsx:146` | „Spezifische Regeln für den gesamten Einsatz oder einzelne Einheiten dokumentieren und bekannt geben." | „spezifisch" und „dokumentieren" sind weich; „bekannt geben" ist gut, aber die Konsequenz fehlt. | „Regeln für den gesamten Einsatz oder einzelne Einheiten festlegen. Die Empfänger sehen sie als Banner und müssen sie quittieren." |
| `packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenPage.tsx:109` | „Pro Einheit eine Beurteilung anlegen, Gefährdungen erfassen und Schutzmaßnahmen dokumentieren." | Verb-zentriert, aber abstrakt — kein Hinweis auf Wirkung. | „Pro Einheit festhalten, welche Gefährdungen vor Ort bestehen und mit welchen Maßnahmen die Einheit geschützt ist. Daraus leiten sich später PSA-Vorgaben ab." |
| `packages/frontend/src/features/eigenschutz/ui/pages/SicherheitsregelnPage.tsx:219` (EmptyState) | „Lege die erste Regel für den Einsatz oder einzelne Einheiten an. Danach erscheint sie hier in der Übersicht." | Tautologie („danach erscheint sie hier"). | „Noch keine Regel angelegt. Lege die erste Regel für den Einsatz oder eine Einheit an — sie wird sofort an die Empfänger gepusht." |
| `packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenPage.tsx:147` (EmptyState) | „Lege die erste Beurteilung für eine Einheit an. Danach erscheint sie hier in der Übersicht." | Tautologie, analog. | „Noch keine Beurteilung angelegt. Wähle eine Einheit und starte mit einer Vorlage oder leerem Formular." |
| `packages/frontend/src/features/eigenschutz/ui/pages/PsaProfilePage.tsx:249` (EmptyState) | „Sobald Einheiten dem Einsatz beigetreten sind, kannst du hier PSA-Profile aktivieren." | Inhaltlich okay, aber „beigetreten" ist Plattformsprache. | „Sobald die ersten Einheiten dem Einsatz zugewiesen sind, kannst du hier ihre PSA-Schutzstufen festlegen." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/EigenschutzOffenePunktePanel.tsx:49` | Dialog description: „Vorfälle und Rückmeldungen im aktuellen Einsatz" | Datenetikett, keine Handlungsorientierung. | „Was wartet aktuell auf deine Reaktion? Offene Vorfälle und ungelöste Rückmeldungen aus den Einheiten." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenDrawer.tsx:295` | (Create-Pfad) „Posten für den aktuellen Einsatz anlegen." | Sehr knapp, Konsequenz fehlt. | „Neuen Sicherungsposten für diesen Einsatz anlegen. Sobald gespeichert, ist er für alle sichtbar und kann auf der Lagekarte angezeigt werden." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenDrawer.tsx:295` | (Edit-Pfad) „Bezeichnung, Standort, Personal oder Zuständigkeit anpassen." | Reine Feldliste, kein Hinweis auf Wirkung. | „Stammdaten dieses Postens ändern. Die Auflösung läuft über einen eigenen Button — hier nur Anpassungen für aktiven Betrieb." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/AufloeseSicherungspostenDialog.tsx:108` | „Diese Aktion kann nicht rückgängig gemacht werden. Bitte begründe die Auflösung — die Eingabe wird in der Versionshistorie persistiert." | „in der Versionshistorie persistiert" ist Impl-Sprache. | „Diese Aktion lässt sich nicht rückgängig machen. Bitte kurz begründen — die Begründung bleibt nachvollziehbar im Verlauf." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/MeldeLueckeDialog.tsx:150` | „Diese Rückmeldung erreicht den Sicherheitsbeauftragten direkt und ersetzt die Quittung. Die Bekanntgabe bleibt bis zur Klärung als „Lücke gemeldet" markiert." | Inhaltlich gut, aber Satz 2 ist halb Implementation („als ‚Lücke gemeldet' markiert"). | „Diese Rückmeldung geht direkt an den Sicherheitsbeauftragten und ersetzt die Quittung. Die Bekanntgabe wird als ‚Lücke gemeldet' gekennzeichnet, bis die Klärung erfolgt." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungseditorDrawer.organism.tsx:262` | „Wähle eine Seed-Vorlage oder starte mit einem leeren Formular." | „Seed-Vorlage" — Dev-Vokabular. | „Wähle eine fachliche Vorlage (z. B. nächtlicher Sanitätsdienst, CBRN-Lage) oder starte mit einem leeren Formular." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungseditorDrawer.organism.tsx:319` | „Ohne Vorlage starten und Gefährdungen selbst erfassen." | Okay, aber knapp und kein Hinweis darauf, wann das sinnvoll ist. | „Ohne Vorlage starten — sinnvoll, wenn keine der angebotenen Lagen passt oder du nur einzelne Punkte brauchst." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx:319` | (Konflikt-Banner) „Der Save-Versuch wurde nicht übernommen, damit keine fremden Änderungen überschrieben werden." | „Save-Versuch" ist Impl-Sprache, „fremde Änderungen" klingt nach Cyberangriff. | „Speichern abgebrochen, damit deine Eingabe nicht die parallelen Änderungen einer Kollegin überschreibt. Bitte aktuellen Stand neu laden und erneut prüfen." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx:329` | „Die Änderung wurde nicht übernommen. Prüfe die Verbindung und versuche es erneut." | Inhaltlich okay; „Änderung wurde nicht übernommen" ist passiv. | „Speichern fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx:338` | „Das verlinkte Item ist in dieser Beurteilung nicht mehr vorhanden." | „Item" ist Impl-Sprache. | „Diese Gefährdung wurde aus der Beurteilung entfernt — der Link führt ins Leere. Beurteilung neu öffnen, um den aktuellen Stand zu sehen." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/ConflictResolutionList.tsx:254` | Alert description: „Die Konflikt-Liste ist derzeit nicht erreichbar. Bitte erneut versuchen." | Inhaltlich okay; „nicht erreichbar" wirkt netzwerklastig. | „Die Konflikt-Liste konnte nicht geladen werden. Bitte erneut versuchen — bei wiederholtem Fehler bitte den Server-Status prüfen lassen." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/ConflictResolutionList.tsx:393` | „Konflikte können nur vom Sicherheitsbeauftragten aufgelöst werden." | Inhaltlich okay; „BEFEHLSGEBER" und „Sicherheitsbeauftragter" wechseln im Modul (s. Konsistenz-Hinweis unten). | „Konflikte auflösen darf nur der Einsatzleiter / Sicherheitsbeauftragte. Andere sehen die Konflikte zur Information." (nach Festlegung der Begriffshoheit konsistent durchziehen.) |
| `packages/frontend/src/features/eigenschutz/ui/organisms/VorfallList.tsx:55` | „Bitte erneut versuchen — bei wiederholtem Fehler den Sicherheitsbeauftragten informieren." | Inhaltlich okay; eskaliert direkt an eine Person, ohne Selbsthilfe-Schritt. | „Bitte erneut laden. Bleibt der Fehler bestehen, an die Einsatzleitung melden." |
| `packages/frontend/src/features/eigenschutz/ui/organisms/VorfallList.tsx:70` | „Filter zurücksetzen, um alle Vorfälle des Einsatzes anzuzeigen." | Inhaltlich okay; redundant zum Button-Label „Alle Filter zurücksetzen". | „Mit den aktuellen Filtern wurden keine Vorfälle gefunden." (Button trägt die Aktion.) |
| `packages/frontend/src/features/eigenschutz/ui/molecules/EigenschutzShortcutHelpPopover.tsx:77` | aria-label: „Tastaturhilfe schließen" | Inhaltlich okay; „Tastaturhilfe" ist intern üblich, in der UI sonst „Tastenkürzel". | „Tastenkürzel-Übersicht schließen" — konsistent zum Trigger-Label. |
| `packages/frontend/src/features/eigenschutz/ui/molecules/MeldeLueckeDialog.tsx:164` | Placeholder: „Schutzanzug Größe L fehlt Einheit 2 — nachgeordert 14:28" | Beispieltext ist gut, aber suggeriert ein anderes Wording als der Form-Schema-Validator. | „z. B. Schutzanzug Größe L fehlt — nachbestellt 14:28" — kürzer, ohne „Einheit 2" (die Einheit kennt das System bereits). |
| `packages/frontend/src/features/eigenschutz/ui/molecules/EigenschutzShortcutHelpPopover.stories.tsx` (nicht in dieser Liste) | — | — | — |
| `packages/frontend/src/features/eigenschutz/ui/organisms/PSAChangeDrawer.tsx:515` | Placeholder: „Warum diese Änderung?" | Frage-Form, fehlt jedoch Beispiel — Nutzer schreibt oft nur „Update". | „z. B. Schichtwechsel, neue Lagebeurteilung, Lücke nachgemeldet" |

## Tier 3 — Nice to have

| File:Line | Bisheriger Text | Problem-Klasse | Vorschlag-Neutext |
| --- | --- | --- | --- |
| `packages/frontend/src/features/eigenschutz/ui/organisms/VorfallMeldenDrawer.tsx:343` | Placeholder: „z. B. Sturz beim Aufstieg" | Okay; etwas spezifisch. | „z. B. Sturz beim Aufstieg, Reizgas-Exposition, Insektenstich" — breitere Spannweite. |
| `packages/frontend/src/features/eigenschutz/ui/organisms/VorfallMeldenDrawer.tsx:520` | Placeholder Maßnahmen: „Erstversorgung durchgeführt, RTW alarmiert" | Okay; KatS-typisch, gut. | Beibehalten. |
| `packages/frontend/src/features/eigenschutz/ui/organisms/SicherheitsregelEmpfangBanner.tsx:119` | „N weitere Sicherheitsregel(n) warten auf Quittierung." | „Quittierung" ist okay (Fachsprache der HiOrgs). | Beibehalten; ggf. „… warten auf Bestätigung" für noch breitere Verständlichkeit. |
| `packages/frontend/src/features/eigenschutz/ui/organisms/EinsatzleiterReprompEskalationBanner.tsx:63` | Banner-Headline: „Quittung für {label} überfällig" | Okay. | Beibehalten. |
| `packages/frontend/src/features/eigenschutz/ui/organisms/PsaProfilEmpfangBanner.tsx:303` | Body bei Reprompt: „Eine PSA-Bekanntgabe für deine Einheit wartet auf Quittung — bitte erneut prüfen." | Okay. | „Eine PSA-Bekanntgabe für deine Einheit wartet noch auf Bestätigung. Bitte erneut prüfen." (Begriff „Bestätigung" statt „Quittung" konsistent zur Severity-Banner-Headline.) |
| `packages/frontend/src/features/eigenschutz/ui/molecules/AcknowledgmentStatusBadge.tsx:206` | aria-label: „Empfänger-Liste" | Okay für SR. | Beibehalten. |
| `packages/frontend/src/features/eigenschutz/ui/organisms/EigenschutzSubNav.tsx:57` | aria-label: „Eigenschutz-Bereiche" | Okay für SR. | Beibehalten. |
| `packages/frontend/src/features/eigenschutz/ui/molecules/AmpelWarnBadgeList.tsx:103` | aria-label: „Warnung" | Knapp; kein Schaden, aber wenig Info für SR. | „Warnungs-Badge" oder kontextspezifischer Label (z. B. „PSA fehlt"). |

## Tier 4 — Okay (Auszug, keine Aktion)

Folgende String-Kategorien wurden geprüft und als okay eingestuft:

- A11y-Labels mit fachsprachlich-neutralen Begriffen
  („Vorfälle filtern", „Filter Zeitraum von", „Filter Zeitraum bis",
  „Filter entfernen", „Aktive PSA-Profile", „Sicherheitsstatus pro Abschnitt",
  „Versionshistorie", „Bulk-Aktionen", „Offene Punkte im Eigenschutz",
  „Überfällige PSA-Quittungen", „Erkannte Sync-Konflikte" — letzte zwei
  grenzwertig wegen „Sync-Konflikte", aber als Section-Label noch tolerabel).
- Fehlertexte mit klarer Nutzerorientierung
  („Sicherheitsregeln konnten nicht geladen werden.", „Posten wurde bereits
  aufgelöst.", „Auflösen fehlgeschlagen. Bitte erneut versuchen.").
- Drawer-Titel im Edit-Pfad (Singular und beschreibend: „Sicherungsposten
  bearbeiten", „Sicherheitsregel bearbeiten", „PSA-Profil ändern").
- Form-Counter-Hinweise („Kurzbeschreibung (1–80 Zeichen)", „N / 2000
  Zeichen").
- Empty-State-Headlines („Keine offenen Sync-Konflikte", „Noch keine
  Sicherheitsregeln", „Keine Einheiten im Einsatz", „Noch keine Vorfälle
  erfasst") — die Probleme stecken in den darunter liegenden Descriptions
  (siehe Tier 2).
- Primary-Action-Labels („Anlegen", „Speichern", „Quittieren", „Posten
  auflösen", „Senden", „Verstanden, Ausrüstung vorhanden") —
  verb-zentriert und konsequenzklar.

Geschätzte Menge in dieser Kategorie: ca. 35–45 Strings.

---

## Konsistenz-Hinweise (Cross-cutting)

Wird in der Folge-Story als Glossar verankert; hier nur Beobachtungen:

1. **Quittung vs. Bestätigung vs. Acknowledgment** —
   `SicherheitsregelEmpfangBanner` nutzt „Quittieren",
   `PsaProfilEmpfangBanner` nutzt „Verstanden, Ausrüstung vorhanden",
   `EinsatzleiterReprompEskalationBanner` spricht von „Quittung". In
   HiOrg-Sprachgebrauch sind beide gängig — Empfehlung: **„Quittierung"**
   für die formale Aktion, **„Bestätigen"** auf Primary-Buttons.
2. **Sicherheitsbeauftragter vs. Einsatzleiter vs. BEFEHLSGEBER** —
   `ConflictResolutionList:393` sagt „Sicherheitsbeauftragter",
   `EinsatzleiterReprompEskalationBanner` adressiert
   „Einsatzleiter-Rolle"; technisch ist es überall `BEFEHLSGEBER`. Im
   Sanitätsdienst der HiOrgs ist „Sicherheitsbeauftragter" eine eigene
   Rolle, getrennt vom Einsatzleiter. **Klarstellen, welche Rolle gemeint
   ist, und durchgängig dieselbe Bezeichnung verwenden.**
3. **„Profil" vs. „Schutzstufe" vs. „PSA-Profil"** — im selben Modul
   wechseln die Begriffe. PsaProfilePage spricht von „Schutzstufe",
   PsaProfilEmpfangBanner von „PSA-Bekanntgabe". Empfehlung: PSA-Profil
   bleibt als Fachterminus, aber Beschreibungstexte erklären beim ersten
   Auftreten was es ist („Schutzstufe = PSA-Profil").
4. **„Einheit" vs. „Abschnitt"** — `KonfliktErkanntMikroBanner` spricht
   von „Abschnitt", `AmpelDashboard` von „Einheit" (siehe aria-label
   „Sicherheitsstatus pro Abschnitt" vs. Body-Text). Im KatS sind das
   unterschiedliche Konzepte (Abschnitt = organisatorische Einheit
   innerhalb einer Einsatzführung; Einheit = die operative Truppe).
   **Trennen oder Cross-Reference im Glossar.**
5. **„CUID" / „cuid2"** — Niemals in User-facing Strings (siehe Tier 1).

---

## Out-of-Scope dieses Audits

- **Backend-/Schema-Strings, OpenAPI-Descriptions, Logger-Texte** — eigenes
  Audit empfohlen, da diese teils mit den Frontend-Texten kontrastiert
  werden müssen.
- **Toasts via Sonner / Notification-Center-Strings** — Eigenschutz nutzt
  bewusst Zero-Toast (UX-DR21); ein paralleles globales Notification-Audit
  kann hier andocken.
- **Dev-Hints im UI** wie `title="Verfügbar ab Story 3.6 (Rückmeldung an
  Sicherheitsbeauftragten)"` (`EquipmentChecklist.tsx:195`,
  `PsaProfilDetailDrawer.tsx:175`) — diese sind temporäre Story-Marker
  und gehören in das Story-Abschluss-Cleanup, nicht in den
  User-Tone-Rewrite.
- **PRD-/UX-Spec-Anchor-Kürzel** in Code-Kommentaren (UX-DR21, FR50, Story
  3.7 etc.) — Implementation-Vokabular, das **nicht** im User-UI auftauchen
  darf, in Code-Kommentaren aber legitim ist.
- **Tatsächliche Rewrites** der hier gelisteten Strings → Folge-Story.
- **Andere G-Goals** (G2–G7 dieses Sprints).

---

## Folge-Story-Vorschlag

**Titel:** Eigenschutz Hilfetexte-Rewrite (G8 Folge-Story)

**Vorgehensvorschlag:**

1. Vor dem Rewrite ein **kurzes Glossar** (`docs/frontend/eigenschutz-glossar.md`
   oder Erweiterung von `CONSISTENCY.md`) festlegen, das die unter
   „Konsistenz-Hinweise" genannten Begriffspaare entscheidet. Ohne
   Glossar entstehen beim Rewrite neue Inkonsistenzen.
2. Tier 1 zuerst rewriten — alle Punkte sind Customer-facing und
   risikoarm im Diff (jeweils 1–2 Zeilen).
3. Tier 2 ohne Tooltip-Sturm: für „sollte umformuliert"-Punkte erst
   pro Page einen Rewrite vornehmen und im Review-Roundtable mit UX
   gegenlesen, bevor das Modul flächig durchgezogen wird.
4. Tier 3 als Boyscout-Bonus, wenn die jeweilige Datei ohnehin
   angefasst wird — keine separate PR rechtfertigend.

**Acceptance Criteria (Entwurf):**

- AC1: Alle in Tier 1 gelisteten Strings sind durch die Vorschlag-Neutexte
  ersetzt (oder eine gleichwertige Variante, freigegeben vom Glossar).
- AC2: Glossar-Doku existiert und beantwortet die fünf
  Konsistenz-Fragen oben.
- AC3: Snapshot-/Component-Tests, die exakte String-Matches enthalten,
  sind angepasst (potenzielle Treffer: PSA-, Vorfall-, Sicherungsposten-
  und Sicherheitsregel-Test-Suiten).
- AC4: Keine Code-Begriffe (cuid2, FR-IDs, Multi-Device, Audit-Trail,
  Sender-Sicht, expectedVersion, Optimistic-Concurrency) mehr in
  User-facing Strings unter `features/eigenschutz/ui/`.
- AC5: i18n-Aufwand prüfen: aktuell sind die Strings hart kodiert.
  Falls eine i18n-Initiative ansteht, sollte die Folge-Story **nicht**
  parallel zu einem i18n-Roll-Out gefahren werden (sonst werden die
  Strings zweimal angefasst).

**Geschätzter Scope:** ~21 Tier-1-Strings + ~20 Tier-2-Strings, also etwa
40 String-Änderungen in ca. 15 Dateien, plus Glossar-Doku (~1 Tag UX-
Cross-Review). Test-Updates abhängig von der Snapshot-Dichte (Schätzung
0.5–1 Tag).

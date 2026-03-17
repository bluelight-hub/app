# Session- und API-Vertrag für Ring 2

## Ziel

Diese Notiz legt für Einstieg, Login, Server-Setup und Shell die verbindliche Session- und API-Grenze fest. Ring-2-Flächen dürfen keine eigenen Auth-, Refresh-, Token- oder Datenpfade einführen.

## Kanonische Pfade

Die folgenden Pfade sind die einzige erlaubte Einstiegsschicht für Session- und API-Verhalten im Frontend:

- `packages/frontend/src/shared/api/api.ts`
- `packages/frontend/src/shared/api/fetchWithRefresh.ts`
- `packages/frontend/src/shared/api/auth-session.ts` oder ein gleichwertiger zentraler Wrapper für Raw-Responses
- `packages/frontend/src/features/auth/api/`
- `packages/frontend/src/features/system/api/`
- `packages/frontend/src/features/server/`

Regel:

- `routes/*` bleiben dünn und enthalten keine eigene Session-, Refresh- oder Parsing-Logik.
- Komponenten in `features/*/ui` und `shared/ui/*` konsumieren nur Hooks, Query-Flows oder zentrale API-Wrapper.
- Direkte `fetch()`-Aufrufe für Einstieg und Shell sind nicht erlaubt.

## Erlaubte Ausnahmen und Generator-Gaps

Einige Backend-Verträge sind mit dem generierten Client nicht vollständig oder nicht passend typisiert. Diese Ausnahmen sind nur erlaubt, wenn sie zentral gekapselt bleiben:

- **Raw-Responses:** `auth/check` und `auth/admin/status` liefern wegen `@SkipTransform()` keine regulär gewrappten `{ data }`-Antworten. Parsing und Validierung gehören deshalb in einen zentralen Wrapper unter `shared/api/`, nicht in einzelne Hooks.
- **Root-Response:** Informationen wie die Backend-Version aus dem Root-Endpoint dürfen über einen zentralen Helper unter `shared/api/` geladen werden, solange kein passender generierter Typ existiert.
- **Servergebundene Setup-/Invite-Clients:** Temporäre Clients für Invite-Exchange oder initiales Admin-Setup sind zulässig, wenn sie zentral dokumentiert und gekapselt bleiben. Sie sind eine begründete Ausnahme für den Weg vor einer aktiven Serverbindung.

Nicht erlaubt:

- Feature-spezifische Shadow-Helper für dieselben Endpunkte
- Verteiltes JSON-Parsing in mehreren Hooks
- Zusätzliche Login-, Refresh- oder Redirect-Logik pro Route oder Komponente

## Server-Access-Token

Für den `X-Server-Access-Token` gilt ein einziger Vertrag:

- Quelle ist die aktive Serverbindung plus die zentrale, servergebundene Token-Persistenz.
- Feature-Stores halten keine JWTs, Roh-Tokens oder sonstigen Session-Geheimnisse; im Server-State darf höchstens ein nicht-sensitiver Marker für einen separat gespeicherten Token liegen.
- Es gibt keinen separaten Shadow-Storage für denselben aktiven Token.
- Persistiert werden im Client-State nur erlaubte, nicht-sensitive Daten wie Redirect-Ziele, Server-Auswahl oder Recovery-Kontext; der rohe Server-Access-Token liegt ausschließlich im dedizierten Token-Pfad.

Wenn ein Server-Access-Token ungültig wird, wird der zentrale Token-Pfad bereinigt. Komponenten dürfen diesen Zustand nicht lokal „reparieren“ oder einen zweiten Speicherpfad eröffnen.

## Refresh-, Redirect- und Fehlerverhalten

`fetchWithRefresh.ts` ist die zentrale Stelle für:

- `credentials: 'include'`
- Anfügen des `X-Server-Access-Token`
- Refresh-Queue bei parallelen `401`-Antworten
- Redirect-Entscheidungen für Setup- und Manage-Flows

Verhalten:

- **401 ohne gültige Session:** zentraler Refresh-Versuch, danach kontrollierter Fehlerpfad
- **401 wegen Server-Access-Token:** kein lokaler Retry in Features, sondern zentraler Redirect in den Server-Manage-Kontext
- **503 `SERVER_NOT_SETUP`:** zentraler Redirect in den Setup-Kontext
- **Fehler-, Offline- und Reauth-Zustände:** werden in Einstieg und Shell textlich verständlich dargestellt; die nächste zulässige Aktion muss klar sein

## Prüfliste für Folge-Stories

Vor dem Mergen von Ring-2-Arbeit prüfen:

1. Nutzt der neue Code ausschließlich zentrale Hooks, Query-Flows oder Wrapper aus `shared/api/`, `features/auth/api`, `features/system/api` oder `features/server`?
2. Wurde kein neuer manueller `fetch()`-Pfad für Einstieg oder Shell eingeführt?
3. Liegt Raw-Response-, Root-Response- oder Setup-Logik zentral gekapselt statt im Feature-Hook?
4. Kommt der aktive `X-Server-Access-Token` nur aus dem zentralen servergebundenen Token-Pfad?
5. Halten Stores oder UI-Komponenten keine sensiblen Session-Geheimnisse?
6. Laufen Redirects für `401` und `503` ausschließlich über den zentralen Refresh-/Redirect-Pfad?
7. Wurden gezielte Tests für geänderte Session-/API-Pfade ergänzt oder angepasst?

Datei: `docs/frontend/session-api-contract-ring-2.md`

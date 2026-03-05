# Einsatz Mutation Authorization

Fachliche Regel für mutierende Einsatz-Endpunkte:

- `PATCH /einsatz/:id`
- `POST /einsatz/:id/start`
- `POST /einsatz/:id/complete`
- `POST /einsatz/:id/archive`

Ein Benutzer darf mutieren, wenn mindestens eine der folgenden Bedingungen erfüllt ist:

1. Benutzer hat Systemrolle `ADMIN` oder `SUPER_ADMIN`.
2. Benutzer ist Ersteller des Einsatzes (`einsaetze.createdBy`).
3. Benutzer ist aktiver Einsatz-Teilnehmer (`einsatz_teilnehmer.leftAt IS NULL`).
4. Benutzer hat im Einsatz eine Rollenzuweisung `ERSTELLER` oder `BEFEHLSGEBER`.

Wenn keine Bedingung zutrifft, wird `403 Forbidden` zurückgegeben.

---
name: create-gh-issue
description: Erstellt strukturierte GitHub-Issues über die gh CLI aus groben Notizen, Anforderungen, Fehlerbeschreibungen oder Arbeitsaufträgen. Verwende diesen Skill, wenn Codex ein neues Issue anlegen, den passenden Issue-Typ auswählen, einen aussagekräftigen deutschen Titel mit passendem Emoji formulieren und vorhandene Repository-Labels sinnvoll zuordnen soll.
---

# Create Gh Issue

Erstelle GitHub-Issues so, dass Titel, Beschreibung und Labels ohne Nacharbeit nutzbar sind.
Arbeite standardmäßig auf Deutsch, sofern der Nutzer oder das Repository nichts anderes vorgibt.

## Workflow

### 1. Kontext einsammeln

Ermittle zuerst:

- Repository (`git remote -v` oder explizite Nutzerangabe)
- Rohinhalt für das Issue
- betroffene Bereiche, Plattformen oder Komponenten
- erkennbare Priorität, Dringlichkeit oder Auswirkungen

Wenn wesentliche Fakten fehlen, ergänze keine erfundenen Details.
Markiere Unbekanntes offen im Issue, statt es zu raten.

### 2. Verfügbare Labels laden

Lade vor der Label-Auswahl immer die aktuellen Labels des Ziel-Repositories:

```bash
gh label list --repo <owner/repo> --limit 200 --json name,description,color
```

Nutze ausschließlich Labels, die dort tatsächlich existieren.
Erfinde keine neuen Labels und verwende lieber weniger Labels als falsche.

### 3. Issue-Typ auswählen

Wähle den Issue-Typ nach dem eigentlichen Ziel, nicht nach einer Standardschablone.
Nutze die Vorlagen in `references/issue-templates.md`.

Kurzheuristik:

- `User Story`: neue fachliche Funktion mit klarer Nutzerrolle und erkennbarem Nutzen
- `Bug`: vorhandenes Verhalten ist fehlerhaft oder regressiv
- `Verbesserung/Task`: konkrete Änderung ohne saubere Story-Formulierung
- `Tech Debt/Chore`: interne technische Arbeit, Aufräumen, Refactoring, Wartung
- `Spike/Research`: offene Frage, Bewertung oder Voruntersuchung
- `Docs`: Dokumentation fehlt, ist falsch oder muss erweitert werden

### 4. Titel formulieren

Formuliere einen präzisen Titel auf Deutsch mit passendem Emoji am Anfang.
Das Emoji muss den dominanten Issue-Typ markieren.
Nutze die Tabelle in `references/issue-templates.md`.

Regeln:

- Muster: `<emoji> <klarer Ziel- oder Problemkern>`
- keine generischen Titel wie `Bugfix`, `Feature`, `Todo`
- so konkret formulieren, dass der Gegenstand ohne Body grob verständlich ist
- bei Bugs das sichtbare Problem nennen, nicht nur die vermutete Ursache
- bei Features den Nutzen oder die Funktion benennen

### 5. Body strukturieren

Erzeuge den Body nicht frei, sondern mit der passenden Vorlage aus `references/issue-templates.md`.

Pflichtregeln:

- nur relevante Abschnitte aufnehmen
- leere Abschnitte vermeiden
- unklare Punkte explizit als offen markieren
- Akzeptanzkriterien oder Definition of Done nur aufnehmen, wenn sie für den Typ sinnvoll sind
- User-Story-Form nur verwenden, wenn Rolle, Ziel und Nutzen belastbar ableitbar sind

### 6. Labels zuordnen

Wähle Labels aus den tatsächlich vorhandenen Repository-Labels in dieser Reihenfolge:

1. Typ-Label
2. Bereichs- oder Komponenten-Label
3. Prioritäts- oder Impact-Label
4. Plattform- oder Domain-Label
5. Status-Label nur dann, wenn das Repository solche Labels aktiv für neue Issues nutzt

Bevorzuge wenige, trennscharfe Labels.
Vermeide redundante Labels derselben Dimension.

### 7. Issue anlegen

Schreibe den finalen Body zuerst in eine temporäre Datei und lege das Issue anschließend per `gh` an.
Nutze `--body-file` statt `--body`, damit Formatierung und Zeilenumbrüche stabil bleiben.

Beispiel:

```bash
gh issue create \
  --repo <owner/repo> \
  --title "<emoji> <titel>" \
  --label "<label-1>" \
  --label "<label-2>" \
  --body-file /tmp/create-gh-issue.md
```

Wenn das Repository keine passenden Labels für eine Dimension hat, lasse diese Dimension weg.
Öffne den Browser nur, wenn der Nutzer das ausdrücklich verlangt.

### 8. Ergebnis berichten

Melde nach erfolgreicher Erstellung:

- finalen Titel
- verwendeten Issue-Typ
- gesetzte Labels
- Issue-URL oder Issue-Nummer

Wenn `gh` wegen Authentifizierung, Rechten oder fehlendem Repository scheitert, nenne den konkreten Blocker.

## Referenz

Lade `references/issue-templates.md` vor dem Schreiben des Titels und des Bodys.

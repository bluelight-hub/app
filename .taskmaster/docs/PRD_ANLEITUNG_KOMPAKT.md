# PRD Quick Guide für Task Master

## PRD-Struktur (PFLICHT)

```
<context>
# Projektübersicht
[Vision, Zielgruppe, Business Value]

# Kernfunktionen
[Was soll das Produkt können?]

# Benutzererfahrung
[Wie soll es sich anfühlen?]
</context>

<PRD>
# Technische Architektur
[Tech Stack, APIs, Datenmodelle]

# Entwicklungs-Roadmap
[MVP → Phase 2 → Phase 3]

# Logische Abhängigkeitskette
[Was muss zuerst gebaut werden?]

# Risiken und Gegenmaßnahmen
[Technische und Business-Risiken]
</PRD>
```

## Schnellstart

```bash
# 1. PRD erstellen (nutze prd_template.txt)
cp .taskmaster/templates/prd_template.txt .taskmaster/docs/mein_projekt_prd.txt

# 2. Tasks generieren
mcp__task_master__parse_prd({
  projectRoot: '/path/to/project',
  input: '.taskmaster/docs/mein_projekt_prd.txt',
  numTasks: '15-25',  // AI bestimmt optimale Anzahl
  research: true
})

# 3. Komplexität analysieren & expandieren
mcp__task_master__analyze_project_complexity({
  projectRoot: '/path/to/project',
  threshold: 7
})

mcp__task_master__expand_all({
  projectRoot: '/path/to/project',
  prompt: 'Fokus auf minimale funktionsfähige Version mit Kernfeatures'
})
```

## PRD-Checkliste

✅ **Must-Have**:

- [ ] `<context>` und `<PRD>` Tags vorhanden
- [ ] User Stories (Als X möchte ich Y damit Z)
- [ ] Technischer Stack definiert
- [ ] MVP vs. Nice-to-have getrennt
- [ ] Abhängigkeiten klar beschrieben

❌ **Vermeiden**:

- Zu viele Implementierungsdetails
- Unklare Prioritäten
- Fehlende Erfolgskriterien
- Technologie vor Nutzerbedürfnis

## Mini-Templates

### SaaS MVP

```
<context>
Problem: [Was lösen wir?]
Zielgruppe: [Für wen?]
USP: [Warum wir?]
</context>
<PRD>
MVP (Phase 1):
- User Auth
- Core Feature
- Basic Dashboard

Tech: Next.js, Supabase, Vercel
</PRD>

```

### Mobile App

```
<context>
App-Idee: [Einzeiler]
Plattform: iOS/Android
Monetarisierung: [Model]
</context>
<PRD>
Core Features:
1. Onboarding
2. Hauptfunktion
3. Notifications

Performance: <2s launch, offline-fähig
</PRD>
```

## Pro-Tipps

1. **Starte klein**: 15-25 Top-Level Tasks reichen
2. **Iteriere**: PRD wächst mit dem Projekt
3. **AI nutzen**: `research: true` für bessere Tasks
4. **Team einbeziehen**: PRDs nie alleine schreiben
5. **Messen**: Jede Story braucht Erfolgskriterien

## Workflow in 4 Schritten

```typescript
// 1. Parse PRD → Tasks
await mcp__task_master__parse_prd({...})

// 2. Analyse → Expansion
await mcp__task_master__analyze_project_complexity({...})
await mcp__task_master__expand_all({...})

// 3. Sprint → Entwicklung
await mcp__task_master__next_task({...})
await mcp__task_master__set_task_status({...})

// 4. Lernen → Anpassen
await mcp__task_master__update_task({...})
await mcp__task_master__add_task({...})
```

---

**Vollständige Anleitung**: PRD_ANLEITUNG.md
**Beispiel-PRD**: example_prd.txt
**Template**: prd_template.txt

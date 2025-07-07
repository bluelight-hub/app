# GitHub Issues Update - Kurzanleitung

## Automatisches Update-Script

Ein Script wurde erstellt, um alle GitHub Issues automatisch zu aktualisieren:

```bash
./scripts/update-github-issues.sh
```

## Script-Verwendung

### Einzelnes Issue aktualisieren

```bash
./scripts/update-github-issues.sh -i 30
```

### Batch-Update ab bestimmter Issue-Nummer

```bash
./scripts/update-github-issues.sh -s 29  # Standard: ab Issue #29
```

### Alle Issues aktualisieren

```bash
./scripts/update-github-issues.sh -a
```

### Issue mit spezifischem Typ aktualisieren

```bash
./scripts/update-github-issues.sh -i 30 -t Task
```

## Was macht das Script?

1. **Issue Type** wird automatisch erkannt:

   - **Task**: Bei "Feature:", "Tool:", "Security Feature:", "Refactor", "Test" im Titel
   - **Feature**: Bei allen anderen Issues (Standard)

2. **Milestone** wird automatisch zugewiesen:

   - **Alpha 0.1**: Für die meisten Issues (Standard)
   - **Manuell**: Bei erweiterten Features (Maplibre, OpenFireMap, etc.)

3. **Projekt v1.0** wird automatisch verlinkt

## Manuelle Nacharbeit

Nach dem Script-Lauf sollten folgende Issues manuell überprüft werden:

- Issues ohne Milestone (erweiterte Features)
- Issues mit speziellen Anforderungen

## Hilfe

```bash
./scripts/update-github-issues.sh --help
```

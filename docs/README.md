# Bluelight-Hub Architektur-Dokumentation

Diese Dokumentation beschreibt die Architektur des Bluelight-Hub-Systems nach dem arc42-Template. Sie bietet einen umfassenden Überblick über die Architekturentscheidungen, Strukturen und Konzepte des Systems.

## Dokumentationsstruktur

Die Dokumentation ist nach dem arc42-Template aufgebaut und in AsciiDoc verfasst.

- `index.adoc` - Hauptdokument, das alle anderen Abschnitte einbindet
- `architecture/` - Enthält alle Architektur-Abschnitte nach arc42-Gliederung
- `architecture/images/` - Enthält generierte Diagramme und Bilder
- `architecture/diagrams.adoc` - Enthält Beispieldiagramme in Mermaid

## Mermaid-Diagramme mit Kroki

Die Dokumentation nutzt Mermaid-Diagramme über die Asciidoctor-Kroki-Erweiterung. Kroki ist ein Dienst zur Konvertierung von textuellen Diagrammspezifikationen in Grafiken, der verschiedene Diagrammtypen unterstützt.

### Eingebettete Diagramme

```adoc
[kroki, format=mermaid]
....
graph TD
    A[Client] --> B[Load Balancer]
    B --> C[Server1]
    B --> D[Server2]
....
```

### Externe Diagrammdateien

```adoc
.Titel des Diagramms
[kroki, format=mermaid, svg]
include::images/diagramm.mmd[]
```

### Wichtige Attribute für Kroki

- `kroki-server-url` ist in der Hauptdatei `index.adoc` definiert und zeigt auf https://kroki.io
- Für alternative Server kann das Attribut angepasst werden
- Unterstützte Formate: `svg` (Standard), `png`, `pdf`

## Voraussetzungen für lokales Bauen

### Chromium für PDF-Generierung

Die PDF-Generierung verwendet Asciidoctor-Web-PDF, welches Puppeteer benötigt. Puppeteer erfordert Chromium.

**Wichtig:** Chromium muss manuell installiert werden.

#### macOS

```bash
brew install chromium
```

#### Linux Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y chromium-browser
```

#### Windows

```bash
# Mit Chocolatey
choco install chromium

# Manuelle Installation:
# Laden Sie Chromium von https://www.chromium.org/getting-involved/download-chromium herunter
```

### PDF-Styling

Die PDF-Dokumente verwenden ein benutzerdefiniertes CSS für ein verbessertes Erscheinungsbild:

- Die Stilregeln befinden sich in `docs/styles/bluelight-pdf.css`
- Das CSS wird über den Parameter `-s docs/styles/bluelight-pdf.css` im Buildsystem eingebunden

Um das Styling zu ändern, modifizieren Sie die CSS-Datei und bauen Sie die Dokumentation neu.

## Dokumentation lokal bauen

Nach der Installation der Abhängigkeiten kann die Dokumentation mit pnpm gebaut werden:

```bash
# Abhängigkeiten installieren
pnpm install

# HTML und PDF bauen
pnpm docs:build

# Nur HTML bauen
pnpm docs:html

# Nur PDF bauen
pnpm docs:pdf
```

Die generierten Dateien befinden sich im Verzeichnis `dist/docs/`.

## Dokumentation bearbeiten

Bei der Bearbeitung sind folgende Standards zu beachten:

1. AsciiDoc-Syntax für Texte und Strukturierung
2. Mermaid für Diagramme über Kroki
3. arc42-Struktur für die inhaltliche Gliederung

## Dokumentation deployen

Die Dokumentation wird automatisch bei Änderungen im `main`-Branch auf Cloudflare Pages veröffentlicht.
Der Build-Prozess wird durch GitHub Actions gesteuert und ist in `.github/workflows/docs.yml` definiert.

## Erforderliche Secrets für den Deploy

Für das Deployment auf Cloudflare Pages werden folgende Secrets benötigt:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Diese müssen in den GitHub Repository Secrets hinterlegt werden. 
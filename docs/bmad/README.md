# BMad AI-Framework Dokumentation

Dieses Verzeichnis enthält **AI-gesteuerte Entwicklungsdokumente** für das BMad-Framework.

## 📁 Struktur

```
bmad/
├── prd/                # Product Requirements Documents
│   ├── etb-enhancement-prd.md
│   └── lagekarte-prd.md
├── features/           # Feature-Architekturen (AI-generiert)
│   ├── lagekarte/
│   └── etb/
├── stories/            # User Stories
│   └── etb-*.md
├── epics/              # Epic-Dokumente
└── qa/                 # QA Assessments & Gates
    ├── assessments/
    └── gates/
```

## 🔧 BMad Configuration

BMad wird über `.bmad-core/core-config.yaml` konfiguriert:

```yaml
qa:
  qaLocation: docs/bmad/qa
prd:
  prdShardedLocation: docs/bmad/prd
architecture:
  architectureShardedLocation: docs/bmad/features
devStoryLocation: docs/bmad/stories
```

## 🤖 Verwendung

### Feature-Entwicklung mit BMad

```bash
# 1. Architekt erstellt Feature-Architektur
@architect /BMad create-arch <feature-name>
# → Generiert docs/bmad/features/<feature-name>/*.md

# 2. Story Manager erstellt Stories
@sm /BMad create-story
# → Generiert docs/bmad/stories/*.md

# 3. QA erstellt Assessments
@qa /BMad risk
# → Generiert docs/bmad/qa/assessments/*.md
```

## 📚 Dokumentation

- **BMad User Guide**: `.bmad-core/user-guide.md`
- **BMad Workflows**: `.bmad-core/workflows/`
- **Brownfield Guide**: `../development/brownfield-guide.md`

## ⚖️ Verhältnis zu arc42

- **arc42** (`docs/architecture/`) = Offizielle, langfristige Architektur-Dokumentation
- **BMad** (`docs/bmad/`) = AI-Arbeitsdokumente für Feature-Entwicklung

**Integration:** arc42 referenziert BMad-Features (siehe ADR-021)

## 🔗 Siehe auch

- [Arc42 Dokumentation](../architecture/)
- [Development Guides](../development/)
- [ADR-021: BMad Integration](../architecture/adr/021-bmad-documentation-integration.adoc)

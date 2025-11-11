# Performance-Optimierungen

## Strategische Indexes

- **Composite Indexes**: Für häufige Query-Patterns (`status + createdAt`, `etbId + timestamp`)
- **Einzelne Indexes**: Für Foreign Keys und häufig gefilterte Felder
- **MGRS Index**: Für schnelle geografische Suchen

## JSON(B) Optimierung

- PostgreSQL JSONB für performante JSON-Queries
- Metadata-Felder als JSONB für flexible Erweiterungen

---

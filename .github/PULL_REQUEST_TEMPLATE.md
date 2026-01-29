## Zusammenfassung

<!-- Kurze Beschreibung der Änderungen -->

## Änderungen

<!-- Liste der wichtigsten Änderungen -->

-

## Typ der Änderung

- [ ] 🐛 Bugfix
- [ ] ✨ Neues Feature
- [ ] ♻️ Refactoring
- [ ] 📝 Dokumentation
- [ ] 🧪 Tests
- [ ] 💥 Breaking Change

## Testing

<!-- Wie wurden die Änderungen getestet? -->

- [ ] Unit Tests hinzugefügt/aktualisiert
- [ ] Manuell getestet
- [ ] E2E Tests (falls relevant)

---

## Checklisten

### Domain Events (falls zutreffend)

> **Wichtig:** Neue Domain Events müssen an mehreren Stellen registriert werden!

- [ ] Event-Klasse erstellt unter `domain/events/` oder `domain/<context>/events/`
- [ ] Event-Name in `EVENT_NAMES` definiert (`domain/events/event-names.ts`)
- [ ] Event im `EventDeserializer` registriert (`infrastructure/outbox/event-deserializer.ts`)
- [ ] Event-Namen Convention eingehalten (lowercase, dot-separated, z.B. `einsatz.created`)
- [ ] Import-Statement für Event-Klasse im Deserializer hinzugefügt

### API Änderungen (falls zutreffend)

- [ ] `pnpm run generate-api` ausgeführt nach Backend-Änderungen
- [ ] `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` Decorators verwendet (nicht `@ApiOkResponse`)

### Code Quality

- [ ] `pnpm lint` läuft ohne Fehler
- [ ] `pnpm --filter @bluelight-hub/backend test` läuft ohne Fehler
- [ ] Keine `import type` für Injectable Classes (NestJS DI)

---

## Verknüpfte Issues

<!-- z.B. Closes #123, Fixes #456 -->


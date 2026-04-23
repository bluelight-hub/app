# Eigenschutz-Event-Framework

**Story 1.7** liefert das Framework: die abstrakte Basisklasse, den
vor-befüllten Namespace mit 14 Event-Namen und die Konsistenz-Spec. Konkrete
Event-Klassen und die 4-Stellen-Registrierung landen pro Event in Epic 2–5.

**Pflichtlektüre vor dem ersten Eigenschutz-Event:** Architecture §B13
(`_bmad-output/planning-artifacts/architecture.md:734-751`, Event-Katalog) und
§D (`architecture.md:1011-1062`, Event-Patterns + ADR-006-Broadcast-Scope).

## Basisklasse

`EigenschutzDomainEvent extends DomainEvent` erzwingt `einsatzId` (WebSocket-
Scope) und `userId` (Urheber), optional `einheitId`. Eine konkrete Klasse sieht
so aus:

```ts
export class PsaProfilGeaendertEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    public readonly psaProfilId: string,
    public readonly aktiv: boolean,
    einheitId?: string,
    aggregateId?: string,
  ) {
    super(einsatzId, userId, einheitId, aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT;
  }
}
```

## Dateien pro neuem Event

Am Beispiel `PsaProfilGeaendert`:

| Pfad                                                                                 | Inhalt                                                                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `domain/eigenschutz/events/psa-profil-geaendert.event.ts`                            | Subklasse von `EigenschutzDomainEvent`, `static eventName() = EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT`.                    |
| `domain/eigenschutz/events/__tests__/psa-profil-geaendert.event.spec.ts`             | Equality-Invariante, `eventName()`-Assert, CUID2-Format.                                                                        |
| `application/eigenschutz/event-handlers/{aspect}.handler.ts`                         | Pro Aspect (`AmpelProjection`, `WebSocket`, `Push`, …) eigener Handler, implementiert `IEventHandler<PsaProfilGeaendertEvent>`. |
| `infrastructure/eigenschutz/event-adapters/psa-profil-geaendert-{aspect}.adapter.ts` | `@OnEvent(EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT)`, delegiert via DI-Token an den Handler.                                |

## 4-Stellen-Registrierung (NFR-I3 / ADR-006)

Jedes Eigenschutz-Event MUSS gleichzeitig in allen vier Dateien eingetragen
werden — sonst schlägt
`infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts` fehl.

1. **Serializer-Switch** — `infrastructure/outbox/event-serializer.ts`:
   `case '{eventName}':` + private `serialize{Event}`-Methode.
2. **Deserializer-Registry** — `infrastructure/outbox/event-deserializer.ts`:
   Map-Eintrag `['{eventName}', this.deserialize{Event}.bind(this)]` +
   private `deserialize{Event}`-Methode.
3. **Adapters-Module-Provider** —
   `infrastructure/events/event-adapters.module.ts`: Adapter-Klasse in
   `providers`, Import in der Barrel-Zeile oben.
4. **Adapters-Index-Barrel** — `infrastructure/events/adapters/index.ts`:
   `export * from './{event-slug}-{aspect}.adapter';`.

Die Konsistenz-Spec erwartet das PascalCase- bzw. Slug-Derivat des
eventName:

- **Klassen-Prefix (Stelle 3):** `PascalCase(eventName)`, z. B.
  `eigenschutz.psa_profil_geaendert` → `EigenschutzPsaProfilGeaendert…Adapter`.
- **Datei-Slug (Stelle 4):** `slug(eventName)`, z. B.
  `eigenschutz.psa_profil_geaendert` → `eigenschutz-psa-profil-geaendert-…`.

Weicht eure Namenswahl davon ab, muss die Heuristik in der Spec mitgehen —
sonst produziert sie false-negatives/false-positives.

## DI-Token-Konvention

Neue Handler-Tokens in `infrastructure/di-tokens.ts` → `EVENT_HANDLER`:

```ts
PSA_PROFIL_GEAENDERT_WEBSOCKET: Symbol('IEventHandler<PsaProfilGeaendertEvent>:WebSocketBroadcast'),
```

- **Key:** `UPPER_SNAKE_CASE` aus `EVENT_NAMES.EIGENSCHUTZ` + `_{ASPECT}`.
- **Aspect:** `PROJECTION` | `WEBSOCKET` | `ETB` | `TELEMETRY` | `PUSH`.
- **Symbol-Description:** `IEventHandler<{Event}>:{Aspect}` — spiegelt den
  DI-Zweck im Konsole-Log.

## Konsistenz-Spec als CI-Gate

`eigenschutz-event-registry.spec.ts` iteriert über
`EVENT_NAMES.EIGENSCHUTZ` und zählt pro Name die 4 Stellen.

- `0/4` → OK (Framework-Phase, Event noch nicht implementiert).
- `4/4` → OK (Event vollständig registriert).
- `1–3/4` → **FAIL** mit Fehlermeldung inklusive „Fehlende Stellen"-Liste.

Der Positiv-Sanity-Check nutzt `EVENT_NAMES.SYSTEM.WARNUNG = 'system.warnung'`
als bekanntes 4/4-Referenzevent.

## Smoke-Test als Vorlage

`eigenschutz-smoke.integration.spec.ts` demonstriert den End-to-End-Pfad
(EventEmitter → `@OnEvent`-Adapter → `EinsatzEventsGateway.broadcastToEinsatz`)
mit einem transient gemockten Dummy-Event. Epic-2-Dev-Stories können den
gleichen Aufbau als Template nehmen — die Serializer-/Deserializer-Override
via `jest.spyOn` inkl. `afterEach`-Teardown ist Pflicht, sonst leakt der
Test-Eintrag in nachfolgende Specs.

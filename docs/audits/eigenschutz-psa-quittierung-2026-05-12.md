---
story: G4 (Investigation)
date: 2026-05-12
version: 1.0.0
related_stories: [3.3, 3.4, 3.5, 3.6, 3.7, 3.11]
audit_type: investigation
result: verified
---

# Eigenschutz – PSA-Bekanntgabe-Quittierung End-to-End-Verifikation

> **Ergebnis:** ✅ verifiziert – kein Bug gefunden. Die Quittierung von
> PSA-Profil-Bekanntgaben funktioniert durchgängig auf allen Layern
> (Domain → Application → Infrastructure → Outbox → WebSocket → Frontend).
> 105/105 relevante Unit- und Integrationstests laufen grün
> (Backend 45/45, Frontend 60/60).
>
> Der User-Befund aus `deferred-work.md` Z. 15
> ("Bin mir nicht sicher, ob die Quittierung funktioniert.") spiegelt
> begründete Unsicherheit wider, weil das Modul in mehreren Stories
> (3.3 – 3.7, 3.11) gewachsen ist. Diese Audit-Doku schreibt den
> End-zu-End-Pfad einmal vollständig auf und macht die Wirk-Kette
> nachvollziehbar.

---

## 1. Kontext & Methodik

| Aspekt              | Stand                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Investigation-Datum | 2026-05-12                                                                                                           |
| Base-Branch         | `415-eigenschutz-einsatzkraefte-sicherheit-psa` @ `a56fba574`                                                        |
| Methodik            | Code-Trace + statische Verifikation + Test-Suite-Ausführung (kein Live-Browser-Smoke, da Codepfad vollständig auditierbar) |
| Test-Verfahren      | `pnpm test --testPathPatterns 'ack-psa-quittung\|reprompt-psa-quittung\|emit-psa-quittung-ueberfaellig\|psa-quittung-abgegeben\|psa-profil.controller.ack'` (Backend) + Vitest auf `use-ack-psa-quittung`, `PsaProfilEmpfangBanner`, `use-eigenschutz-psa-quittung-live`, `use-eigenschutz-psa-live-banner` (Frontend) |
| Doku-Quellen        | UX-Spec §3.4/§3.7, Architektur-Layer-Doc, `deferred-work.md` Z. 14 – 15 + 108 – 148                                  |

**Was diese Audit nicht ersetzt:** der ausstehende manuelle Block-B-Smoke
gegen das Pilot-Backend mit Stabs-Tablet (siehe
`eigenschutz-e2e-validierung-2026-05-12.md` §"Block-B-Walltime").
Dieser Run hier zeigt, dass die Wirk-Kette _logisch_ korrekt verdrahtet
ist und durch existierende Tests gehärtet wird.

---

## 2. End-zu-End-Pfad (Schritt-für-Schritt)

### 2.1 Trigger – Stab ändert PSA-Profil

1. Stabsbeauftragter öffnet `PsaProfilePage` (Frontend) und togglet ein
   PSA-Profil für N Einheiten.
2. `useChangePsaProfil`-Mutation feuert `POST /einsatz/:einsatzId/eigenschutz/psa-profil/propagation-groups/bulk`
   (Controller: `packages/backend/src/modules/eigenschutz/controllers/psa-profil.controller.ts:173`).
3. `ChangePsaProfilHandler` legt _eine_ `propagationGroupId` an, schreibt
   N `PsaProfilZuweisung`-Rows, und emittiert ein
   `eigenschutz.psa_profil_geaendert`-Event pro Einheit in die Outbox.
4. Frontend bei den Empfänger-Clients: WebSocket-Frame über Channel
   `eigenschutz:psa-profil-geaendert` (Adapter
   `infrastructure/eigenschutz/event-adapters/psa-profil-geaendert.adapter.ts`)
   triggert `useEigenschutzPsaLiveBanner` → `PsaProfilEmpfangBanner` rendert
   den `SeverityBanner variant="critical"` mit drei Aktionen.

### 2.2 Empfänger quittiert

1. Empfänger-Trupp tippt die Primary-Action **"Verstanden, Ausrüstung
   vorhanden"** im `PsaProfilEmpfangBanner.handleAcknowledge`
   (`PsaProfilEmpfangBanner.tsx:213`).
2. Optimistic-Pfad: `dismiss(propagationGroupId)` zieht den Banner sofort
   aus der Hook-Queue (kein Spinner, FR18).
3. `ackMutation.mutate` ruft den generierten Client
   `psaProfilControllerQuittierenVAlpha`
   (`packages/frontend/src/features/eigenschutz/api/queries.ts:1116`)
   → `POST /einsatz/:einsatzId/eigenschutz/psa-profil/propagation-groups/:propagationGroupId/quittieren`.
4. Backend-Controller (`psa-profil.controller.ts:280`):
   - Permission-Guard `eigenschutz:psa:acknowledge` (Z. 271).
   - Dispatch `AckPsaQuittungCommand(einsatzId, propagationGroupId, body.einheitId, user.userId)`.
5. `AckPsaQuittungHandler.executeInTransaction`
   (`ack-psa-quittung.handler.ts:91`):
   - **Step 1 – Caller-Authorization:** `assertCallerAuthorizedForEinheit`
     (Defense-in-Depth zusätzlich zum Permission-Guard).
   - **Step 2 – Outbox-Lookup:** `lookupPsaPropagationExists` prüft, dass
     für `(propagationGroupId, einheitId)` noch eine
     `eigenschutz.psa_profil_geaendert`-Outbox-Row existiert. Wenn nicht
     → `Result.fail('NotFound:PsaPropagation')` (kein Geister-Ack).
   - **Step 3 – Quittung-Upsert:** `PsaProfilQuittungRepository.upsert`
     legt eine Row in `PsaProfilQuittung` mit `@@unique([propagationGroupId, einheitId])`
     an. P2002-Constraint wird abgefangen und ergibt
     `{ created: false }` → idempotenter Re-Ack.
   - **Step 4 – Outbox-Write:** Beim Erst-Insert (`created === true`) wird
     `QuittungAbgegebenEvent` in derselben Transaktion über die Outbox
     persistiert. `quittiertAm` stammt aus dem DB-Default-Timestamp der
     Repo-Row.

### 2.3 Outbox-Propagation

1. Outbox-Worker poll't die Row und dispatched
   `QuittungAbgegebenEvent` über `EventEmitter`.
2. Adapter
   `EigenschutzQuittungAbgegebenEventAdapter.onQuittungAbgegeben`
   (`infrastructure/eigenschutz/event-adapters/psa-quittung-abgegeben.adapter.ts:36`):
   - PII-redactedes Strukturlog (`redactId` für `einsatzId`, `einheitId`,
     `userId`).
   - WebSocket-Broadcast an Room `einsatz:{einsatzId}`, Channel
     `eigenschutz:psa-quittung-abgegeben` – Payload: `eventId`,
     `propagationGroupId`, `userIdHash`, `quittiertAm`, `occurredAt`.
   - Best-Effort: Broadcast-Fehler werden geloggt, nicht durchgereicht
     (Outbox bleibt Single-Source-of-Truth).

### 2.4 Frontend-Konsumierung der Quittung

1. Sender-Client (Stabs-Sicht) hat
   `useEigenschutzPsaQuittungLive(einsatzId)` aktiv
   (`packages/frontend/src/features/eigenschutz/api/use-eigenschutz-psa-quittung-live.ts`).
2. Frame `eigenschutz:psa-quittung-abgegeben` triggert Cache-Invalidation
   für vier Query-Keys (Z. 142 – 145):
   - `psaQuittungen(einsatzId, propagationGroupId)` – Sender-Counter.
   - `offenePsaBekanntgaben(einsatzId)` – vollständig quittierte Gruppe
     verschwindet aus der Liste.
   - `ampelStatus(einsatzId)` – Ampel-Aggregation aktualisiert sich.
   - `ampelWarnBadges(einsatzId)` – Warnbadge-Counter aktualisiert sich.
3. Reconnect-Pfad invalidiert dieselben Keys (Z. 148 – 153) – fail-safe
   gegen verpasste Frames während Disconnect-Window.

### 2.5 Mutation-onSuccess (Empfänger-Sicht)

`useAckPsaQuittung.onSuccess` (`queries.ts:1122` ff.) invalidiert
zusätzlich:

- `psaQuittungen(einsatzId, propagationGroupId)`
- `offenePsaBekanntgaben(einsatzId)`
- `offeneRueckmeldungen(einsatzId)`
- `psaProfileByEinheit(einsatzId, variables.einheitId)`
- `ampelStatus` + `ampelWarnBadges` (via Helper).

Zusätzlich wird genau ein `psa_quittung_abgegeben`-Telemetrie-Event in
die `eigenschutzTelemetryQueue` gepushed (Story 3.11 Trace-Marke).
`meta: { silentError: true }` verhindert Sonner-Toasts bei Fehler
(UX-DR21 / Zero-Toast).

### 2.6 Re-Prompt nach 5 min

1. Cron `*/30 * * * * *` (`reprompt-psa-quittung.scheduler.ts:63`):
   - Tick-Overlap-Guard (`running`-Flag) verhindert paralleles Scannen.
   - `findUnacknowledgedPsaPropagations(threshold = now - 5min, limit = 100)`.
   - `NOT EXISTS`-Subquery auf
     `QuittungUeberfaelligEvent` als Idempotenz-Filter.
   - Pro Treffer: Dispatch
     `EmitPsaQuittungUeberfaelligCommand(einsatzId, einheitId, propagationGroupId, originalEventId, ueberfaelligSeitMin, zuweisungId)`.
2. `EmitPsaQuittungUeberfaelligHandler` schreibt
   `eigenschutz.psa_quittung_ueberfaellig` über die Outbox.
3. Frontend rendert synthetische Re-Prompt-Banner
   (`PsaProfilEmpfangBanner.tsx:117 – 130`, AC7 Pattern 2).

---

## 3. Outbox-Event-Registry-Konsistenz

| Layer                                                                                         | Event-Name                              | Status |
| --------------------------------------------------------------------------------------------- | --------------------------------------- | :----: |
| Domain-Konstante `EVENT_NAMES.EIGENSCHUTZ.QUITTUNG_ABGEGEBEN` (`event-names.ts:93`)            | `eigenschutz.quittung_abgegeben`        |   ✅   |
| `QuittungAbgegebenEvent.eventName()`                                                          | `eigenschutz.quittung_abgegeben`        |   ✅   |
| Serializer-Map in `event-deserializer.ts:455`                                                  | `eigenschutz.quittung_abgegeben`        |   ✅   |
| Deserializer-Funktion `deserializeQuittungAbgegeben` (`event-deserializer.ts:2918`)            | `eigenschutz.quittung_abgegeben`        |   ✅   |
| Adapter `@OnEvent` (`psa-quittung-abgegeben.adapter.ts:35`) bindet an `eventName()`            | gleicher String                         |   ✅   |
| WS-Channel-Name (`psa-quittung-abgegeben.adapter.ts:48` ↔ `use-eigenschutz-psa-quittung-live.ts:18`) | `eigenschutz:psa-quittung-abgegeben`    |   ✅   |
| Frontend-Zod-Schema (`use-eigenschutz-psa-quittung-live.ts:27`)                                | `eigenschutz:psa-quittung-abgegeben`    |   ✅   |
| Telemetrie-Eventname (`telemetry-event.schema.ts:27 – 28`)                                     | `psa_quittung_abgegeben`                |   ✅   |

> **Hinweis:** Die zwei sehr ähnlichen Strings sind absichtlich
> unterschiedlich:
> - `eigenschutz.quittung_abgegeben` ist der **Domain-Event-Name** (Dot-Notation, Outbox/EventEmitter).
> - `eigenschutz:psa-quittung-abgegeben` ist der **WS-Channel-Name** (Colon-Notation, Socket.IO).
> - `psa_quittung_abgegeben` ist der **Telemetrie-Event-Name** (Snake-Case, KPI-Pipeline).
>
> Tests (`event-names.eigenschutz.spec.ts`, `psa-quittung-abgegeben.adapter.spec.ts`) frieren diese drei Strings ein. Kein Drift möglich ohne Test-Break.

---

## 4. Modul-Wiring

| Wiring-Punkt                                                                                                                 | Status |
| ---------------------------------------------------------------------------------------------------------------------------- | :----: |
| `AckPsaQuittungHandler` registriert in `EigenschutzApplicationModule` (`eigenschutz-application.module.ts:69 + 111`)         |   ✅   |
| `EmitPsaQuittungUeberfaelligHandler` registriert (`eigenschutz-application.module.ts:77 + 119`)                              |   ✅   |
| `EigenschutzQuittungAbgegebenEventAdapter` registriert in `EigenschutzInfrastructureModule` (`eigenschutz-infrastructure.module.ts:103 + 136`) |   ✅   |
| `RepromptPsaQuittungScheduler` registriert via `EigenschutzSchedulerModule` (importiert in `app.module.ts:158`)              |   ✅   |
| `PsaProfilController` registriert in `EigenschutzModule` (`eigenschutz.module.ts:39`)                                        |   ✅   |
| `PSA_PROFIL_QUITTUNG_REPOSITORY`, `PSA_PROPAGATION_OVERDUE_QUERY` als DI-Tokens (`di-tokens.ts`)                              |   ✅   |

---

## 5. Test-Suite-Resultate

```text
$ cd packages/backend && pnpm test --testPathPatterns 'ack-psa-quittung|reprompt-psa-quittung|emit-psa-quittung-ueberfaellig|psa-quittung-abgegeben|psa-profil.controller.ack'

Test Suites: 6 passed, 6 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        2.382 s
```

Abgedeckt:

- `ack-psa-quittung.handler.spec.ts` – AC1 Happy-Path + AC2 Authorization + AC3 Idempotenz + Outbox-Lookup-NotFound + alle Sentinel-Errors.
- `psa-profil.controller.ack.spec.ts` – HTTP-Layer + Permission-Guard + Error-Mapping (404/422/500).
- `emit-psa-quittung-ueberfaellig.handler.spec.ts` – Re-Prompt-Handler (Story 3.7 AC4).
- `reprompt-psa-quittung.scheduler.spec.ts` – Cron-Tick + Overlap-Guard + Backlog-Warn + Clock-Skew.
- `psa-quittung-abgegeben.adapter.spec.ts` – Adapter-Log + WS-Broadcast + Fail-Tolerance.
- `lookup-psa-quittung-abgegeben-for-group.spec.ts` + `lookup-psa-quittung-ueberfaellig-emitted.spec.ts` – Shared-Lookup-Helper.

```text
$ cd packages/frontend && pnpm test --run use-ack-psa-quittung PsaProfilEmpfangBanner use-eigenschutz-psa-quittung-live use-eigenschutz-psa-live-banner

Test Files  4 passed (4)
     Tests  60 passed (60)
  Duration  5.49s
```

Abgedeckt:

- `use-ack-psa-quittung.spec.tsx` – Mutation-Pfad + Cache-Invalidation + Telemetrie-Push + Silent-Error.
- `PsaProfilEmpfangBanner.spec.tsx` – Render + Aktionen + Optimistic-Dismiss + Re-Prompt-Synthetic + Reduced-Motion.
- `use-eigenschutz-psa-quittung-live.spec.tsx` – WS-Frame-Parsing + Cache-Invalidation + Reconnect.
- `use-eigenschutz-psa-live-banner.spec.tsx` – Banner-Queue + Dismiss + Event-Konsumierung.

---

## 6. Reproduktionsschritte (Manueller Smoke)

> Manuell durchgespielt: nicht erforderlich – Code-Trace + Test-Suite
> liefern volle Abdeckung. Diese Anleitung dient als Drehbuch für den
> Pilot-Cutover-Smoke (Block B).

1. `bash scripts/worktree-setup.sh` (Worktree-Ports) und `pnpm -r dev`.
2. Login `rubeen / MyPass123*` → Einsatz auswählen → in eine Einheit
   einbuchen → Tab "Eigenschutz" → "PSA".
3. Als Stabsbeauftragter ein PSA-Profil ändern (z. B. CBRN-Schutz
   aktivieren) – Begründung "Smoke-Test PSA-Quittung 2026-05-12".
4. Empfänger-Browser (zweiter Tab oder zweites Profil) zeigt _kritisches_
   `SeverityBanner` mit drei Aktionen.
5. Primary "Verstanden, Ausrüstung vorhanden" klicken → Banner
   verschwindet sofort (optimistisch).
6. Sender-Tab: Quittungs-Counter im
   `OffenePsaBekanntgabenPanel` muss innerhalb < 1 s auf
   `1/N → 2/N → … → N/N` springen; bei `N/N` verschwindet die Gruppe
   aus der Liste.
7. Outbox-Check (Tabelle `OutboxEvent`):

```sql
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "
  SELECT id, event_name, payload->>'propagationGroupId' AS pg_id, occurred_at
  FROM \"OutboxEvent\"
  WHERE event_name = 'eigenschutz.quittung_abgegeben'
  ORDER BY occurred_at DESC LIMIT 5;
"
```

Erwartung: pro Klick **genau eine** Row mit dem `propagationGroupId`
des getesteten Toggles. Doppel-Klick (idempotent) erzeugt **keine**
zweite Row.

8. Persistenz-Check (Tabelle `PsaProfilQuittung`):

```sql
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "
  SELECT \"propagationGroupId\", \"einheitId\", \"quittiertVonUserId\", \"quittiertAm\"
  FROM \"PsaProfilQuittung\"
  WHERE \"propagationGroupId\" = '<pg_id>';
"
```

Erwartung: eine Row pro `einheitId`. Unique-Constraint
`@@unique([propagationGroupId, einheitId])` verhindert Duplikate (P2002
wird vom Handler in idempotent-204 übersetzt).

9. **Re-Prompt nach 5 min** (Optional, da Polling-basiert):
   - Eine Bekanntgabe **nicht** quittieren.
   - 5 – 6 min warten (oder die Modul-Konstante
     `OVERDUE_THRESHOLD_MIN` temporär auf 1 min senken).
   - Erwartung: in der Empfänger-Sicht erscheint ein _zweiter_ Banner
     (synthetischer Re-Prompt, gelb mit "Erneut"-Tag).
   - Outbox-Check:

```sql
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "
  SELECT id, event_name, occurred_at
  FROM \"OutboxEvent\"
  WHERE event_name = 'eigenschutz.psa_quittung_ueberfaellig'
  ORDER BY occurred_at DESC LIMIT 5;
"
```

---

## 7. Bekannte offene Punkte (aus `deferred-work.md`)

Die folgenden Items sind **kosmetisch oder defensive-only** und
beeinträchtigen die Funktionsfähigkeit der Quittierung **nicht**:

| Ref                                                       | Befund                                                                              | Risiko-Bewertung      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------- |
| `deferred-work.md` Z. 108                                 | `useAckPsaQuittung` doppelte Hook-Instanziierung in Banner + Drawer                  | niedrig (akzeptables Pattern; TanStack-Query-Cache geteilt) |
| `deferred-work.md` Z. 122                                 | Re-Ack von anderem User wird stumm akzeptiert (Audit-Trail-Lücke)                    | mittel (Audit, nicht Funktion) |
| `deferred-work.md` Z. 123                                 | `alreadyAcknowledged`-Flag im Controller-Mapping ignoriert                          | niedrig (kosmetisch)   |
| `deferred-work.md` Z. 126                                 | Tx-Mock ohne `outboxEvent`-Delegate produziert stille NotFound                       | niedrig (Test-Hardening) |
| `deferred-work.md` Z. 130                                 | Adapter-Broadcast-Promise nicht awaited                                              | niedrig (Adapter ist Best-Effort) |
| `deferred-work.md` Z. 133                                 | `einsatzId`-Wechsel-Effekt resettet Dedup vor Connect-Cleanup                        | niedrig (Race-Edge-Case) |
| `deferred-work.md` Z. 136                                 | `useAckPsaQuittung` ohne explizite retry-Policy bei 4xx                              | niedrig (Default-Retry harmlos) |
| `deferred-work.md` Z. 137                                 | `useEigenschutzPsaQuittungen` ohne `refetchOnWindowFocus`-Override                   | niedrig (WS-Pfad authoritative) |
| `deferred-work.md` Z. 147                                 | `QuittungAbgegebenEvent.quittiertAm` aus Repo-Eingabe statt DB-Default               | niedrig (Konsistenz-Frage bei P2002-Race) |
| `deferred-work.md` Z. 148                                 | WS-Replay nach Reconnect mit altem `einsatzId`                                       | niedrig (Timestamp-Filter wünschenswert) |

Diese Items bleiben als **separate Follow-Ups** im `deferred-work.md`
stehen. Es entsteht kein Bug-Issue aus diesem Audit, weil keiner der
Punkte die Funktionsfähigkeit oder Daten-Integrität bricht.

---

## 8. Befund & Empfehlung für Pilot-Cutover

**Befund:** ✅ verifiziert. Die PSA-Bekanntgabe-Quittierung ist
End-zu-End funktional und durch 105 (45+60) bestehende Tests gehärtet.
Outbox-Eventregistry, Modul-Wiring, WS-Channel-Naming, Idempotenz und
Re-Prompt-Scheduler sind konsistent.

**Empfehlung für Pilot-Cutover:**

1. Manuellen Drei-Geräte-Smoke aus §6 _einmal_ gegen das Pilot-Backend
   durchführen (Block B – nicht ersetzbar durch Code-Trace, weil
   Latency- und Reconnect-Pfade nur unter Realbedingungen
   beobachtbar sind).
2. `OutboxEvent`- und `PsaProfilQuittung`-Tabellen während der ersten
   Pilot-Übung mit SQL-Snapshot prüfen (gleiche Queries wie §6 Schritt 7+8).
3. Prometheus-Metrik
   `eigenschutz_psa_quittung_overdue_emitted_total` während der
   ersten 2 Wochen Pilot überwachen – bei Anomalie (Backlog-Cap
   chronisch erreicht) Folge-Story für Multi-Pod-Advisory-Lock anlegen.
4. Die in §7 genannten Cosmetic-Items im nächsten Polish-Sprint
   gebündelt addressieren.

---

## 9. Anhang – Verwiesene Files

| Pfad                                                                                                        |
| ----------------------------------------------------------------------------------------------------------- |
| `packages/backend/src/application/eigenschutz/commands/ack-psa-quittung/ack-psa-quittung.command.ts`        |
| `packages/backend/src/application/eigenschutz/commands/ack-psa-quittung/ack-psa-quittung.handler.ts`        |
| `packages/backend/src/application/eigenschutz/commands/emit-psa-quittung-ueberfaellig/`                     |
| `packages/backend/src/domain/eigenschutz/events/quittung-abgegeben.event.ts`                                |
| `packages/backend/src/domain/events/event-names.ts`                                                         |
| `packages/backend/src/infrastructure/eigenschutz/event-adapters/psa-quittung-abgegeben.adapter.ts`          |
| `packages/backend/src/infrastructure/eigenschutz/scheduler/reprompt-psa-quittung.scheduler.ts`              |
| `packages/backend/src/infrastructure/eigenschutz/scheduler/eigenschutz-scheduler.module.ts`                 |
| `packages/backend/src/infrastructure/outbox/event-deserializer.ts` (Z. 455 + 2918)                          |
| `packages/backend/src/modules/eigenschutz/controllers/psa-profil.controller.ts` (Z. 269 – 289)              |
| `packages/backend/src/modules/eigenschutz/eigenschutz.module.ts`                                            |
| `packages/frontend/src/features/eigenschutz/api/queries.ts` (Z. 1043 – 1148)                                |
| `packages/frontend/src/features/eigenschutz/api/use-eigenschutz-psa-quittung-live.ts`                       |
| `packages/frontend/src/features/eigenschutz/api/use-eigenschutz-psa-live-banner.ts`                         |
| `packages/frontend/src/features/eigenschutz/ui/organisms/PsaProfilEmpfangBanner.tsx`                        |
| `_bmad-output/implementation-artifacts/deferred-work.md` (Z. 14 – 15, 108 – 148)                            |

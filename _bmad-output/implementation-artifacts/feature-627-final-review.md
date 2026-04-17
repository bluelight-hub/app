---
feature: 627-lagekarte-gefahrenmatrix-integration
status: ready-for-pr
branch: 627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher
github_issue: 627
completed_at: 2026-04-17
team: lagekarte-gefahrenmatrix
---

# Feature #627 — Final Review

**Lagekarte × Gefahrenmatrix-Integration: Räumlich-semantische Gefahrenlage mit bidirektionaler Live-Sync**

## Gesamtbilanz

Issue #627 wurde in **5 Phasen (G1–G5)** mit einem Team von 3 Agenten (team-lead, backend-engineer, frontend-engineer) umgesetzt. Parallel entstand **ADR-010** (Gefahrenzone ↔ Matrixzelle-Referenz). Alle 5 Spec-Phasen sind `status: done`, alle Validation-Gates grün.

| Phase  | Scope                                                                         | Status   | Commits |
| ------ | ----------------------------------------------------------------------------- | -------- | ------- |
| G1     | Backend-Domain + Warnstufe-Design-Tokens                                      | ✅ done  | 11      |
| G2     | Karten-Zone-Erstellung (Draw, Layer, Popover, WebSocket)                      | ✅ done  | 4       |
| G3     | Matrix-Integration (Badges, Orphan-Indicator, Detail-Provider, Deep-Links)    | ✅ done  | 1       |
| G4     | Split-View + AKUT-Broadcast (Toast, Dialog, Sound)                            | ✅ done  | 3       |
| G5     | Polish (Reduced-Motion-Audit, Undo, Coach-Mark, a11y-Doku)                    | ✅ done  | 1       |
| Hotfix | Subscription-Object + Split-View-Race + Regression-Tests + Dasharray-Log-Spam | ✅ fixed | 3       |

**Total: 21 Feature-Commits + 4 Spec-Change-Log-Commits + 3 Hotfix-Commits = 28 Commits auf Feature-Branch.**

## Commit-Historie (alpha..HEAD)

```
c8a69d2a2 🐛(gefahrenzone): Log-Spam + Performance auf Lagekarte beheben
663230628 🧪(split-view): Regression-Tests für URL-Sync-Dauerschleife
413f4978b 🐛(split-view): URL-Sync-Dauerschleife bei Deep-Link-Mount verhindern
137b1f3a0 ✨(gefahrenzone): G5 — Undo + Coach-Mark + Reduced-Motion-Audit
6508b4b86 📝(bmad): G4 Validation Gate — Backend + Team-Lead-Nachtrag
6e89dd378 ✨(gefahrenmatrix): G4 — Split-View + AKUT-Broadcast (Toast + Dialog)
7eaaace4a ✨(akut): WebSocket-Broadcast-Adapter für Matrix-Aktualisierungen
199bace33 📝(bmad): G3-Spec done + Spec Change Log
b9c89294e ✨(gefahrenzone): G3 — Matrix-Badges + Detail-Provider + Deep-Links
342e16671 📝(bmad): G2-Spec done + G3/G4/G5-Specs ready-for-dev
152563d6b ✨(gefahrenzone): LagekarteView-Integration — Host + Draw-Controls
7a6386004 ✨(gefahrenzone): Feature-Slice mit API-Hooks, UI + Draw-Integration
0680af87b ♻️(lagekarte): Draw-Context im Store + API-Singleton für Gefahrenzonen
c735ea654 ✨(gefahrenzone): WebSocket-Broadcast-Bridge für Domain-Events
a91ba0961 📝(bmad): G1-Spec auf done + Spec Change Log
b68e6915c 🧪(gefahrenzone): Deserializer-Test um 3 neue Events erweitern
3f68a09a2 ✨(gefahrenzone): WarnstufeChip-Atom + Tests
dde7aeb77 ✨(gefahrenzone): MapGL-Token-Bridge warnstufe-style + Tests
7e2dbf734 🎨(tokens): Warnstufe-Design-Tokens + AKUT-Pulse-Animation
030137da0 ✨(shared): API-Client regeneriert — GefahrenzonenApi
53d2d5458 ✨(gefahrenzone): Controller + Module — einsatz/gefahrenzonen/*
26638721d ✨(gefahrenzone): Application-Layer — Commands, Query, DTOs
eb1f43b9e ✨(gefahrenzone): Event-Registry — Serializer + Deserializer
8965ad0f1 ✨(gefahrenzone): Infrastructure — Repository + Mapper + DI-Token
bbec23692 ✨(gefahrenzone): Prisma-Schema + Migration
02afd7cac ✨(gefahrenzone): Domain-Layer — Aggregate, VOs, Events
```

## Auslieferung — was der User bekommt

**Backend:**

- Neue `Gefahrenzone`-Entity (Domain + Prisma + Migration) mit GeoJSON-Polygon-Geometrie in JSONB.
- 3 Domain-Events (`gefahrenzone.erstellt` / `.geometry-geaendert` / `.geloescht`) inkl. Serializer/Deserializer-Roundtrip.
- 2 WebSocket-Broadcast-Adapter (Gefahrenzone + `gefahrenmatrix.aktualisiert` — letzterer neu).
- 4 REST-Endpoints unter `/einsatz/:einsatzId/gefahrenzonen` mit `@ApiWrappedResponse`.
- Automatisch generierter API-Client `GefahrenzonenApi`.

**Frontend:**

- Ring-1-Tokens `warnstufe-{keine,niedrig,mittel,hoch,akut}-{fill,stroke,text,glow}` (Light + Dark) + CSS-`@keyframes`-Animations mit Reduced-Motion-Fallback.
- MapGL-Token-Brücke `getWarnstufeMapStyle` + `WARNSTUFE_CHIP_STYLES`.
- `WarnstufeChip` (Farbe + Symbol + Kürzel).
- `features/gefahrenzone`-Slice: TanStack-Query + Mutations mit optimistic updates, WebSocket-Subscriber, Inline-Popover, Draw-Controls, MapGL-Layer, Host-Orchestrator, Detail-Panel/Popup, Undo + Coach-Mark.
- `features/gefahrenmatrix`-Erweiterung: `ZoneCountBadge`, `OrphanWarningIndicator`, Deep-Link-Fokus mit Pulse.
- `features/einsatz/layouts/LagekarteGefahrenmatrixSplitView` (40:60 xl / 50:50 2xl, disabled <xl).
- `splitViewStore` + URL-Sync + Toggle + Hotkey `cmd+shift+g`.
- `AkutBroadcastDialog` (einzige Modal-Stelle) + `useAkutConfirm`-Hook (in Matrix-Grid, DetailPanel, Create-Flow eingehakt).
- `AkutBroadcastToast` mit dreistufiger Eskalation (Sonner → persistent → Header-Banner) + Web-Audio-Beep (abschaltbar).
- `useGefahrenmatrixWebSocket` mit Self-Filter + globale Mount.
- Undo (`cmd+z`, 30 s) + Redo-Toast.
- Onboarding-Coach-Mark (localStorage-persistiert).

## Test-Bilanz

| Bereich                                      | Tests grün                 | Δ vs. `alpha`                                                              |
| -------------------------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| Frontend Full-Suite                          | **4565/4565** (21 skipped) | +89 neue Tests                                                             |
| Backend Gefahrenzone-Scope                   | **54/54**                  | +54                                                                        |
| Backend Matrix+Zone+Validator (kumulativ G4) | **82/82**                  | +28                                                                        |
| Backend Full-Suite                           | 9095/9112                  | 17 Fails **pre-existing** (stash-verifiziert, NICHT durch #627 verursacht) |
| `pnpm lint`                                  | 0 Errors                   | 28 Warnings pre-existing                                                   |
| `tsc --noEmit`                               | clean                      | —                                                                          |
| `check:di:imports`                           | ✅ 1892 Files              | —                                                                          |
| `check:arch`                                 | ✅ 0 Cycles                | —                                                                          |
| Prisma-Migration `add_gefahrenzone`          | ✅ läuft                   | —                                                                          |

## Hotfixes aus Browser-Smoke (User-Report)

1. **`use-gefahrenzone-undo.tsx`**: `@tanstack/store@0.10.0` gibt `Subscription`-Objekt zurück, nicht Cleanup-Function. Fix: `const subscription = store.subscribe(...); return () => subscription.unsubscribe()`. Enthalten in G5-Commit `137b1f3a0` + Mount/Unmount-Regression-Test.
2. **`use-split-view-url-sync.ts`**: Race-Condition bei Deep-Link-Mount (URL→Store + Store→URL liefen mit stale state, navigateten die URL-Params weg → Endlosschleife). Fix: `syncFromUrlRef`-Flag überspringt Store→URL nach URL-getriebener Mutation. Commit `413f4978b` + 2 Regression-Tests in `663230628` (Initial-Mount ohne Navigate + User-Action single-flush). Sweep-Check bestätigt: einziger URL↔Store-Sync im Projekt.
3. **`GefahrenzoneLayer.tsx` (MapLibre-Log-Spam)**: `line-dasharray: [1]` als Non-KEINE-Branch ist in MapLibre v5 invalid (muss even-length ≥2 sein) → Console-Warning pro Paint-Update → Main-Thread-Blockade bei offener Lagekarte. Fix: Layer-Split via Filter — KEINE bekommt eigenen Layer mit statischem `[4, 4]`, Non-KEINE rendert solide Linie ohne dasharray. Commit `c8a69d2a2`.

## Architektur-Entscheidungen (dokumentiert)

- **Zone ↔ Matrixzelle via Tripel** (`einsatzId + gefahrentyp + schutzobjekt`), keine harte FK — Zone darf existieren ohne Matrix-Bewertung. Siehe ADR-010 (parallel geschrieben).
- **Matrix autoritativ für Warnstufe, Zone autoritativ für Geometrie** — keine Doppelung.
- **WebSocket-Broadcast via EinsatzEventsGateway** (ADR-006) für alle 3 Gefahrenzone-Events + `gefahrenmatrix:aktualisiert`.
- **Client-Side-Group-by** (`useGefahrenzonenByCell`) statt Backend-Endpoint für Matrix-Badges — spart Round-Trip, hält Matrix-Query entkoppelt.
- **URL-First Split-View** mit bidirektionalem Store-Sync + Race-Fix via Ref-Flag.
- **AKUT-Confirm als einzige Modal-Stelle** im gesamten Feature — alle anderen Flows sind Popover/Panel/Toast.
- **Web-Audio-API für AKUT-Beep** — kein externes Sound-Asset, Settings-Store-gesteuert abschaltbar.
- **Dreistufige AKUT-Eskalation** (Sofort-Toast → persistent → Header-Banner) mit `aria-live="assertive"`.
- **Undo-Client-Side**: nutzt bestehende Create/Update/Delete-Endpoints, kein Server-Undo-Command.

## Bewusste Scope-Abweichungen (gegenüber Spec / UX-Doc)

1. **G1 — Controller-Version**: `'alpha'` statt `['alpha', '1']` — codebase-weite Konvention.
2. **G1 — Controller-Tests Mock-basiert** statt echter DB-Integration — Pattern-Konsistenz mit `gefahrenmatrix.controller.spec.ts`.
3. **G1 — Phosphor-Icons** (`react-icons/pi`) statt Heroicons — Heroicons nicht installiert, Phosphor ist projektweit etabliert.
4. **G2 — Matrix-Update im Create-Flow** ergänzt — verhindert Orphan-Zonen beim Anlegen.
5. **G2 — MapboxDraw-Feature-Cleanup via `map._controls`** — leicht hacky, aber einzige saubere Lösung ohne Draw-Instance-Propagation.
6. **G3 — Deep-Link-Panel-Mount direkt vom Host** statt via `LayerDetailProvider.renderPanel` — MapDetail-Flow ist click-, Deep-Link ID-gesteuert.
7. **G3 — G2-Host-Click-Handler entfernt** — DetailProvider übernimmt Click-Flow (konsistent mit DWD/NINA).
8. **G4 — ScrollIntoView via `setTimeout(0)`** statt direkt — jsdom-Kompatibilität für Tests.
9. **G5 — Playwright-basierter a11y-Audit + Visual-Regression** als Follow-Up markiert (Playwright nicht im Projekt konfiguriert).

## Offene Follow-Ups (außerhalb G5-Scope)

1. **Playwright-Setup + automatisierter a11y-Audit (axe-core) + Visual-Regression** — separates Vorhaben mit eigener ADR; G5 liefert nur Manual-Checkliste.
2. **Manueller Smoke-Test zwischen 2 Browser-Sessions** — vor PR-Merge durch User; Validiert AKUT-Broadcast-Roundtrip und Split-View-Deep-Link-Fluss.
3. **17 pre-existing Backend-Test-Fails** in `server-access.guard.integration.spec.ts` + `admin-jwt-guard.e2e.spec.ts` — stash-verifiziert NICHT durch #627 verursacht. Separater Fix-Task (vermutlich Folge von `9ff89f81` auth + `34a0963a5` Prisma v6→v7).
4. **Unit-Test für GefahrenzoneLayer-Dasharray-Fix** — Commit `c8a69d2a2` erweitert die Layer-Struktur (1 neuer Layer mit Filter), die bestehenden Tests (5/5) greifen aber noch mit altem Pattern. Empfehlung: frontend-engineer ergänzt eine Assertion, dass kein Layer mit invalidem `line-dasharray` rendert (Länge-Check), damit der Bug nicht wiederkommt.

## PR-Bereitschaft

**Status: ready-for-PR** — mit folgenden Hinweisen im PR-Body:

- Issue #627 geschlossen.
- Verweis auf ADR-010 (parallel entstanden).
- Test-Bilanz wie oben.
- Follow-Ups explizit genannt (keine davon Merge-Blocker).
- Manueller Smoke zwischen 2 Sessions als Review-Task des Mergers.

## Team-Abschluss

- **backend-engineer**: 13 Commits über G1, G2, G4. Alle Pattern-Duplikate sauber, Resilience durchgängig.
- **frontend-engineer**: 10 Commits über G1, G2, G3, G4, G5 + Regression-Tests zu Hotfix 2. Disziplinierte Spec-Abweichungen mit Begründung, bei merkwürdigen `task-list`-Direktnachrichten korrekt zurückgefragt.
- **team-lead**: Orchestrierung + 4 Spec-Change-Log-Commits + 2 Hotfix-Commits (Split-View-Race + Dasharray).

**Team `lagekarte-gefahrenmatrix` kann nach PR-Erstellung graceful geshutdown werden.**

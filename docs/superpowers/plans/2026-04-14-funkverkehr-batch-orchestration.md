# Orchestrate Funkverkehr Implementation as Gated Batch Waves

## Context

We want to execute a 41-task / 14-phase Funkverkehr implementation (Kanalplan +
Funkprotokoll) in parallel using Agent-tool worktree isolation, split into four
gated waves with Lead-driven merges between waves. The draft this plan refines
described a "team" of workers with peer-to-peer `SendMessage` coordination — in
this environment those primitives (`TeamCreate`, `TaskCreate`, inter-agent
`SendMessage`, `superpowers:subagent-driven-development`, `chrome-devtools-mcp`)
are not available. What *is* available: the `Agent` tool with
`isolation: "worktree"` and `run_in_background: true`; agents run to completion
and return a single result. Coordination therefore has to be **contract-up-front
via the Lead**, not mid-flight between workers.

### Preconditions (must be true BEFORE orchestration starts)

These are missing today and are blockers:

1. **Master plan file absent.** The draft references
   `docs/superpowers/plans/2026-04-14-funkverkehr-kanalplan-funkprotokoll.md`;
   it does not exist. The 41-task breakdown with exact file paths, Prisma field
   names, event names, and WebSocket event contracts must be written *first*,
   because every worker is expected to follow it verbatim.
2. **Base branch absent.** `407-funkverkehr-funkprotokoll-kanalverwaltung` does
   not exist. Today we are on `claude/refine-local-plan-TYU5F`. The base branch
   must be created off `alpha` (or the chosen trunk) before Wave 1.
3. **Feature is greenfield.** `packages/frontend/src/routes/app/einsatz/$einsatzId/kommunikation/funk.tsx`
   is a `ComingSoon` placeholder. No `funkkanal` domain, `funkkanal` module, or
   `funkverkehr` feature exists yet. The orchestration is building from zero.

If those preconditions aren't met, this plan is not runnable. The plan below
assumes the Lead satisfies them before spawning Wave 1.

---

## Shape of the Change

```
                 ┌──────────────────────────────────────────┐
                 │ Lead (this agent)                        │
                 │  • creates base branch                   │
                 │  • reads master plan, extracts contracts │
                 │  • spawns waves, merges, runs final E2E  │
                 └──────────────────────────────────────────┘
                              │  spawns 3 agents in parallel
                              ▼
  ┌───────────── Wave 1 (foundation, independent) ─────────────┐
  │ W1-migrations   W1-domain            W1-docs               │
  │ Prisma+migr.    VOs/Aggregates/Ev.   ADRs + arc42          │
  └─────────────────┬──────────────────────────────────────────┘
                    │  Lead merges  →  407/wave-1-foundation
                    ▼
  ┌────── Wave 2 (backend core, SERIAL: infra → app) ──────────┐
  │ W2-infra   → (Lead pushes ports commit) →   W2-app         │
  │ mappers,     interface contract             commands,      │
  │ repo, DI     frozen on branch               queries        │
  └─────────────────┬──────────────────────────────────────────┘
                    │  Lead merges  →  407/wave-2-backend-core
                    ▼
  ┌────── Wave 3 (backend API, parallel, same base) ───────────┐
  │ W3-ws                     W3-http                          │
  │ gateway + event names     DTOs, controllers, PDF, ETB ext. │
  └─────────────────┬──────────────────────────────────────────┘
                    │  Lead merges  →  407/wave-3-backend-api
                    │  Lead: `pnpm run generate-api` + commit
                    ▼
  ┌────── Wave 4 (frontend, staggered: foundation first) ──────┐
  │ W4-foundation (hooks+store+WS) →                           │
  │     ↓ commits+pushes hooks package                         │
  │ W4-ui-kanalplan  ∥  W4-ui-protokoll (pulls branch w/ hooks)│
  └─────────────────┬──────────────────────────────────────────┘
                    │  Lead merges  →  407/wave-4-frontend
                    ▼
             Lead solo: Task 40 (E2E) + Task 41 (DoD) + PR vs. alpha
```

Key structural changes vs. the draft:

- **Wave 2 is serial**, not parallel. `backend-app` hard-depends on the
  repository port from `backend-infra`; without agent-to-agent messaging, the
  Lead ports-first/app-second gate is the only safe shape. Savings from
  parallelism here are minor (2 tasks overlap at most).
- **Wave 4 is two phases**: foundation alone, then both UI workers off the
  branch that already contains the foundation's hooks. The draft's "start
  foundation 10min earlier + SendMessage" doesn't exist as a primitive; a
  sequential gate is the available substitute.
- **No inter-agent messaging.** All shared contracts (event names, port
  signatures, DTO shapes, WS payloads) live in the master plan. The Lead's job
  before each wave is: read the master plan's contract section, extract the
  interfaces that bridge workers, and commit stub/skeleton files on the base
  branch so workers start from a branch where the contract is *already fixed*.

---

## Lead Workflow (step by step)

Each step is a thing the Lead (running this session, or a future one) executes.
Between waves the Lead works on the *local* repo, not in a worktree.

### Step 0 — Satisfy preconditions

1. Confirm master plan exists: `docs/superpowers/plans/2026-04-14-funkverkehr-kanalplan-funkprotokoll.md`.
   If not, STOP — ask the user to produce it or produce it first in a separate
   planning session. The 41 tasks must include: exact Prisma model/field names,
   exact domain event class names, exact WebSocket event names, exact
   repository port signature, exact DTO shapes, exact route paths.
2. Create base branch off trunk:
   `git fetch origin alpha && git switch -c 407-funkverkehr-funkprotokoll-kanalverwaltung origin/alpha`
3. Push and note commit SHA as `BASE_SHA` for use in worker prompts.

### Step 1 — Wave 1 (3 parallel workers)

All three start from `407-funkverkehr-funkprotokoll-kanalverwaltung`. Spawn in a
**single message** with three `Agent` tool calls, each:
- `isolation: "worktree"`
- `run_in_background: true`
- `subagent_type: "general-purpose"`
- Prompt includes: base branch, worker scope (tasks from master plan), list of
  files in scope, rule "push to `407/wave-1/<worker>`, do NOT open a PR, end
  your final message with `BRANCH: <name>`".

Worker scopes (file paths verified to be greenfield or additive):

| Worker | Master-plan tasks | Scope files |
|---|---|---|
| `W1-migrations` | Tasks 1–2 | `packages/backend/prisma/schema.prisma`, `packages/backend/prisma/migrations/<two new>` |
| `W1-domain` | Tasks 3–10 | new `packages/backend/src/domain/funkkanal/**`; additive in `packages/backend/src/domain/etb/` (VOs only — ETB aggregate root untouched) |
| `W1-docs` | Tasks 38–39 | `docs/adr/00XX-*.md` ×4, `docs/architecture/**` |

Lead waits for all three notifications (no polling). Reads each result, records
branches.

### Step 2 — Merge Wave 1 → `407/wave-1-foundation`

```
git fetch origin 407/wave-1/migrations 407/wave-1/domain 407/wave-1/docs
git switch -c 407/wave-1-foundation origin/407-funkverkehr-funkprotokoll-kanalverwaltung
git merge --no-ff origin/407/wave-1/migrations
git merge --no-ff origin/407/wave-1/domain
git merge --no-ff origin/407/wave-1/docs
pnpm --filter @bluelight-hub/backend prisma:generate
pnpm --filter @bluelight-hub/backend test -- --testPathPatterns funkkanal
git push -u origin 407/wave-1-foundation
```

Resolve conflicts in `schema.prisma` manually if `W1-migrations` and `W1-domain`
both touched it (expected: only migrations worker does).

### Step 3 — Contract bridge for Wave 2

Before spawning Wave 2, the Lead **commits port stubs** onto
`407/wave-1-foundation` so `W2-app` has a target to code against:

1. Read the master plan's repository-port section.
2. Create `packages/backend/src/domain/funkkanal/ports/funkkanal.repository.ts`
   with the exact interface (method names, param types, return types) from the
   master plan. No implementation.
3. Create `packages/backend/src/infrastructure/di-tokens.ts` additions (or edit
   existing; see `packages/backend/src/infrastructure/di-tokens.ts`) for
   `FUNKKANAL_REPOSITORY` token.
4. Commit `🧱(funkkanal): port stub for wave-2 bridge`, push.

This turns Wave 2 from "infra-then-app serial" into "both can start" IF the
Lead is confident the contract is frozen. If not, keep it serial.

### Step 4 — Wave 2 (recommended: SERIAL)

`W2-infra` first, alone. When it finishes and is merged, spawn `W2-app`.

| Worker | Master-plan tasks | Scope files |
|---|---|---|
| `W2-infra` | Tasks 11–13 | `packages/backend/src/infrastructure/funkkanal/**`, `packages/backend/src/infrastructure/outbox/event-deserializer.ts` (additive registration) |
| `W2-app` | Tasks 14–17 | `packages/backend/src/application/funkkanal/**`, reuse
`packages/backend/src/application/common/handlers/` (TransactionalCommandHandler base) |

Merge each into `407/wave-2-backend-core`.

### Step 5 — Wave 3 (2 parallel workers, same base)

| Worker | Master-plan tasks | Scope files |
|---|---|---|
| `W3-ws` | Task 18 | `packages/backend/src/modules/einsatz-events/**` (new), plus publisher wiring in funkkanal command handlers (additive — coordinate via master plan) |
| `W3-http` | Tasks 19–24 | `packages/backend/src/modules/funkkanal/**`, additive edits in `packages/backend/src/modules/etb/controllers/etb-cqrs.controller.ts` (new endpoints for Funk-Kontext) |

Both workers must use `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` per
`packages/backend/src/modules/common/decorators/api-wrapped-response.decorator.ts`
(CLAUDE.md AC7). State this explicitly in the prompt.

Merge into `407/wave-3-backend-api`.

### Step 6 — API-client regeneration (Lead, solo)

```
pnpm --filter @bluelight-hub/backend start:dev &   # wait until :3091/api responds
pnpm run generate-api
git add shared/client && git commit -m "♻️(api-client): regenerate for funkverkehr"
kill %1
git push
```

This is Task 25. Cannot be delegated — workers don't have a running backend.

### Step 7 — Wave 4 (staggered: foundation first, then two UI in parallel)

Phase 4a:
| Worker | Master-plan tasks | Scope |
|---|---|---|
| `W4-foundation` | Tasks 26–29 | `packages/frontend/src/features/funkverkehr/{api,hooks,stores,contexts,schemas}/**` (no components) |

Merge → `407/wave-4-foundation`. Then Phase 4b:
| Worker | Master-plan tasks | Scope |
|---|---|---|
| `W4-ui-kanalplan` | Tasks 30, 32–33 | `packages/frontend/src/features/funkverkehr/ui/{atoms,organisms/Kanalplan*}` |
| `W4-ui-protokoll` | Tasks 31, 34–37 | `packages/frontend/src/features/funkverkehr/ui/{molecules,organisms/Funkprotokoll*}`, `packages/frontend/src/routes/app/einsatz/$einsatzId/kommunikation/funk.tsx` (replaces the ComingSoon placeholder) |

Conflict zone: the route file. Only `W4-ui-protokoll` edits it. If
`W4-ui-kanalplan`'s organism needs to be imported in the layout, `W4-ui-protokoll`
imports it by the path pinned in the master plan (exists or not — missing import
becomes a compile error the Lead resolves at merge).

Merge both → `407/wave-4-frontend`.

### Step 8 — Final verification (Lead solo)

```bash
pnpm lint
pnpm --filter @bluelight-hub/backend test
pnpm --filter @bluelight-hub/frontend test -- --run --reporter=basic
pnpm --filter @bluelight-hub/backend check:arch
pnpm --filter @bluelight-hub/backend check:di:imports
pnpm --filter @bluelight-hub/frontend typecheck
```

Plus manual browser smoke test (Claude-in-Chrome MCP per CLAUDE.md: login
`rubeen/MyPass123*`, navigate to
`/app/einsatz/:einsatzId/kommunikation/funk`, exercise the golden paths from
master-plan Task 40). Record results.

### Step 9 — Single PR

`gh` is not available; use `mcp__github__create_pull_request` against `alpha`
from `407-funkverkehr-funkprotokoll-kanalverwaltung` after merging all four wave
integration branches into it. Summary from Task 41 Step 7.

---

## Worker Prompt Template (use verbatim)

```
You are a worker in a gated batch. Read these before coding:
1. Master plan: docs/superpowers/plans/2026-04-14-funkverkehr-kanalplan-funkprotokoll.md
2. CLAUDE.md (Umlaute, DI imports, ApiWrapped decorators, generate-api workflow)

Your scope:
- Wave: <N>
- Master-plan tasks: <numbers + titles>
- Files you may create/edit: <explicit list>
- You are working in an isolated git worktree off branch <base>.

Rules:
- Follow the master plan exactly. Field names, event names, DTO shapes, and
  port signatures are fixed there — do not invent alternatives.
- One commit per master-plan task, using the project's emoji convention (see
  CLAUDE.md: ✨ Feature, 🐛 Fix, ♻️ Refactor, 📝 Docs, 🧪 Test, 💥 Breaking).
- Never use --no-verify. Respect the DI-import pre-commit hook.
- Run the relevant tests before pushing:
    Backend: cd packages/backend && npx jest --no-coverage --silent \
               --testPathPatterns="<your scope>"
             pnpm --filter @bluelight-hub/backend check:arch
             pnpm --filter @bluelight-hub/backend check:di:imports
    Frontend: cd packages/frontend && pnpm test -- --run --reporter=basic
              pnpm --filter @bluelight-hub/frontend typecheck
- Push to 407/wave-<N>/<worker-name>. Do NOT open a PR.
- The last line of your final message must be: BRANCH: 407/wave-<N>/<worker-name>
- Do NOT attempt to talk to other workers. If you hit a contract ambiguity,
  stop and report it in your final message — the Lead resolves it.
```

---

## Critical Files and Patterns to Reuse

These must be referenced in the master plan (not reinvented):

- `packages/backend/src/application/common/handlers/` — `TransactionalCommandHandler` base.
- `packages/backend/src/domain/common/result.ts` — Result pattern.
- `packages/backend/src/modules/common/decorators/api-wrapped-response.decorator.ts` — required for controller responses.
- `packages/backend/src/infrastructure/di-tokens.ts` — DI token registry.
- `packages/backend/src/infrastructure/outbox/event-deserializer.ts` — event registry (every new event must be registered).
- `packages/frontend/src/features/einsatz/` — reference for feature layout.
- `packages/frontend/src/routes/app/einsatz/$einsatzId/kommunikation/funk.tsx` — placeholder to replace in Wave 4b.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Master plan not written → workers improvise → contract drift | Hard-block orchestration at Step 0. |
| Wave-2 port contract changes after infra commits → app worker wastes effort | Keep Wave 2 serial (recommended default). |
| Schema merge conflict in `schema.prisma` | Only the migrations worker may edit it; domain worker edits only TS/domain files. State explicitly in prompts. |
| Event names/WS payloads drift between backend and frontend | Pin names in master plan (Tasks 18 and 29), quote them into both worker prompts. |
| `generate-api` fails at Step 6 | Indicates Wave-3 controllers broke OpenAPI shape; Lead fixes inline before spawning Wave 4. |
| Worker hits contract ambiguity mid-run | Prompt instructs them to STOP and report, not guess. Lead revises contract and respawns. |
| Long background runs consume context if Lead polls | Use `run_in_background: true` and wait for auto-notifications — never sleep/poll. |

## Verification

End-to-end success is defined by:

1. All four wave integration branches merged cleanly into
   `407-funkverkehr-funkprotokoll-kanalverwaltung`.
2. All checks in Step 8 green, counts reported in the PR description
   (e.g. `backend: X/X, frontend: Y/Y`).
3. `pnpm run generate-api` produces no diff after the final merge.
4. Browser smoke test (login → Funkverkehr tab → create channel → log entry →
   observe WS broadcast) succeeds.
5. Four new ADRs and arc42 additions present under `docs/`.
6. PR opened via `mcp__github__create_pull_request` against `alpha`.

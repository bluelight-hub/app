# Funkverkehr: Kanalplan & Funkprotokoll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 📌 Handoff-Status (Stand 2026-04-15)

**Branch:** `407/wave-1-foundation-v2` (Basis: `407/funkverkehr-implementation`, nur Spec-Commits). Frischer Start — die alten Wave-1-Branches (`407/wave-1-foundation`) werden NICHT verwendet.

**Scope dieses Handoffs:** Wave 1 = Tasks 0–10 + Tasks 38–39 (Architektur-Dokumentation). Wave 2–4 (ab Task 11) bleiben für Folge-Sessions.

### ✅ Fertig (committed auf `407/wave-1-foundation-v2`)

| Task | Commit (short SHA) | Stand |
|------|-------------------|-------|
| Task 0 — Baseline-Tests | (keine Code-Änderung) | Baseline: Backend 8558 passing / 62 pre-existing fails / 60 skipped · Frontend 4236 passing / 21 skipped |
| Task 1 — Migration `add_etb_eintrag_kontext_and_zeitstempel` | `1c6cf49af` | Migration applied, Backfill aus `timestamp`, 4 neue Spalten verifiziert |
| Task 2 — Migration `add_funkkanal_and_zuordnung` | `eb2b83ec1` | Check-Constraint `funkkanal_zuordnung_genau_eine_kraft` getestet |
| Task 3 — FunkPrioritaet + EintragKontext VOs | `63d807a89` | 18 Tests grün (VOs liegen in `domain/value-objects/`, nicht `aggregates/etb/`) |
| Task 4 — EtbEintrag-Entity erweitert | `41f586d32` | Felder an Positionen 14 (ereignisZeitpunkt), 15 (erfasstAm), 16 (kontext). 39/39 Entity-Tests |
| Task 5 — Aggregat `addEintrag` + EintragAddedEvent | `93d55e2fa` | Options-Objekt `AddEintragOptions`, Event trägt kontext/ereignisZeitpunkt/absender/empfaenger, Serializer+Deserializer angepasst |
| Task 6 — ETB-Prisma-Mapper + Repository | `4b734ca15` | Raw-SQL-INSERT in `prisma-etb.repository.ts` um 4 neue Spalten erweitert, Roundtrip-Tests grün |
| Task 7 — AddEintragCommand + Handler | `f63847918` | `AddEintragCommandKontext` POJO am API-Rand, Handler konvertiert zu Domain-VO. 60/60 Tests |
| Task 8 — KanalDetails VO | `7309da047` | 19 Tests grün, liegt in `domain/aggregates/funkkanal/kanal-details.vo.ts` |

### 🟡 Offen für diesen Wave 1

- **Task 9** — Funkkanal-Entity + Aggregat + FunkkanalZuordnung-Entity (nächster Schritt!)
- **Task 10** — 7 Funkkanal Domain-Events
- **Task 38** — 4 ADRs (ETB-Kontext, WebSocket-Bus, Funkkanal-Aggregat, Polymorphe Zuordnung)
- **Task 39** — arc42-Architektur-Update

### 🔑 Wichtige Abweichungen vom Plan

1. **Ordner-Struktur:** Plan suggeriert `domain/aggregates/etb/eintrag-kontext.ts`. Tatsächlich: das Repo hat flache Struktur unter `domain/value-objects/` — `EintragKontext` und `FunkPrioritaet` liegen dort. Nur `KanalDetails` wurde in `domain/aggregates/funkkanal/` gelegt (neuer Unterordner), passend für das nächste Aggregat.
2. **Leere Migration aufgeräumt:** Der lokale Ordner `prisma/migrations/20260413090000_reorder_zeichen_katalog/` war leer (nicht in git). Gelöscht, damit Prisma neue Migrationen erzeugen konnte.
3. **EtbEintrag-Konstruktor:** Die Entity hat 13 bestehende positional args. Neue Felder additiv an Pos 14/15/16 angehängt (statt Options-Refactor), um bestehende Call-Sites nicht zu brechen.
4. **Aggregat-`addEintrag`:** Bekam `options?: AddEintragOptions` als 8. Parameter — positional bleibt kompatibel, neue Felder via Options-Objekt.
5. **Validierung `ereignisZeitpunkt`:** Max 60s in Zukunft erlaubt (Plan sagt „> 1 min" → als `> 60_000 ms` umgesetzt).
6. **Event-Serializer:** `EintragAddedEvent` trägt jetzt kontext/ereignisZeitpunkt/absender/empfaenger im Payload. Deserializer ist backward-compatible (Legacy-Events ohne diese Felder bekommen `{ type: 'standard' }` als Default). Der ursprüngliche Serializer-Test erwartet nun das erweiterte Payload + es wurde ein FunkKontext-Test ergänzt.
7. **Repository-SQL:** `prisma-etb.repository.ts:200` — Raw-INSERT wurde um `kontext_type`, `kontext_data`, `erfasst_am`, `ereignis_zeitpunkt` erweitert (inkl. `ON CONFLICT DO UPDATE`). `JSON.stringify(kontextData)` wird via `::jsonb` cast geschrieben; für `standard` wird `NULL` geschrieben (nicht `Prisma.JsonNull`-Sentinel).
8. **Commit-Konvention:** Hooks erzwingen Erste-Zeile ≤ 72 Zeichen. Commit-Messages entsprechend kurz halten.

### 🚀 Befehl zum Fortfahren für den nächsten Agent

```bash
cd /Users/rubeen/dev/personal/bluelight-hub
git switch 407/wave-1-foundation-v2
git log --oneline -10   # sollte 8 Funkverkehr-Commits zeigen (Tasks 1–8)

# Optional: Baseline verifizieren
pnpm --filter @bluelight-hub/backend exec prisma migrate status
cd packages/backend && npx jest --testPathPatterns="funk-prioritaet|eintrag-kontext|etb-eintrag.entity|einsatztagebuch.aggregate|prisma-etb.mapper|add-eintrag|kanal-details" --no-coverage
# Erwartet: alle grün (~230 Tests)
```

Dann weiter mit der folgenden Prompt an Claude Code:

> Setze die Ausführung des Plans `docs/superpowers/plans/2026-04-14-funkverkehr-kanalplan-funkprotokoll.md` auf Branch `407/wave-1-foundation-v2` fort. Tasks 0–8 sind bereits committed (siehe Handoff-Status im Plan). Starte bei **Task 9 (Funkkanal-Entity + Aggregat + FunkkanalZuordnung-Entity)** und arbeite Tasks 9, 10, 38, 39 sequentiell ab (Wave 1 abschließen). Nutze die Skill `superpowers:executing-plans`. Committe jeden Task einzeln mit eingehaltener 72-Zeichen-Subject-Grenze. Wave 2+ (ab Task 11) ist NICHT Teil dieses Scopes — bei Fertigstellung von Task 39 stoppen und den Handoff-Status im Plan aktualisieren.



**Goal:** BOS-Digitalfunk im Einsatz dokumentierbar machen: zwei Tabs unter `/app/einsatz/$einsatzId/kommunikation/funk` — **Kanalplan** (Sprechgruppen/Kanäle pro Einsatz, Kräfte-Zuordnung, PDF-Export) und **Funkprotokoll** (chat-artiges, live-aktualisierendes Protokoll mit Filter).

**Architektur:** ETB wird zum **Protokoll-Backbone**. Funksprüche sind ETB-Einträge mit typisiertem `EintragKontext` (Discriminated Union: `standard | funkspruch`). Funkkanäle werden als eigenes Aggregat modelliert. Live-Updates via neuem einsatz-gebundenem WebSocket-Gateway (Room `einsatz:{id}`). PDF-Export über eigenen Service (pdfkit).

**Tech Stack:** NestJS + Prisma + PostgreSQL (Backend, hexagonal), React 19 + TanStack Router/Query/Store + Tailwind + Headless UI (Frontend), socket.io (@nestjs/websockets), pdfkit. Alle API-Calls über generierten Client (`@bluelight-hub/shared/client`).

**Scope-Anpassungen ggü. Spec:**

- **Kein `wichtigkeit`-Feld im ETB** — existiert im Projekt nicht. Notfall-Eskalation basiert **allein** auf `FunkKontext.funkPrioritaet === 'notfall'`. Domain-Invariante "setzt wichtigkeit auf kritisch" entfällt; stattdessen triggert der `FunkKontext` direkt den Broadcast-Alert.
- **`einsatzabschnittId` am `Funkkanal` entfällt** — `Einsatzabschnitt` existiert nicht als eigenes Model. Feld wird später via Issue #687 nachgezogen. Nur `zweck: string?` als Freitext.
- **`EtbKategorie.KOMMUNIKATION`** existiert ✓ — Funksprüche bekommen diesen Default beim Erstellen.
- **Prisma-Feldname des bestehenden Zeitstempels** ist `timestamp` (nicht `eingetragenAm`). Neue Felder `erfasstAm` + `ereignisZeitpunkt` werden additiv ergänzt; `timestamp` bleibt vorerst (Entfernung in Folge-Issue).
- **`EinsatzEinheit` existiert** ✓ → `einheitId` in `FunkkanalZuordnung` bleibt im Scope.

---

## Phase 0: Branch & Vorbereitung

### Task 0: Worktree & Branch verifizieren

**Files:** _(keine Änderungen)_

- [ ] **Step 1: Branch und Working Directory prüfen**

Run:
```bash
git branch --show-current
pwd
```

Expected: Branch `407-funkverkehr-funkprotokoll-kanalverwaltung`, WD ist das Bluelight-Hub-Root.

- [ ] **Step 2: Baseline-Test-Counts erfassen**

Run (im Backend):
```bash
cd packages/backend && npx jest --no-coverage --silent 2>&1 | tail -20
```
Run (im Frontend):
```bash
cd packages/frontend && pnpm test -- --run --reporter=basic 2>&1 | tail -20
```

Notiere die Test-Zahlen (Backend + Frontend passing/failing) als Baseline für den PR.

---

## Phase 1: Datenbank-Migrationen

### Task 1: Migration "add_etb_eintrag_kontext_and_zeitstempel"

**Files:**
- Modify: `packages/backend/prisma/schema.prisma` (Model `EtbEintrag`, Zeilen ~452-503)
- Create: `packages/backend/prisma/migrations/<ts>_add_etb_eintrag_kontext_and_zeitstempel/migration.sql`

- [ ] **Step 1: Schema erweitern**

In `schema.prisma` am Model `EtbEintrag` folgende Felder hinzufügen (nicht `timestamp` entfernen):

```prisma
model EtbEintrag {
  // ... bestehende Felder ...

  erfasstAm         DateTime @default(now()) @map("erfasst_am")
  ereignisZeitpunkt DateTime                 @map("ereignis_zeitpunkt")

  kontextType       String   @default("standard") @map("kontext_type")
  kontextData       Json?    @map("kontext_data")

  // ... bestehende Indizes bleiben ...
  @@index([etbId, ereignisZeitpunkt])
  @@index([etbId, kontextType])
}
```

- [ ] **Step 2: Migration generieren**

Run:
```bash
pnpm --filter @bluelight-hub/backend prisma:migrate --name add_etb_eintrag_kontext_and_zeitstempel
```

Erwartete generierte SQL-Schritte:
1. `ALTER TABLE etb_eintraege ADD COLUMN erfasst_am TIMESTAMP NOT NULL DEFAULT NOW()`
2. `ALTER TABLE etb_eintraege ADD COLUMN ereignis_zeitpunkt TIMESTAMP NULL` (nullable anlegen)
3. `ALTER TABLE etb_eintraege ADD COLUMN kontext_type TEXT NOT NULL DEFAULT 'standard'`
4. `ALTER TABLE etb_eintraege ADD COLUMN kontext_data JSONB NULL`
5. Index auf `(etb_id, ereignis_zeitpunkt)`
6. Index auf `(etb_id, kontext_type)`

- [ ] **Step 3: Backfill-SQL in Migration einfügen**

In der generierten `migration.sql` **vor** dem `NOT NULL`-Constraint für `ereignis_zeitpunkt` folgenden Block ergänzen (oder als separates Statement):

```sql
-- Backfill: ereignis_zeitpunkt = timestamp, erfasst_am bleibt auf Default
UPDATE etb_eintraege SET ereignis_zeitpunkt = "timestamp" WHERE ereignis_zeitpunkt IS NULL;
UPDATE etb_eintraege SET erfasst_am = "timestamp";
ALTER TABLE etb_eintraege ALTER COLUMN ereignis_zeitpunkt SET NOT NULL;
```

Falls Prisma den NOT-NULL-Constraint bereits beim CREATE setzt (kein zweischrittiger Ansatz), anpassen: Spalte erst nullable anlegen, backfillen, dann `SET NOT NULL`.

- [ ] **Step 4: Migration lokal anwenden und validieren**

Run:
```bash
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'etb_eintraege' AND column_name IN ('erfasst_am','ereignis_zeitpunkt','kontext_type','kontext_data');"
```

Expected: 4 Zeilen, `erfasst_am` und `ereignis_zeitpunkt` NOT NULL, `kontext_data` nullable JSONB.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/prisma/schema.prisma packages/backend/prisma/migrations
git commit -m "✨(backend): Add ETB-Eintrag Kontext und Zeitstempel-Felder

Erweitert EtbEintrag um erfasstAm, ereignisZeitpunkt, kontextType und
kontextData (JSONB) für Kontext-Varianten. Migration backfillt bestehende
Einträge aus timestamp."
```

---

### Task 2: Migration "add_funkkanal_and_zuordnung"

**Files:**
- Modify: `packages/backend/prisma/schema.prisma` (neue Models am Ende oder im passenden Bereich einfügen)
- Create: `packages/backend/prisma/migrations/<ts>_add_funkkanal_and_zuordnung/migration.sql`

- [ ] **Step 1: Prisma-Models hinzufügen**

```prisma
model Funkkanal {
  id                 String   @id @default(cuid())
  einsatzId          String   @map("einsatz_id")
  einsatz            Einsatz  @relation(fields: [einsatzId], references: [id], onDelete: Cascade)

  name               String
  detailsType        String   @map("details_type")    // 'tmo' | 'dmo' | 'analog'
  detailsData        Json     @map("details_data")
  status             String   @default("aktiv")       // 'aktiv' | 'inaktiv' | 'archiviert'
  zweck              String?
  sortIndex          Int      @default(0) @map("sort_index")

  zuordnungen        FunkkanalZuordnung[]

  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt       @map("updated_at")
  createdBy          String?  @map("created_by")
  updatedBy          String?  @map("updated_by")

  @@unique([einsatzId, name])
  @@index([einsatzId, status, sortIndex])
  @@map("funkkanal")
}

model FunkkanalZuordnung {
  id              String           @id @default(cuid())
  kanalId         String           @map("kanal_id")
  kanal           Funkkanal        @relation(fields: [kanalId], references: [id], onDelete: Cascade)

  fahrzeugId      String?          @map("fahrzeug_id")
  fahrzeug        EinsatzFahrzeug? @relation(fields: [fahrzeugId], references: [id], onDelete: Cascade)

  personId        String?          @map("person_id")
  person          EinsatzPerson?   @relation(fields: [personId], references: [id], onDelete: Cascade)

  einheitId       String?          @map("einheit_id")
  einheit         EinsatzEinheit?  @relation(fields: [einheitId], references: [id], onDelete: Cascade)

  rufnameSnapshot String           @map("rufname_snapshot")
  rolle           String           @default("primaer")  // 'primaer' | 'sekundaer' | 'zuhoeren'

  createdAt       DateTime         @default(now()) @map("created_at")
  createdBy       String?          @map("created_by")

  @@unique([kanalId, fahrzeugId])
  @@unique([kanalId, personId])
  @@unique([kanalId, einheitId])
  @@index([kanalId])
  @@map("funkkanal_zuordnung")
}
```

Zusätzlich am `Einsatz`-Model Back-Reference ergänzen:
```prisma
  funkkanaele Funkkanal[]
```
und an `EinsatzFahrzeug`, `EinsatzPerson`, `EinsatzEinheit` jeweils:
```prisma
  funkkanalZuordnungen FunkkanalZuordnung[]
```

- [ ] **Step 2: Migration generieren**

Run:
```bash
pnpm --filter @bluelight-hub/backend prisma:migrate --name add_funkkanal_and_zuordnung
```

- [ ] **Step 3: Check-Constraint manuell in migration.sql ergänzen**

Am Ende der generierten `migration.sql`:

```sql
ALTER TABLE funkkanal_zuordnung
ADD CONSTRAINT funkkanal_zuordnung_genau_eine_kraft
CHECK (
  (fahrzeug_id IS NOT NULL)::int +
  (person_id IS NOT NULL)::int +
  (einheit_id IS NOT NULL)::int = 1
);
```

- [ ] **Step 4: Migration lokal anwenden**

Run:
```bash
pnpm --filter @bluelight-hub/backend prisma:migrate
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "\d funkkanal_zuordnung"
```

Expected: Tabelle existiert, Check-Constraint `funkkanal_zuordnung_genau_eine_kraft` ist sichtbar.

- [ ] **Step 5: Check-Constraint testen**

Run:
```bash
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "INSERT INTO funkkanal_zuordnung (id, kanal_id, rufname_snapshot) VALUES ('test', 'fake', 'X');"
```

Expected: Fehler `new row for relation "funkkanal_zuordnung" violates check constraint`. (Anschließend evtl. nötigen Cleanup durchführen.)

- [ ] **Step 6: Commit**

```bash
git add packages/backend/prisma/schema.prisma packages/backend/prisma/migrations
git commit -m "✨(backend): Add Funkkanal und FunkkanalZuordnung Models

Neue Tabellen für Kanalplan-Feature. FunkkanalZuordnung nutzt polymorphe
Kraft-Referenz via drei nullable FKs mit Check-Constraint 'genau eine
Kraft gesetzt'."
```

---

## Phase 2: ETB Domain-Erweiterung

### Task 3: EintragKontext VO + FunkPrioritaet VO

**Files:**
- Create: `packages/backend/src/domain/aggregates/etb/eintrag-kontext.ts`
- Create: `packages/backend/src/domain/value-objects/funk-prioritaet.ts`
- Create: `packages/backend/src/domain/aggregates/etb/__tests__/eintrag-kontext.spec.ts`

- [ ] **Step 1: Failing Test — FunkPrioritaet**

`packages/backend/src/domain/value-objects/__tests__/funk-prioritaet.spec.ts`:

```typescript
import { FunkPrioritaet } from '../funk-prioritaet';

describe('FunkPrioritaet', () => {
  it('akzeptiert gültige Werte', () => {
    expect(FunkPrioritaet.create('routine').isSuccess).toBe(true);
    expect(FunkPrioritaet.create('prioritaet').isSuccess).toBe(true);
    expect(FunkPrioritaet.create('notfall').isSuccess).toBe(true);
  });

  it('lehnt ungültige Werte ab', () => {
    const result = FunkPrioritaet.create('dringend' as never);
    expect(result.isFailure).toBe(true);
  });

  it('isNotfall() liefert true nur für notfall', () => {
    const notfall = FunkPrioritaet.create('notfall').value;
    expect(notfall.isNotfall()).toBe(true);
    const routine = FunkPrioritaet.create('routine').value;
    expect(routine.isNotfall()).toBe(false);
  });
});
```

Run: `cd packages/backend && npx jest --testPathPatterns="funk-prioritaet" --no-coverage`. Expected: FAIL.

- [ ] **Step 2: FunkPrioritaet VO implementieren**

`packages/backend/src/domain/value-objects/funk-prioritaet.ts`:

```typescript
import { Result } from '../common/result';

export type FunkPrioritaetValue = 'routine' | 'prioritaet' | 'notfall';

const VALID: readonly FunkPrioritaetValue[] = ['routine', 'prioritaet', 'notfall'];

export class FunkPrioritaet {
  private constructor(public readonly value: FunkPrioritaetValue) {}

  static create(value: FunkPrioritaetValue): Result<FunkPrioritaet> {
    if (!VALID.includes(value)) {
      return Result.fail(`Ungültige FunkPrioritaet: ${value}`);
    }
    return Result.ok(new FunkPrioritaet(value));
  }

  isNotfall(): boolean {
    return this.value === 'notfall';
  }

  equals(other: FunkPrioritaet): boolean {
    return this.value === other.value;
  }
}
```

Run: `npx jest --testPathPatterns="funk-prioritaet" --no-coverage`. Expected: PASS.

- [ ] **Step 3: Failing Test — EintragKontext**

`packages/backend/src/domain/aggregates/etb/__tests__/eintrag-kontext.spec.ts`:

```typescript
import { EintragKontext, StandardKontext, FunkKontext } from '../eintrag-kontext';

describe('EintragKontext', () => {
  it('standard() baut Standard-Kontext', () => {
    const k = EintragKontext.standard();
    expect(k.type).toBe('standard');
  });

  it('funkspruch() baut FunkKontext mit kanalId und Priorität', () => {
    const k = EintragKontext.funkspruch({ kanalId: 'k1', funkPrioritaet: 'notfall' });
    expect(k.type).toBe('funkspruch');
    expect((k as FunkKontext).kanalId).toBe('k1');
    expect((k as FunkKontext).funkPrioritaet).toBe('notfall');
  });

  it('fromPersistence() dekodiert JSONB', () => {
    const k = EintragKontext.fromPersistence('funkspruch', { kanalId: 'x', funkPrioritaet: 'routine' });
    expect(k.type).toBe('funkspruch');
  });

  it('toPersistence() serialisiert zurück', () => {
    const k = EintragKontext.funkspruch({ kanalId: 'x', funkPrioritaet: 'prioritaet' });
    expect(k.toPersistence()).toEqual({ type: 'funkspruch', kanalId: 'x', funkPrioritaet: 'prioritaet' });
  });
});
```

Run: expected FAIL.

- [ ] **Step 4: EintragKontext implementieren**

`packages/backend/src/domain/aggregates/etb/eintrag-kontext.ts`:

```typescript
import type { FunkPrioritaetValue } from '../../value-objects/funk-prioritaet';

export type EintragKontextType = 'standard' | 'funkspruch';

export interface StandardKontext {
  readonly type: 'standard';
  toPersistence(): { type: 'standard' };
}

export interface FunkKontext {
  readonly type: 'funkspruch';
  readonly kanalId: string;
  readonly funkPrioritaet: FunkPrioritaetValue;
  toPersistence(): { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkPrioritaetValue };
}

export type EintragKontextShape = StandardKontext | FunkKontext;

export const EintragKontext = {
  standard(): StandardKontext {
    return {
      type: 'standard',
      toPersistence: () => ({ type: 'standard' }),
    };
  },

  funkspruch(args: { kanalId: string; funkPrioritaet: FunkPrioritaetValue }): FunkKontext {
    return {
      type: 'funkspruch',
      kanalId: args.kanalId,
      funkPrioritaet: args.funkPrioritaet,
      toPersistence: () => ({
        type: 'funkspruch',
        kanalId: args.kanalId,
        funkPrioritaet: args.funkPrioritaet,
      }),
    };
  },

  fromPersistence(type: string, data: unknown): EintragKontextShape {
    if (type === 'funkspruch') {
      const d = data as { kanalId: string; funkPrioritaet: FunkPrioritaetValue };
      return EintragKontext.funkspruch({ kanalId: d.kanalId, funkPrioritaet: d.funkPrioritaet });
    }
    return EintragKontext.standard();
  },
};
```

Run Tests: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain
git commit -m "✨(backend): Add EintragKontext VO und FunkPrioritaet VO"
```

---

### Task 4: EtbEintrag-Entity erweitern (erfasstAm, ereignisZeitpunkt, kontext)

**Files:**
- Modify: `packages/backend/src/domain/entities/etb-eintrag.entity.ts`
- Modify: `packages/backend/src/domain/aggregates/etb/__tests__/*` (bestehende Tests ggf. anpassen)

- [ ] **Step 1: Failing Test für neue Felder**

`packages/backend/src/domain/entities/__tests__/etb-eintrag.entity.spec.ts` (erweitern oder neu):

```typescript
import { EtbEintrag } from '../etb-eintrag.entity';
import { EintragKontext } from '../../aggregates/etb/eintrag-kontext';

describe('EtbEintrag – Kontext und Zeitstempel', () => {
  it('setzt erfasstAm = now() automatisch', () => {
    const before = new Date();
    const eintrag = EtbEintrag.create({
      id: /* ... */, sequenceNumber: 1, text: 'x',
      createdBy: /* UserId */, kategorie: /* KOMMUNIKATION */,
      ereignisZeitpunkt: new Date('2026-04-14T10:00:00Z'),
      kontext: EintragKontext.standard(),
    }).value;
    expect(eintrag.erfasstAm.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('default kontext ist standard', () => {
    const eintrag = EtbEintrag.create({ /* ohne kontext */ }).value;
    expect(eintrag.kontext.type).toBe('standard');
  });

  it('speichert FunkKontext korrekt', () => {
    const eintrag = EtbEintrag.create({
      /* ... */,
      kontext: EintragKontext.funkspruch({ kanalId: 'k1', funkPrioritaet: 'notfall' }),
    }).value;
    expect(eintrag.kontext.type).toBe('funkspruch');
  });
});
```

Run: FAIL.

- [ ] **Step 2: Entity erweitern**

In `etb-eintrag.entity.ts`:

```typescript
// Neue Felder auf EtbEintrag:
readonly erfasstAm: Date;            // immutable, Erfassungszeitpunkt
readonly ereignisZeitpunkt: Date;    // user-editierbar, fachlicher Zeitpunkt
readonly kontext: EintragKontextShape;
```

Konstruktor/Factory `EtbEintrag.create(props)`:
- `erfasstAm` auf `new Date()` setzen (nicht aus `props` übernehmen)
- `ereignisZeitpunkt` aus `props.ereignisZeitpunkt ?? new Date()` (mit Validierung: nicht in der Zukunft > 1 min)
- `kontext` aus `props.kontext ?? EintragKontext.standard()`

Validierung: `ereignisZeitpunkt` darf nicht mehr als 60 Sekunden in der Zukunft liegen → `Result.fail`.

Run Tests: PASS.

- [ ] **Step 3: Bestehende ETB-Tests anpassen**

Alle Stellen, wo `EtbEintrag.create(...)` aufgerufen wird, bekommen zusätzlich `ereignisZeitpunkt` (Default = jetzt). Bestehende Tests um diesen Parameter ergänzen, um Breakage zu vermeiden. Run:
```bash
cd packages/backend && npx jest --testPathPatterns="etb" --no-coverage
```
Alle ETB-Tests sollen wieder PASS sein.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/domain
git commit -m "✨(backend): EtbEintrag um erfasstAm, ereignisZeitpunkt und kontext erweitern"
```

---

### Task 5: Aggregat `addEintrag()` erweitern + Notfall-Event-Detection

**Files:**
- Modify: `packages/backend/src/domain/aggregates/einsatztagebuch.aggregate.ts`
- Modify: `packages/backend/src/domain/events/eintrag-added.event.ts` (falls Payload erweitert werden muss)

- [ ] **Step 1: Failing Test**

In einem Aggregat-Spec: `addEintrag()` soll `kontext` und `ereignisZeitpunkt` entgegennehmen und korrekt auf `EtbEintrag` propagieren. Bei `FunkKontext` mit `notfall` soll das emittierte `EintragAddedEvent` den Kontext im Payload enthalten.

```typescript
it('addEintrag mit FunkKontext notfall emittiert Event mit kontext', () => {
  const etb = Einsatztagebuch.create({...}).value;
  const result = etb.addEintrag({
    text: 'Brand 12',
    userId,
    kategorie: EtbKategorie.create('KOMMUNIKATION').value,
    kontext: EintragKontext.funkspruch({ kanalId: 'k1', funkPrioritaet: 'notfall' }),
    ereignisZeitpunkt: new Date(),
  });
  expect(result.isSuccess).toBe(true);
  const events = etb.getUncommittedEvents();
  const added = events.find(e => e.constructor.name === 'EintragAddedEvent');
  expect((added as any).kontext).toMatchObject({ type: 'funkspruch', funkPrioritaet: 'notfall' });
});
```

Run: FAIL.

- [ ] **Step 2: Aggregat-Methode erweitern**

`addEintrag()` akzeptiert neue Options:
```typescript
addEintrag(args: {
  text: string;
  userId: UserId;
  kategorie: EtbKategorie;
  absender?: string;
  empfaenger?: string;
  metadata?: Record<string, unknown>;
  ereignisZeitpunkt?: Date;
  kontext?: EintragKontextShape;
}): Result<EtbEintrag>
```

Erzeugt `EtbEintrag` mit `ereignisZeitpunkt ?? new Date()` und `kontext ?? EintragKontext.standard()`. Emittiert `EintragAddedEvent` mit `kontext` im Payload.

- [ ] **Step 3: EintragAddedEvent-Payload erweitern**

`eintrag-added.event.ts`: neues Feld `kontext: { type: string; [key: string]: unknown }` und `ereignisZeitpunkt: Date`. Serializer-kompatibel (JSON-fähig).

- [ ] **Step 4: Tests grün**

Run: alle ETB-Aggregat-Tests. PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain
git commit -m "♻️(backend): addEintrag akzeptiert Kontext und ereignisZeitpunkt"
```

---

### Task 6: ETB-Prisma-Mapper erweitern

**Files:**
- Modify: `packages/backend/src/infrastructure/etb/prisma-etb.mapper.ts` (erstellen falls nicht vorhanden — der Grep-Befund zeigt nur einen Query-Mapper; Aggregat-Persistierung passiert via Repository, Mapper ggf. dort).
- Prüfen: `packages/backend/src/infrastructure/etb/prisma-etb.repository.ts` (oder ähnlich) für Persistenz-Pfad.

- [ ] **Step 1: Mapper-Pfad lokalisieren**

Run:
```bash
rg -l "kontextType|kontext_type|EtbEintrag\s*\{" packages/backend/src/infrastructure/etb
```

Ort identifizieren, wo aus Prisma-Row → Domain Entity gemappt wird (Repository oder Mapper).

- [ ] **Step 2: Failing Test**

Mapper-Spec: gibt einen Prisma-Row mit `kontextType='funkspruch'` + `kontextData={ kanalId: 'x', funkPrioritaet: 'notfall' }` → erwartet `EtbEintrag.kontext.type === 'funkspruch'`. Roundtrip-Test (Domain → Prisma-Create → Domain) für beide Kontext-Typen.

Run: FAIL.

- [ ] **Step 3: Mapper implementieren**

Serialisierung (Domain → Prisma):
```typescript
const persisted = eintrag.kontext.toPersistence();
return {
  kontextType: persisted.type,
  kontextData: persisted.type === 'funkspruch'
    ? { kanalId: persisted.kanalId, funkPrioritaet: persisted.funkPrioritaet }
    : null,
  erfasstAm: eintrag.erfasstAm,
  ereignisZeitpunkt: eintrag.ereignisZeitpunkt,
  // ... restliche Felder wie bisher
};
```

Deserialisierung:
```typescript
const kontext = EintragKontext.fromPersistence(row.kontextType, row.kontextData);
return EtbEintrag.create({
  // ...
  erfasstAm: row.erfasstAm,
  ereignisZeitpunkt: row.ereignisZeitpunkt,
  kontext,
}).value;
```

Run Tests: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/infrastructure/etb
git commit -m "♻️(backend): ETB-Mapper serialisiert Kontext und Zeitstempel"
```

---

### Task 7: AddEintragCommand erweitern

**Files:**
- Modify: `packages/backend/src/application/etb/commands/add-eintrag/add-eintrag.command.ts`
- Modify: `packages/backend/src/application/etb/commands/add-eintrag/add-eintrag.handler.ts`
- Modify: `packages/backend/src/application/etb/commands/add-eintrag/__tests__/*.spec.ts`

- [ ] **Step 1: Failing Test**

Handler-Spec erweitern: Command mit `kontext: { type: 'funkspruch', kanalId, funkPrioritaet }` + `ereignisZeitpunkt` → Handler delegiert korrekt an Aggregat. Ohne `kontext` → Default `standard`. Run: FAIL (Command akzeptiert Felder noch nicht).

- [ ] **Step 2: Command erweitern**

`add-eintrag.command.ts`: optionale Felder
```typescript
readonly ereignisZeitpunkt?: Date;
readonly kontext?: { type: 'standard' } | { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkPrioritaetValue };
```

Factory validiert:
- Falls `kontext.type === 'funkspruch'`: `kanalId` non-empty, `funkPrioritaet` via `FunkPrioritaet.create()` validiert.

- [ ] **Step 3: Handler mappt Command → Aggregat**

In `handler.ts`: `kontext` aus Command in `EintragKontextShape` konvertieren (via `EintragKontext.standard()` / `.funkspruch(...)`) und an `aggregate.addEintrag({ ..., kontext, ereignisZeitpunkt })` weitergeben.

Run Tests: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/etb
git commit -m "♻️(backend): AddEintragCommand akzeptiert Kontext und ereignisZeitpunkt"
```

---

## Phase 3: Funkkanal Domain

### Task 8: KanalDetails VO

**Files:**
- Create: `packages/backend/src/domain/aggregates/funkkanal/kanal-details.vo.ts`
- Create: `packages/backend/src/domain/aggregates/funkkanal/__tests__/kanal-details.vo.spec.ts`

- [ ] **Step 1: Failing Test**

```typescript
import { KanalDetails } from '../kanal-details.vo';

describe('KanalDetails', () => {
  it('tmo akzeptiert Sprechgruppe', () => {
    const r = KanalDetails.tmo({ sprechgruppe: 'SG_FEUER_1' });
    expect(r.isSuccess).toBe(true);
    expect(r.value.type).toBe('tmo');
  });

  it('tmo ohne Sprechgruppe schlägt fehl', () => {
    const r = KanalDetails.tmo({ sprechgruppe: '' });
    expect(r.isFailure).toBe(true);
  });

  it('dmo akzeptiert DMO-Kanal', () => {
    const r = KanalDetails.dmo({ dmoKanal: '310' });
    expect(r.value.type).toBe('dmo');
  });

  it('analog validiert Band 4m/2m', () => {
    expect(KanalDetails.analog({ band: '4m', frequenz: '84.800' }).isSuccess).toBe(true);
    expect(KanalDetails.analog({ band: 'HF' as never, frequenz: '10' }).isFailure).toBe(true);
  });

  it('fromPersistence dispatched via type', () => {
    expect(KanalDetails.fromPersistence('tmo', { sprechgruppe: 'X' }).type).toBe('tmo');
    expect(KanalDetails.fromPersistence('dmo', { dmoKanal: '1' }).type).toBe('dmo');
  });
});
```

Run: FAIL.

- [ ] **Step 2: VO implementieren**

```typescript
import { Result } from '../../common/result';

export type KanalDetailsShape =
  | { type: 'tmo'; sprechgruppe: string; gssi?: string }
  | { type: 'dmo'; dmoKanal: string; repeater?: string }
  | { type: 'analog'; band: '4m' | '2m'; frequenz: string; kanalnummer?: string };

export const KanalDetails = {
  tmo(args: { sprechgruppe: string; gssi?: string }): Result<KanalDetailsShape> {
    if (!args.sprechgruppe?.trim()) return Result.fail('Sprechgruppe erforderlich');
    return Result.ok({ type: 'tmo', sprechgruppe: args.sprechgruppe.trim(), gssi: args.gssi });
  },
  dmo(args: { dmoKanal: string; repeater?: string }): Result<KanalDetailsShape> {
    if (!args.dmoKanal?.trim()) return Result.fail('DMO-Kanal erforderlich');
    return Result.ok({ type: 'dmo', dmoKanal: args.dmoKanal.trim(), repeater: args.repeater });
  },
  analog(args: { band: '4m' | '2m'; frequenz: string; kanalnummer?: string }): Result<KanalDetailsShape> {
    if (!['4m', '2m'].includes(args.band)) return Result.fail('Band muss 4m oder 2m sein');
    if (!args.frequenz?.trim()) return Result.fail('Frequenz erforderlich');
    return Result.ok({ type: 'analog', band: args.band, frequenz: args.frequenz.trim(), kanalnummer: args.kanalnummer });
  },
  fromPersistence(type: string, data: unknown): KanalDetailsShape {
    if (type === 'tmo') return { type: 'tmo', ...(data as object) } as KanalDetailsShape;
    if (type === 'dmo') return { type: 'dmo', ...(data as object) } as KanalDetailsShape;
    if (type === 'analog') return { type: 'analog', ...(data as object) } as KanalDetailsShape;
    throw new Error(`Unbekannter KanalDetails-Type: ${type}`);
  },
};
```

Tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/domain/aggregates/funkkanal
git commit -m "✨(backend): Add KanalDetails VO (TMO/DMO/Analog)"
```

---

### Task 9: Funkkanal-Entity + Aggregat

**Files:**
- Create: `packages/backend/src/domain/aggregates/funkkanal/funkkanal.entity.ts`
- Create: `packages/backend/src/domain/aggregates/funkkanal/funkkanal.aggregate.ts`
- Create: `packages/backend/src/domain/aggregates/funkkanal/funkkanal-zuordnung.entity.ts`
- Create: `packages/backend/src/domain/aggregates/funkkanal/__tests__/funkkanal.aggregate.spec.ts`

- [ ] **Step 1: Failing Test – Funkkanal-Aggregat**

Testfälle:
- `Funkkanal.create({ einsatzId, name, details, sortIndex })` → Aggregat im Status `aktiv`
- `.rename('neu')` ändert Name, emittiert `FunkkanalGeaendert`
- `.changeDetails(newDetails)` emittiert `FunkkanalGeaendert`
- `.setZweck(...)`, `.setSortIndex(42)`
- `.archive()` → Status `archiviert`, emittiert `FunkkanalArchiviert`
- `.deactivate()`/`.activate()` Toggle zwischen `aktiv`/`inaktiv`, emittiert `FunkkanalGeaendert`
- `.zuordneKraft({ kraftRef: { fahrzeugId: 'f1' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' })` erzeugt Zuordnung
- `.aendereZuordnungRolle(zuordnungId, 'sekundaer')`
- `.entferneZuordnung(zuordnungId)`
- Invarianten: Zuordnung mit 0 oder 2+ Kraft-IDs → `Result.fail`
- `Funkkanal.create` akzeptiert nicht `status='archiviert'` aus Factory (nur via Methode)

Run: FAIL.

- [ ] **Step 2: Funkkanal-Entity implementieren**

`funkkanal.entity.ts` — plain Class mit readonly Feldern + Kopier-Methoden `withRename(...)` etc. Oder Mutable — Projekt-Konvention folgen (am Aggregat-Beispiel von Einsatztagebuch orientieren).

Relevante Felder:
```typescript
readonly id: string;
readonly einsatzId: string;
name: string;
details: KanalDetailsShape;
status: 'aktiv' | 'inaktiv' | 'archiviert';
zweck?: string;
sortIndex: number;
readonly createdAt: Date;
updatedAt: Date;
readonly createdBy?: string;
updatedBy?: string;
```

- [ ] **Step 3: FunkkanalZuordnung-Entity implementieren**

`funkkanal-zuordnung.entity.ts`:

```typescript
export type FunkkanalZuordnungKraftRef =
  | { kind: 'fahrzeug'; fahrzeugId: string }
  | { kind: 'person'; personId: string }
  | { kind: 'einheit'; einheitId: string };

export type FunkkanalRolle = 'primaer' | 'sekundaer' | 'zuhoeren';

export class FunkkanalZuordnung {
  constructor(
    readonly id: string,
    readonly kanalId: string,
    readonly kraftRef: FunkkanalZuordnungKraftRef,
    readonly rufnameSnapshot: string,
    public rolle: FunkkanalRolle,
    readonly createdAt: Date,
    readonly createdBy?: string,
  ) {}
}
```

- [ ] **Step 4: Funkkanal-Aggregat implementieren**

`funkkanal.aggregate.ts` — enthält `Funkkanal`-Entity + Liste `FunkkanalZuordnung[]`. Methoden wie in Step 1 spezifiziert. Domain-Events via `addDomainEvent(...)`. Invariante in `zuordneKraft`: prüft, dass kraftRef genau eine kind hat; dass gleiche Kraft nicht doppelt zugeordnet ist.

- [ ] **Step 5: Tests grün**

Run: `npx jest --testPathPatterns="funkkanal.aggregate" --no-coverage`. PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/domain/aggregates/funkkanal
git commit -m "✨(backend): Add Funkkanal-Aggregat mit Lifecycle und Zuordnungen"
```

---

### Task 10: Funkkanal Domain-Events

**Files:**
- Create: `packages/backend/src/domain/events/funkkanal-erstellt.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-geaendert.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-archiviert.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-reihenfolge-geaendert.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-zuordnung-erstellt.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-zuordnung-entfernt.event.ts`
- Create: `packages/backend/src/domain/events/notfall-alert-requested.event.ts`
- Create: zugehörige `__tests__`-Specs

- [ ] **Step 1: Failing Tests**

Je Event: Spec prüft `eventName()` (unique, `kebab-case`), Payload-Felder, Serialisierbarkeit (JSON.stringify/parse Roundtrip via `toPayload()/fromPayload()`).

- [ ] **Step 2: Events implementieren**

Am Muster von `eintrag-added.event.ts` orientieren. Jedes Event trägt: `eventId`, `aggregateId` (= `funkkanalId`), `einsatzId`, `occurredAt`, und spezifische Felder:

- `FunkkanalErstellt` — `name, details, status, sortIndex`
- `FunkkanalGeaendert` — `changedFields: { name?, details?, zweck?, status? }`
- `FunkkanalArchiviert` — (nur IDs)
- `FunkkanalReihenfolgeGeaendert` — `ordering: Array<{ kanalId, sortIndex }>` _(Event am Aggregat „Einsatz" oder am Kanal; für Einfachheit eigenes Domain-Event mit aggregateId = einsatzId)_
- `FunkkanalZuordnungErstellt` — `kanalId, zuordnungId, kraftRef, rufnameSnapshot, rolle`
- `FunkkanalZuordnungEntfernt` — `kanalId, zuordnungId`
- `NotfallAlertRequested` — `einsatzId, kanalId, funkspruchEintragId, absender?, text` (abgeleitet im NotfallHandler)

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/domain/events
git commit -m "✨(backend): Add Funkkanal Domain Events"
```

---

## Phase 4: Funkkanal Infrastructure

### Task 11: Funkkanal-Mapper + Repository

**Files:**
- Create: `packages/backend/src/infrastructure/funkkanal/prisma-funkkanal.mapper.ts`
- Create: `packages/backend/src/infrastructure/funkkanal/prisma-funkkanal.repository.ts`
- Create: `packages/backend/src/infrastructure/funkkanal/__tests__/prisma-funkkanal.mapper.spec.ts`
- Create: `packages/backend/src/infrastructure/funkkanal/__tests__/prisma-funkkanal.repository.spec.ts` (Integration, Test-DB)
- Create: `packages/backend/src/application/common/ports/funkkanal.repository.port.ts` — Interface

- [ ] **Step 1: Repository-Port definieren**

```typescript
// funkkanal.repository.port.ts
export interface IFunkkanalRepository {
  findById(id: string): Promise<Funkkanal | null>;
  findByEinsatzId(einsatzId: string, opts?: { includeArchived?: boolean }): Promise<Funkkanal[]>;
  existsByName(einsatzId: string, name: string, excludeId?: string): Promise<boolean>;
  hasFunkspruchReferenz(kanalId: string): Promise<boolean>;
  save(kanal: Funkkanal): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(einsatzId: string, ordering: Array<{ id: string; sortIndex: number }>): Promise<void>;
}
```

- [ ] **Step 2: Mapper-Tests (Roundtrip)**

Testfälle: TMO-Kanal mit Zuordnungen → Prisma-Shape → zurück zum Aggregat. Analog DMO + Analog.

- [ ] **Step 3: Mapper implementieren**

Serialisierung:
- `Funkkanal` → Prisma `Funkkanal.create`/`update` mit `detailsType = details.type`, `detailsData = details without type`
- `FunkkanalZuordnung` → einer der drei FK-Felder gesetzt je nach `kraftRef.kind`

Deserialisierung entsprechend invers.

- [ ] **Step 4: Repository implementieren**

Orientiere an `prisma-etb.repository` (Pattern: Transactional Save mit Outbox). `save(kanal)` in einer Prisma-Transaktion:
1. Upsert Funkkanal
2. Diff Zuordnungen (vorhandene löschen, neue inserten, geänderte updaten)
3. Outbox-Events aus `aggregate.getUncommittedEvents()` schreiben
4. `aggregate.markEventsAsCommitted()`

`hasFunkspruchReferenz(kanalId)` — SQL-Query über `etb_eintraege WHERE kontext_type='funkspruch' AND kontext_data->>'kanalId' = $1 LIMIT 1`.

`reorder(...)` — Bulk-Update in Transaktion.

- [ ] **Step 5: Integration-Tests gegen Test-DB**

Testfälle:
- Create + reload via `findByEinsatzId`
- Check-Constraint wird ausgelöst, wenn zwei FKs gleichzeitig gesetzt werden (via raw insert)
- `existsByName` True/False
- `hasFunkspruchReferenz` True nach Anlage eines Funkspruch-ETB-Eintrags

Run: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/infrastructure/funkkanal packages/backend/src/application/common/ports
git commit -m "✨(backend): Add Funkkanal-Repository mit Prisma-Mapper"
```

---

### Task 12: Event-Registry an 4 Stellen aktualisieren

**Files:**
- Modify: `packages/backend/src/infrastructure/outbox/event-deserializer.ts`
- Create: `packages/backend/src/infrastructure/events/adapters/funkkanal-event.adapter.ts`
- Modify: `packages/backend/src/infrastructure/events/adapters/index.ts`
- Modify: `packages/backend/src/infrastructure/events/event-adapters.module.ts`
- Prüfen: `packages/backend/src/infrastructure/outbox/event-serializer.ts` (evtl. nur Klassen-Mapping nötig)

- [ ] **Step 1: Serializer anpassen**

Zentrale Stelle finden (`event-serializer.ts`). Für jedes neue Event Klassen-Name → `eventName()`-Mapping hinzufügen, falls nötig.

- [ ] **Step 2: Deserializer Mapping ergänzen**

```typescript
import { FunkkanalErstelltEvent } from '@domain/events/funkkanal-erstellt.event';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
// ... alle 7 Events importieren

const EVENT_CLASS_MAP: Record<string, EventClass> = {
  // ... bestehende Einträge
  [FunkkanalErstelltEvent.eventName()]: FunkkanalErstelltEvent,
  [FunkkanalGeaendertEvent.eventName()]: FunkkanalGeaendertEvent,
  [FunkkanalArchiviertEvent.eventName()]: FunkkanalArchiviertEvent,
  [FunkkanalReihenfolgeGeaendertEvent.eventName()]: FunkkanalReihenfolgeGeaendertEvent,
  [FunkkanalZuordnungErstelltEvent.eventName()]: FunkkanalZuordnungErstelltEvent,
  [FunkkanalZuordnungEntferntEvent.eventName()]: FunkkanalZuordnungEntferntEvent,
  [NotfallAlertRequestedEvent.eventName()]: NotfallAlertRequestedEvent,
};
```

- [ ] **Step 3: Event-Adapter erstellen (Infrastructure)**

`funkkanal-event.adapter.ts` — delegiert an `EinsatzEventPublisher` für WebSocket-Broadcast (siehe Task 15):

```typescript
@Injectable()
export class FunkkanalEventAdapter {
  constructor(@Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher) {}

  @OnEvent(FunkkanalErstelltEvent.eventName())
  async onErstellt(event: FunkkanalErstelltEvent) {
    await this.publisher.broadcast(event.einsatzId, 'funkkanal:erstellt', { kanalId: event.aggregateId, ... });
  }

  // analog für alle 6 Funkkanal-Events + NotfallAlert
  @OnEvent(NotfallAlertRequestedEvent.eventName())
  async onNotfall(event: NotfallAlertRequestedEvent) {
    await this.publisher.broadcast(event.einsatzId, 'funk:notfall-alert', { ... });
  }
}
```

Zusätzlich: Ein `EtbFunkspruchBroadcastAdapter` hört auf `EintragAddedEvent` + `EintragKorrigiertEvent`, broadcastet `etb:eintrag-erstellt` / `etb:eintrag-korrigiert` an den Einsatz-Room.

- [ ] **Step 4: Adapters-Index + Module**

In `adapters/index.ts`: Export der neuen Adapter hinzufügen.
In `event-adapters.module.ts`: Adapter in `providers: []` registrieren.

- [ ] **Step 5: Adapter-Tests**

Spec je Adapter: Event wird empfangen → `publisher.broadcast` wird mit korrekten Args aufgerufen (Mock-Publisher). PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/infrastructure
git commit -m "✨(backend): Register Funkkanal-Events in Serializer, Deserializer und Adapters"
```

---

### Task 13: DI-Tokens & Infrastructure-Modul

**Files:**
- Modify: `packages/backend/src/infrastructure/di-tokens.ts`
- Create: `packages/backend/src/infrastructure/funkkanal/funkkanal-infrastructure.module.ts`

- [ ] **Step 1: Tokens anlegen**

In `di-tokens.ts` neuen Namespace:

```typescript
export const FUNKKANAL_TOKENS = {
  REPOSITORY: Symbol('IFunkkanalRepository'),
  MAPPER: Symbol('FunkkanalPrismaMapper'),
  KANALPLAN_PDF_SERVICE: Symbol('KanalplanPdfService'),
  EINSATZ_EVENT_PUBLISHER: Symbol('IEinsatzEventPublisher'),
} as const;

// Backward-kompatible Flat-Exports (an bestehendes Muster angepasst, falls nötig):
export const FUNKKANAL_REPOSITORY = FUNKKANAL_TOKENS.REPOSITORY;
export const KANALPLAN_PDF_SERVICE = FUNKKANAL_TOKENS.KANALPLAN_PDF_SERVICE;
export const EINSATZ_EVENT_PUBLISHER = FUNKKANAL_TOKENS.EINSATZ_EVENT_PUBLISHER;
```

- [ ] **Step 2: Modul anlegen**

```typescript
@Module({
  providers: [
    PrismaFunkkanalMapper,
    { provide: FUNKKANAL_REPOSITORY, useClass: PrismaFunkkanalRepository },
    FunkkanalEventAdapter,
  ],
  exports: [FUNKKANAL_REPOSITORY],
})
export class FunkkanalInfrastructureModule {}
```

- [ ] **Step 3: In Root/AppModule einhängen**

- [ ] **Step 4: `pnpm --filter @bluelight-hub/backend check:di:imports`** grün halten. Alle Injectable-Imports ohne `import type`.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure
git commit -m "✨(backend): Add FUNKKANAL_TOKENS und Infrastructure-Module"
```

---

## Phase 5: Funkkanal Application Layer

### Task 14: Funkkanal-Commands (CRUD + Reorder)

**Files:** (je Command ein Ordner `commands/<name>/`)
- Create: `create-funkkanal/{.command.ts, .handler.ts, __tests__/.handler.spec.ts}`
- Create: `update-funkkanal/*`
- Create: `archive-funkkanal/*`
- Create: `delete-funkkanal/*`
- Create: `reorder-funkkanaele/*`

Alle unter `packages/backend/src/application/funkkanal/commands/`.

Pattern für jeden Command (TDD):

- [ ] **Step 1: Command-Spec schreiben**

Testfälle pro Command:
- Happy Path → `Result.ok`, Repository-Save wird aufgerufen
- Validierungsfehler (z.B. leerer Name, doppelter Name via `existsByName` True) → `Result.fail` mit korrekter Error-Message
- Not-Found → `Result.fail('Funkkanal nicht gefunden')`
- Für `delete`: Wenn `hasFunkspruchReferenz` True → `Result.fail` mit Hinweis "Kanal archivieren statt löschen"

Beispiel `create-funkkanal.handler.spec.ts`:

```typescript
describe('CreateFunkkanalHandler', () => {
  it('erstellt aktiven Kanal und persistiert', async () => {
    const repo = createMockRepo();
    const handler = new CreateFunkkanalHandler(repo);
    const cmd = CreateFunkkanalCommand.create({
      einsatzId: 'e1', name: 'Kanal 1',
      details: { type: 'tmo', sprechgruppe: 'SG_1' },
      userId: 'u1',
    }).value;
    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(repo.save).toHaveBeenCalled();
  });

  it('lehnt doppelten Namen ab', async () => {
    const repo = createMockRepo({ existsByName: true });
    // ...
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });
});
```

Run: FAIL.

- [ ] **Step 2: Command + Handler implementieren**

Pattern am bestehenden `AddEintragHandler` orientieren. Jeder Command:
```typescript
@Injectable()
export class CreateFunkkanalHandler {
  constructor(@Inject(FUNKKANAL_REPOSITORY) private readonly repo: IFunkkanalRepository) {}
  async execute(cmd: CreateFunkkanalCommand): Promise<Result<Funkkanal>> {
    if (await this.repo.existsByName(cmd.einsatzId, cmd.name)) {
      return Result.fail('Kanalname bereits vergeben');
    }
    const detailsResult = buildDetailsVO(cmd.details);
    if (detailsResult.isFailure) return Result.fail(detailsResult.error);
    const aggregateResult = Funkkanal.create({ ... });
    if (aggregateResult.isFailure) return Result.fail(aggregateResult.error);
    await this.repo.save(aggregateResult.value);
    return Result.ok(aggregateResult.value);
  }
}
```

Reorder-Handler akzeptiert `{ einsatzId, ordering: Array<{id, sortIndex}> }` → lädt alle Kanäle → Aggregat-Methode `applyOrdering(ordering)` auf Domain-Ebene (emittiert `FunkkanalReihenfolgeGeaendertEvent`) → Repository `reorder(...)`.

- [ ] **Step 3: Alle Handler-Tests PASS**

Run: `npx jest --testPathPatterns="application/funkkanal" --no-coverage`. PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/funkkanal
git commit -m "✨(backend): Add Funkkanal CRUD Commands"
```

---

### Task 15: Funkkanal-Zuordnungs-Commands

**Files:**
- Create: `zuordne-kraft-zu-kanal/*`
- Create: `aendere-zuordnung-rolle/*`
- Create: `entferne-zuordnung/*`

Unter `packages/backend/src/application/funkkanal/commands/`.

- [ ] **Step 1: Failing Tests**

- `ZuordneKraftZuKanalCommand` — akzeptiert `kanalId`, **eine** von `fahrzeugId | personId | einheitId`, `rolle`, `userId`. Handler lädt Kanal, ruft `aggregate.zuordneKraft(...)`; bei bereits existierender Zuordnung → `Result.fail('Zuordnung existiert bereits')`. `rufnameSnapshot` wird vom Handler aus der jeweiligen Kraft-Repository geholt (Fahrzeug.funkrufname / Person.funkrufname / Einheit.name).
- `AendereZuordnungRolleCommand` — triggert `aggregate.aendereZuordnungRolle(...)`.
- `EntferneZuordnungCommand` — triggert `aggregate.entferneZuordnung(...)`.

- [ ] **Step 2: Kraft-Repositories für Rufname-Lookup injizieren**

`ZuordneKraftZuKanalHandler` hat zusätzliche Inject-Dependencies:
```typescript
@Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG) private readonly fahrzeugRepo,
@Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON) private readonly personRepo,
@Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einheitRepo,
```

Logik:
```typescript
let rufnameSnapshot: string;
if (cmd.fahrzeugId) {
  const fz = await this.fahrzeugRepo.findById(cmd.fahrzeugId);
  if (!fz) return Result.fail('Fahrzeug nicht gefunden');
  rufnameSnapshot = fz.funkrufname;
} // analog person / einheit
```

- [ ] **Step 3: Handler implementieren, Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/funkkanal/commands
git commit -m "✨(backend): Add Funkkanal Zuordnungs-Commands"
```

---

### Task 16: Funkkanal-Queries

**Files:**
- Create: `packages/backend/src/application/funkkanal/queries/get-kanalplan/{query.ts, handler.ts, __tests__/}`
- Create: `queries/get-funkkanal-by-id/*`
- Create: `queries/get-rufnamen-vorschlaege/*`

- [ ] **Step 1: Failing Tests**

- `GetKanalplanQuery(einsatzId, includeArchived?)` → Array aller Kanäle inkl. Zuordnungen, sortiert nach `sortIndex asc, name asc`.
- `GetFunkkanalByIdQuery(kanalId)` → einzelner Kanal oder `Result.fail('not found')`.
- `GetRufnamenVorschlaegeQuery(einsatzId)` → `{ fahrzeuge: Array<{ id, funkrufname }>, personen: Array<{...}>, einheiten: Array<{ id, name }> }`.

- [ ] **Step 2: Queries implementieren**

Query-Handler via Repository-Ports (Read-only).

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/funkkanal/queries
git commit -m "✨(backend): Add Funkkanal-Queries (Kanalplan, ById, Rufnamen-Vorschläge)"
```

---

### Task 17: NotfallFunkspruchAlertHandler (Application-Event-Handler)

**Files:**
- Create: `packages/backend/src/application/funkkanal/event-handlers/notfall-funkspruch-alert.handler.ts`
- Create: `packages/backend/src/application/funkkanal/event-handlers/__tests__/notfall-funkspruch-alert.handler.spec.ts`
- Modify: Infrastructure-Adapter registriert Handler für `EintragAddedEvent`

- [ ] **Step 1: Failing Test**

```typescript
it('emittiert NotfallAlertRequested bei Funkspruch mit Priorität notfall', async () => {
  const eventBus = { publish: jest.fn() };
  const handler = new NotfallFunkspruchAlertHandler(eventBus);
  const event = new EintragAddedEvent({
    aggregateId: 'etb1', einsatzId: 'e1',
    eintragId: 'ei1',
    kontext: { type: 'funkspruch', kanalId: 'k1', funkPrioritaet: 'notfall' },
    text: 'Brand 12',
    absender: 'Florian 1',
    // ...
  });
  await handler.handle(event);
  expect(eventBus.publish).toHaveBeenCalledWith(
    expect.objectContaining({ eventName: expect.stringContaining('notfall-alert-requested') })
  );
});

it('ignoriert Standard-Kontext', async () => {
  // event mit kontext.type='standard' → publish NICHT aufgerufen
});

it('ignoriert Funkspruch mit Priorität routine', async () => {
  // publish NICHT aufgerufen
});
```

Run: FAIL.

- [ ] **Step 2: Handler implementieren**

```typescript
@Injectable()
export class NotfallFunkspruchAlertHandler implements IEventHandler<EintragAddedEvent> {
  constructor(@Inject(EVENT_BUS) private readonly eventBus: IEventBus) {}

  async handle(event: EintragAddedEvent): Promise<void> {
    if (event.kontext?.type !== 'funkspruch') return;
    if (event.kontext.funkPrioritaet !== 'notfall') return;
    const alert = new NotfallAlertRequestedEvent({
      einsatzId: event.einsatzId,
      kanalId: event.kontext.kanalId,
      funkspruchEintragId: event.eintragId,
      absender: event.absender,
      text: event.text,
    });
    await this.eventBus.publish(alert);
  }
}
```

- [ ] **Step 3: Infrastructure-Adapter + Module-Registrierung**

Der bestehende Adapter-Mechanismus hört `EintragAddedEvent` → delegiert an Application-Handler. Registrierung in `event-adapters.module.ts` + `adapters/index.ts` + Serializer/Deserializer für `NotfallAlertRequestedEvent` (schon in Task 12 enthalten, verifizieren).

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/funkkanal/event-handlers packages/backend/src/infrastructure
git commit -m "✨(backend): Add NotfallFunkspruchAlertHandler"
```

---

## Phase 6: WebSocket-Gateway

### Task 18: EinsatzEventsGateway + Publisher

**Files:**
- Create: `packages/backend/src/infrastructure/websocket/einsatz-events.gateway.ts`
- Create: `packages/backend/src/infrastructure/websocket/einsatz-event-publisher.ts`
- Create: `packages/backend/src/infrastructure/websocket/events/einsatz-event.types.ts`
- Create: `packages/backend/src/infrastructure/websocket/__tests__/einsatz-events.gateway.spec.ts`
- Modify: `packages/backend/src/infrastructure/di-tokens.ts` (Publisher-Token)
- Create: `packages/backend/src/infrastructure/websocket/websocket.module.ts`
- Modify: `packages/backend/src/app.module.ts` (Modul einbinden)

- [ ] **Step 1: Event-Types definieren**

```typescript
// einsatz-event.types.ts
export type EinsatzEventName =
  | 'etb:eintrag-erstellt'
  | 'etb:eintrag-korrigiert'
  | 'funkkanal:erstellt'
  | 'funkkanal:geaendert'
  | 'funkkanal:archiviert'
  | 'funkkanal:reihenfolge-geaendert'
  | 'funkkanal:zuordnung-erstellt'
  | 'funkkanal:zuordnung-entfernt'
  | 'funk:notfall-alert';

export interface IEinsatzEventPublisher {
  broadcast(einsatzId: string, event: EinsatzEventName, payload: unknown): Promise<void>;
}
```

- [ ] **Step 2: Gateway implementieren**

Orientiere am bestehenden `ErinnerungGateway`:

```typescript
@WebSocketGateway({ namespace: '/ws/einsatz-events', cors: corsConfig })
@UseGuards(WsJwtAuthGuard)
export class EinsatzEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    @Inject(AUTH_SERVICE) private readonly authService: IAuthService,
    @Inject(EINSATZ_ZUGEHOERIGKEIT_CHECKER) private readonly access: IEinsatzAccessChecker,
  ) {}

  async handleConnection(client: Socket) {
    // JWT schon vom Guard verifiziert, UserId im client.data.user
    const einsatzId = client.handshake.query.einsatzId as string;
    if (!einsatzId) return client.disconnect();
    const allowed = await this.access.canAccess(client.data.user.id, einsatzId);
    if (!allowed) return client.disconnect();
    client.join(`einsatz:${einsatzId}`);
  }

  async handleDisconnect(client: Socket) {}
}
```

- [ ] **Step 3: Publisher implementieren**

```typescript
@Injectable()
export class EinsatzEventPublisher implements IEinsatzEventPublisher {
  constructor(private readonly gateway: EinsatzEventsGateway) {}
  async broadcast(einsatzId: string, event: EinsatzEventName, payload: unknown) {
    this.gateway.server.to(`einsatz:${einsatzId}`).emit(event, payload);
  }
}
```

Im Modul registrieren: `{ provide: EINSATZ_EVENT_PUBLISHER, useClass: EinsatzEventPublisher }`.

- [ ] **Step 4: Gateway-Tests**

Testfälle:
- Connect ohne einsatzId → disconnect
- Connect ohne Zugehörigkeit → disconnect
- Connect mit Zugehörigkeit → `client.join` wird mit korrektem Room aufgerufen
- `publisher.broadcast(...)` sendet via `server.to(room).emit(event, payload)`

Run: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure/websocket packages/backend/src/infrastructure/di-tokens.ts packages/backend/src/app.module.ts
git commit -m "✨(backend): Add EinsatzEventsGateway mit JWT-Auth und Room-Broadcast"
```

---

## Phase 7: HTTP Layer

### Task 19: DTOs (discriminated unions + CRUD)

**Files:** (alle unter `packages/backend/src/modules/funkkanal/dto/`)
- Create: `kanal-details.dto.ts` — `TmoDetailsDto`, `DmoDetailsDto`, `AnalogDetailsDto` + Union
- Create: `create-funkkanal.dto.ts`, `update-funkkanal.dto.ts`, `reorder-funkkanaele.dto.ts`
- Create: `funkkanal.response.dto.ts`
- Create: `zuordnung.dto.ts` — `CreateZuordnungDto`, `UpdateZuordnungRolleDto`, `ZuordnungResponseDto`
- Create: `rufname-vorschlaege.response.dto.ts`
- Create: `packages/backend/src/modules/etb/dto/eintrag-kontext.dto.ts` — `StandardKontextDto`, `FunkKontextDto`

- [ ] **Step 1: Discriminated-Union-DTO für KanalDetails**

```typescript
// kanal-details.dto.ts
export class TmoDetailsDto {
  @ApiProperty({ enum: ['tmo'] }) type: 'tmo';
  @ApiProperty() @IsString() @IsNotEmpty() sprechgruppe: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() gssi?: string;
}
// analog DmoDetailsDto, AnalogDetailsDto

@ApiExtraModels(TmoDetailsDto, DmoDetailsDto, AnalogDetailsDto)
export class KanalDetailsDto {
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(TmoDetailsDto) },
      { $ref: getSchemaPath(DmoDetailsDto) },
      { $ref: getSchemaPath(AnalogDetailsDto) },
    ],
    discriminator: { propertyName: 'type', mapping: { tmo: '#/components/schemas/TmoDetailsDto', dmo: '#/components/schemas/DmoDetailsDto', analog: '#/components/schemas/AnalogDetailsDto' } },
  })
  @ValidateNested() @Type(...)
  details: TmoDetailsDto | DmoDetailsDto | AnalogDetailsDto;
}
```

Analoges Muster für `EintragKontextDto` mit `StandardKontextDto | FunkKontextDto`.

- [ ] **Step 2: CRUD + Zuordnungs-DTOs**

`CreateFunkkanalDto`:
```typescript
@IsString() @IsNotEmpty() @MaxLength(100) name: string;
@ValidateNested() @Type(...) details: TmoDetailsDto | DmoDetailsDto | AnalogDetailsDto;
@IsOptional() @IsString() zweck?: string;
```

`UpdateFunkkanalDto`: alle Felder optional.
`ReorderFunkkanaeleDto`: `ordering: Array<{ id: string; sortIndex: number }>` mit `@ValidateNested({ each: true })`.
`CreateZuordnungDto`: `fahrzeugId?` XOR `personId?` XOR `einheitId?`, `rolle: 'primaer' | 'sekundaer' | 'zuhoeren'` (default `primaer`). Validator prüft: genau eines gesetzt.
`FunkkanalResponseDto`: alle Felder + `zuordnungen: ZuordnungResponseDto[]`.

- [ ] **Step 3: Validator-Test für "genau eine Kraft"**

Unit-Test: bei 0 gesetzten IDs → Validation-Fehler; bei 2 gesetzten → Fehler; bei 1 → OK.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/modules/funkkanal/dto packages/backend/src/modules/etb/dto
git commit -m "✨(backend): Add Funkkanal-DTOs und EintragKontext-DTOs"
```

---

### Task 20: Funkkanal-Controller (CRUD + Reorder)

**Files:**
- Create: `packages/backend/src/modules/funkkanal/funkkanal.controller.ts`
- Create: `packages/backend/src/modules/funkkanal/__tests__/funkkanal.controller.spec.ts`
- Create: `packages/backend/src/modules/funkkanal/funkkanal.module.ts`
- Modify: `app.module.ts` (FunkkanalModule importieren)

- [ ] **Step 1: Failing Controller-Spec**

Testfälle (mit Supertest + Mock-Handlers):
- `POST /einsatz/:einsatzId/funkkanaele` → 201, `@ApiWrappedCreatedResponse`-Wrapping
- `GET /einsatz/:einsatzId/funkkanaele` → 200 Array
- `GET /einsatz/:einsatzId/funkkanaele/:kanalId` → 200 oder 404
- `PATCH /einsatz/:einsatzId/funkkanaele/:kanalId` → 200
- `DELETE /einsatz/:einsatzId/funkkanaele/:kanalId` → 204 wenn OK, 422 wenn Referenzen
- `POST /einsatz/:einsatzId/funkkanaele/reorder` → 200

- [ ] **Step 2: Controller implementieren**

```typescript
@Controller('einsatz/:einsatzId/funkkanaele')
@UseGuards(JwtAuthGuard)
@ApiTags('funkkanal')
export class FunkkanalController {
  constructor(
    private readonly createHandler: CreateFunkkanalHandler,
    private readonly updateHandler: UpdateFunkkanalHandler,
    private readonly archiveHandler: ArchiveFunkkanalHandler,
    private readonly deleteHandler: DeleteFunkkanalHandler,
    private readonly reorderHandler: ReorderFunkkanaeleHandler,
    private readonly getKanalplanHandler: GetKanalplanHandler,
    private readonly getByIdHandler: GetFunkkanalByIdHandler,
  ) {}

  @Post()
  @ApiWrappedCreatedResponse(FunkkanalResponseDto, { description: 'Kanal erstellt' })
  async create(@Param('einsatzId') einsatzId: string, @Body() dto: CreateFunkkanalDto, @User() user) {
    const cmd = CreateFunkkanalCommand.create({ einsatzId, ...dto, userId: user.id });
    if (cmd.isFailure) throw new BadRequestException(cmd.error);
    const result = await this.createHandler.execute(cmd.value);
    return mapResult(result, toDto);
  }

  // ... weitere Endpoints
}
```

Fehler-Mapping via Helper `mapResult(result)`:
- `Result.fail` mit Message containing "existiert bereits" → 409 Conflict
- "nicht gefunden" → 404
- "referenziert" / "archivieren" → 422 Unprocessable
- sonst → 400 Bad Request

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/modules/funkkanal
git commit -m "✨(backend): Add Funkkanal-Controller"
```

---

### Task 21: Zuordnungs-Controller

**Files:**
- Create: `packages/backend/src/modules/funkkanal/zuordnung.controller.ts`
- Create: `packages/backend/src/modules/funkkanal/__tests__/zuordnung.controller.spec.ts`

- [ ] **Step 1: Failing Tests**

Endpoints:
- `POST /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen` (CreateZuordnungDto) → 201
- `PATCH /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen/:zuordnungId` (UpdateZuordnungRolleDto) → 200
- `DELETE /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen/:zuordnungId` → 204

- [ ] **Step 2: Controller implementieren**

Pattern wie Task 20. Eigener Controller-Prefix: `einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen`.

- [ ] **Step 3: Tests PASS. Commit**

```bash
git commit -m "✨(backend): Add Funkkanal-Zuordnungs-Controller"
```

---

### Task 22: Rufname-Vorschlaege-Controller

**Files:**
- Create: `packages/backend/src/modules/funkkanal/rufname-vorschlaege.controller.ts`
- Create: `__tests__/rufname-vorschlaege.controller.spec.ts`

- [ ] **Step 1: Failing Tests**

`GET /einsatz/:einsatzId/rufname-vorschlaege` → 200 mit `{ fahrzeuge, personen, einheiten }`.

- [ ] **Step 2: Controller implementieren**

Delegiert an `GetRufnamenVorschlaegeHandler`.

- [ ] **Step 3: Tests PASS. Commit**

```bash
git commit -m "✨(backend): Add Rufname-Vorschlaege-Controller"
```

---

### Task 23: PDF-Export — Service + Controller

**Files:**
- Create: `packages/backend/src/infrastructure/export/kanalplan-pdf.service.ts`
- Create: `packages/backend/src/infrastructure/export/__tests__/kanalplan-pdf.service.spec.ts`
- Create: `packages/backend/src/modules/funkkanal/kanalplan-export.controller.ts`
- Create: `__tests__/kanalplan-export.controller.spec.ts`

- [ ] **Step 1: Failing Service-Test**

```typescript
describe('KanalplanPdfService', () => {
  it('erzeugt PDF-Buffer mit Header, Kanal-Tabelle und Zuordnungen', async () => {
    const svc = new KanalplanPdfService();
    const kanaele: Funkkanal[] = [/* 2 Kanäle mit je 1 Zuordnung */];
    const buffer = await svc.generate({ einsatzName: 'Einsatz X', kanaele, exportiertAm: new Date('2026-04-14T12:00:00Z') });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // Buffer-Beginn ist PDF-Signatur
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
```

- [ ] **Step 2: Service implementieren**

Mit `pdfkit`:
- Seite: Titel, Einsatzname, Export-Zeitstempel
- Tabelle pro Kanal: Name, Typ-Badge-Text, Kennung (typabhängig formatiert: TMO → Sprechgruppe (GSSI), DMO → Kanal (Repeater), Analog → Band Frequenz (Kanalnr)), Zweck, Status
- Unter jedem Kanal: Zuordnungen als Liste: „Rufname (Rolle)"

- [ ] **Step 3: Controller-Endpoint**

```typescript
@Get('/einsatz/:einsatzId/kanalplan/export.pdf')
async export(@Param('einsatzId') einsatzId: string, @Res() res: Response) {
  const kanaele = await this.getKanalplanHandler.execute(...);
  const einsatzName = /* aus GetEinsatzById ... */;
  const buffer = await this.pdfService.generate({ einsatzName, kanaele: kanaele.value, exportiertAm: new Date() });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="kanalplan-${einsatzId}-${formatDate(new Date())}.pdf"`);
  res.send(buffer);
}
```

- [ ] **Step 4: Integration-Test**

Via Supertest: Response Content-Type `application/pdf`, Body startet mit `%PDF`.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure/export packages/backend/src/modules/funkkanal
git commit -m "✨(backend): Add Kanalplan-PDF-Export-Service und Controller"
```

---

### Task 24: ETB-Controller für Kontext erweitern

**Files:**
- Modify: `packages/backend/src/modules/etb/controllers/*` (bestehende ETB-Controller)
- Modify: `packages/backend/src/modules/etb/dto/eintrag.dto.ts` (response + create)

- [ ] **Step 1: Failing Test**

ETB-Controller-Spec: `POST /einsatz/:einsatzId/etb/eintraege` mit `kontext: { type: 'funkspruch', kanalId, funkPrioritaet }` + `ereignisZeitpunkt` → 201, Response enthält Kontext + Zeitstempel.

Zusätzlich: `GET /einsatz/:einsatzId/etb/eintraege?kontextType=funkspruch&kanalId=...` (optionale Query-Filter) → gefilterte Liste.

- [ ] **Step 2: Request-DTO + Response-DTO anpassen**

`CreateEtbEintragDto`:
```typescript
@ValidateNested() @Type(/* discriminator resolver */)
@IsOptional()
kontext?: StandardKontextDto | FunkKontextDto;

@IsDateString() @IsOptional()
ereignisZeitpunkt?: string;
```

`EtbEintragResponseDto`:
```typescript
erfasstAm: Date;
ereignisZeitpunkt: Date;
kontext: { type: 'standard' } | { type: 'funkspruch'; kanalId: string; funkPrioritaet: 'routine' | 'prioritaet' | 'notfall' };
```

- [ ] **Step 3: Controller-Methoden + Query-Handler anpassen**

`GetEtbEintraegeQuery` bekommt optionale Filter `kontextType`, `kanalId`. Repository-Query filtert entsprechend über `kontext_type` und `kontext_data ->> 'kanalId'`.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/modules/etb packages/backend/src/application/etb
git commit -m "♻️(backend): ETB-Controller erweitert um Kontext und Kontext-Filter"
```

---

## Phase 8: API-Client generieren

### Task 25: API-Client regenerieren

**Files:**
- Modify: `packages/shared/client/` (generated, darf manuell nicht angepasst werden, sondern regeneriert)

- [ ] **Step 1: Backend starten**

Run:
```bash
pnpm --filter @bluelight-hub/backend dev
```
Im Hintergrund, warte auf "Nest application successfully started" auf Port 3091.

- [ ] **Step 2: Client generieren**

Run:
```bash
pnpm run generate-api
```

Expected: `packages/shared/client/` aktualisiert mit `funkkanalControllerCreate*`, `etbCqrsControllerListEtbEintraege*`-Signaturen, KanalDetails/EintragKontext-Types.

- [ ] **Step 3: TypeScript-Check**

Run:
```bash
pnpm --filter @bluelight-hub/frontend typecheck
```

Erwartet: Keine Fehler bzgl. neuer Types. (Alte Calls könnten evtl. brechen, falls ETB-DTO-Shape inkompatibel — dann prüfen und Spec-additiv halten.)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/client
git commit -m "🤖(shared): Regenerate API client for Funkverkehr endpoints"
```

---

## Phase 9: Frontend — Foundation

### Task 26: Feature-Skelett + Store

**Files:**
- Create: `packages/frontend/src/features/funkverkehr/` (Verzeichnisstruktur laut Spec 8.1)
- Create: `packages/frontend/src/features/funkverkehr/stores/funkprotokoll-filter.store.ts`
- Create: `packages/frontend/src/features/funkverkehr/__tests__/store.spec.ts`
- Create: `packages/frontend/src/features/funkverkehr/index.ts` (Barrel)

- [ ] **Step 1: Failing Store-Test**

```typescript
import { getFilterForEinsatz, setFilterForEinsatz, resetFilterForEinsatz } from '../stores/funkprotokoll-filter.store';

describe('funkprotokoll-filter.store', () => {
  it('speichert Filter pro Einsatz-ID', () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1'], prioritaeten: ['notfall'], dichteMode: 'bubbles' });
    expect(getFilterForEinsatz('e1').kanalIds).toEqual(['k1']);
    expect(getFilterForEinsatz('e2').kanalIds).toEqual([]); // default
  });

  it('resetet Filter auf Default zurück', () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1'] });
    resetFilterForEinsatz('e1');
    expect(getFilterForEinsatz('e1').kanalIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Store implementieren**

```typescript
// funkprotokoll-filter.store.ts
import { Store } from '@tanstack/react-store';

export type DichteMode = 'bubbles' | 'kompakt';
export type FunkPrioritaetFilter = 'routine' | 'prioritaet' | 'notfall';

export interface FunkprotokollFilter {
  kanalIds: string[];
  prioritaeten: FunkPrioritaetFilter[];
  vonDate?: string;
  bisDate?: string;
  absenderQuery?: string;
  volltextQuery?: string;
  dichteMode: DichteMode;
}

const DEFAULT: FunkprotokollFilter = {
  kanalIds: [], prioritaeten: [], dichteMode: 'bubbles',
};

interface State { byEinsatz: Record<string, FunkprotokollFilter>; }

export const funkprotokollFilterStore = new Store<State>({ byEinsatz: {} });

export const getFilterForEinsatz = (einsatzId: string): FunkprotokollFilter =>
  funkprotokollFilterStore.state.byEinsatz[einsatzId] ?? DEFAULT;

export const setFilterForEinsatz = (einsatzId: string, patch: Partial<FunkprotokollFilter>): void => {
  funkprotokollFilterStore.setState((s) => ({
    byEinsatz: { ...s.byEinsatz, [einsatzId]: { ...getFilterForEinsatz(einsatzId), ...patch } },
  }));
};

export const resetFilterForEinsatz = (einsatzId: string): void => {
  funkprotokollFilterStore.setState((s) => {
    const copy = { ...s.byEinsatz };
    delete copy[einsatzId];
    return { byEinsatz: copy };
  });
};
```

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/funkverkehr
git commit -m "✨(frontend): Add funkverkehr Feature-Skelett und Filter-Store"
```

---

### Task 27: Kanalplan-API-Hooks

**Files:** (unter `packages/frontend/src/features/funkverkehr/api/`)
- Create: `queries.ts` — Query-Key Factory
- Create: `use-kanalplan.ts`, `use-create-funkkanal.ts`, `use-update-funkkanal.ts`, `use-archive-funkkanal.ts`, `use-delete-funkkanal.ts`, `use-reorder-funkkanaele.ts`
- Create: `use-create-zuordnung.ts`, `use-update-zuordnung-rolle.ts`, `use-remove-zuordnung.ts`
- Create: `use-rufname-vorschlaege.ts`
- Create: `use-export-kanalplan-pdf.ts`
- Create: Spec je Hook unter `__tests__/`

- [ ] **Step 1: Query-Key-Factory**

```typescript
export const FUNKVERKEHR_QUERY_KEYS = {
  kanalplan: (einsatzId: string) => ['funkverkehr', 'kanalplan', einsatzId] as const,
  kanal: (kanalId: string) => ['funkverkehr', 'kanal', kanalId] as const,
  rufnamenVorschlaege: (einsatzId: string) => ['funkverkehr', 'rufnamen-vorschlaege', einsatzId] as const,
  funkprotokoll: (einsatzId: string, filter?: unknown) =>
    ['funkverkehr', 'funkprotokoll', einsatzId, filter] as const,
};
```

- [ ] **Step 2: Query-Hook als Vorlage (`use-kanalplan.ts`)**

```typescript
export const useKanalplan = ({ einsatzId, includeArchived = false, enabled = true }) => {
  return useQuery({
    enabled: enabled && !!einsatzId,
    queryKey: [...FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId), { includeArchived }],
    queryFn: () => api.funkkanal().funkkanalControllerListV*({ einsatzId, includeArchived }),
    staleTime: 30_000,
  });
};
```

- [ ] **Step 3: Mutation-Hooks mit Optimistic Updates**

Pattern (Beispiel `use-create-funkkanal.ts`):
```typescript
export const useCreateFunkkanal = (einsatzId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFunkkanalDto) =>
      api.funkkanal().funkkanalControllerCreateV*({ einsatzId, createFunkkanalDto: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      toast.success('Kanal erstellt');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
};
```

Reorder-Hook mit Optimistic Update:
```typescript
onMutate: async (ordering) => {
  await qc.cancelQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
  const prev = qc.getQueryData(FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId));
  qc.setQueryData(FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId), (old) =>
    applyOrderingLocally(old, ordering)
  );
  return { prev };
},
onError: (_e, _v, ctx) => qc.setQueryData(FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId), ctx?.prev),
onSettled: () => qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) }),
```

- [ ] **Step 4: PDF-Export-Hook**

```typescript
// use-export-kanalplan-pdf.ts
export const useExportKanalplanPdf = (einsatzId: string) => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.funkkanal().kanalplanExportControllerExport({ einsatzId }, { responseType: 'blob' });
      return { blob: response as unknown as Blob, filename: `kanalplan-${einsatzId}-${format(new Date(), 'yyyy-MM-dd')}.pdf` };
    },
    onSuccess: ({ blob, filename }) => {
      downloadExport(blob, filename);
      toast.success('PDF heruntergeladen');
    },
    onError: () => toast.error('PDF-Export fehlgeschlagen'),
  });
};
```

Wiederverwendet `downloadExport` aus `packages/frontend/src/features/reminders/lib/download-export.ts` — bei Bedarf als shared utility nach `shared/lib/` verschieben (YAGNI: erstmal nicht verschieben, einfach importieren).

- [ ] **Step 5: Tests je Hook**

Run: `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="funkverkehr/api"`. PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/features/funkverkehr/api
git commit -m "✨(frontend): Add Kanalplan API-Hooks (TanStack Query)"
```

---

### Task 28: ETB-basierte Funkprotokoll-Hooks

**Files:**
- Create: `packages/frontend/src/features/funkverkehr/hooks/use-funkprotokoll-eintraege.ts`
- Create: `packages/frontend/src/features/funkverkehr/hooks/use-create-funkspruch.ts`
- Create: `packages/frontend/src/features/funkverkehr/hooks/use-dichte-mode.ts`
- Create: `__tests__/` für alle

- [ ] **Step 1: `useFunkprotokollEintraege`-Test**

Wrappt ETB-Query mit Filter `kontextType='funkspruch'` und weiteren Frontend-Filtern. Mit Filter-Store verdrahtet.

```typescript
it('ruft ETB-API mit kontextType=funkspruch und Filter auf', () => {
  // ... rendered hook with einsatzId='e1'
  // filter-store pre-populated with kanalIds=['k1']
  expect(mockApi).toHaveBeenCalledWith(expect.objectContaining({ einsatzId: 'e1', kontextType: 'funkspruch', kanalId: 'k1' }));
});
```

- [ ] **Step 2: Implementieren**

```typescript
export const useFunkprotokollEintraege = (einsatzId: string) => {
  const filter = useStore(funkprotokollFilterStore, (s) => s.byEinsatz[einsatzId] ?? DEFAULT);
  return useQuery({
    queryKey: FUNKVERKEHR_QUERY_KEYS.funkprotokoll(einsatzId, filter),
    queryFn: () => api.etb().etbCqrsControllerListEintraege*({
      einsatzId,
      kontextType: 'funkspruch',
      kanalId: filter.kanalIds.length === 1 ? filter.kanalIds[0] : undefined,
      // weitere Filter als Server-Query-Params soweit im Backend unterstützt (ansonsten clientseitig filtern in `select`)
    }),
    select: (data) => applyClientFilters(data, filter),
  });
};
```

- [ ] **Step 3: `useCreateFunkspruch`-Hook**

Wrappt `AddEintragCommand` mit `kontext.type='funkspruch'` + Default `kategorie=KOMMUNIKATION`.

```typescript
export const useCreateFunkspruch = (einsatzId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { text: string; absender?: string; empfaenger?: string; kanalId: string; funkPrioritaet: FunkPrioritaetFilter; ereignisZeitpunkt: string; }) =>
      api.etb().etbCqrsControllerAddEintrag*({
        einsatzId,
        addEintragDto: {
          text: input.text,
          absender: input.absender, empfaenger: input.empfaenger,
          kategorie: 'KOMMUNIKATION',
          kontext: { type: 'funkspruch', kanalId: input.kanalId, funkPrioritaet: input.funkPrioritaet },
          ereignisZeitpunkt: input.ereignisZeitpunkt,
        },
      }),
    onSuccess: () => {
      // Optimistic: WebSocket-Event wird ebenfalls invalidate triggern — hier nur Fallback
      qc.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
};
```

- [ ] **Step 4: `useDichteMode`-Hook**

Dünner Wrapper um Filter-Store-`dichteMode` mit `useStore`-Selector + Setter.

- [ ] **Step 5: Tests PASS. Commit**

```bash
git commit -m "✨(frontend): Add Funkprotokoll-Hooks (ETB-Wrapping, CreateFunkspruch, DichteMode)"
```

---

### Task 29: WebSocket-Hook `useEinsatzEvents`

**Files:**
- Create: `packages/frontend/src/features/funkverkehr/api/use-einsatz-events.ts`
- Create: `packages/frontend/src/features/funkverkehr/api/__tests__/use-einsatz-events.spec.ts`
- Check: `packages/frontend/package.json` — `socket.io-client` vorhanden? (Sonst: `pnpm --filter @bluelight-hub/frontend add socket.io-client`).

- [ ] **Step 1: Socket.io-Client installieren (falls fehlt)**

Run:
```bash
cd packages/frontend && grep socket.io-client package.json || pnpm add socket.io-client
```

- [ ] **Step 2: Failing Test**

```typescript
it('connected on mount, subscribed auf Einsatz-Events', async () => {
  const mockSocket = createMockSocket();
  // ...render hook
  expect(mockSocket.emit).toBeCalledWith(...); // or: on('connect') was triggered
});

it('bei etb:eintrag-erstellt invalidate funkprotokoll- und etb-Queries', async () => {
  // fire event → queryClient.invalidate called with expected keys
});

it('bei funk:notfall-alert ruft onNotfall-Callback auf', async () => {});

it('reconnect backoff 1s → 2s → 5s → 10s → 30s', async () => {
  // jest.useFakeTimers(); trigger disconnect mehrmals, überprüfe Delays
});
```

- [ ] **Step 3: Hook implementieren**

```typescript
// use-einsatz-events.ts
import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { queryClient } from '@/shared/query-client';

const BACKOFF_SCHEDULE = [1000, 2000, 5000, 10000, 30000];

export interface UseEinsatzEventsOptions {
  einsatzId: string;
  onNotfall?: (payload: NotfallAlertPayload) => void;
}

export const useEinsatzEvents = ({ einsatzId, onNotfall }: UseEinsatzEventsOptions) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const retryIdxRef = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!einsatzId) return;

    const connect = () => {
      const socket = io('/ws/einsatz-events', {
        query: { einsatzId },
        auth: { token: getAuthToken() }, // Projekt-Konvention
        reconnection: false, // wir steuern selbst
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        retryIdxRef.current = 0;
        setStatus('connected');
        // Reconnect-Fall: Full-Invalidate
        queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'kanalplan', einsatzId] });
        queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
        queryClient.invalidateQueries({ queryKey: ['etb', einsatzId] });
      });

      socket.on('disconnect', () => {
        setStatus('reconnecting');
        const delay = BACKOFF_SCHEDULE[Math.min(retryIdxRef.current, BACKOFF_SCHEDULE.length - 1)];
        retryIdxRef.current += 1;
        setTimeout(connect, delay);
      });

      socket.on('etb:eintrag-erstellt', () => {
        queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
        queryClient.invalidateQueries({ queryKey: ['etb', einsatzId] });
      });
      socket.on('etb:eintrag-korrigiert', () => {
        queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
        queryClient.invalidateQueries({ queryKey: ['etb', einsatzId] });
      });
      ['erstellt', 'geaendert', 'archiviert', 'reihenfolge-geaendert', 'zuordnung-erstellt', 'zuordnung-entfernt']
        .forEach((ev) => socket.on(`funkkanal:${ev}`, () => {
          queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'kanalplan', einsatzId] });
        }));
      socket.on('funk:notfall-alert', (payload) => onNotfall?.(payload));
    };

    connect();
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, [einsatzId]);

  return { status };
};
```

- [ ] **Step 4: Tests PASS. Commit**

```bash
git commit -m "✨(frontend): Add useEinsatzEvents WebSocket-Hook mit Backoff-Reconnect"
```

---

## Phase 10: Frontend — UI Atoms + Molecules

### Task 30: Atoms — FunkPrioritaetBadge, KanalStatusBadge

**Files:**
- Create: `packages/frontend/src/features/funkverkehr/ui/atoms/FunkPrioritaetBadge.atom.tsx`
- Create: `packages/frontend/src/features/funkverkehr/ui/atoms/KanalStatusBadge.atom.tsx`
- Create: `utils/priority-color.ts`
- Create: Specs

- [ ] **Step 1: `priority-color.ts`**

```typescript
export const PRIORITAET_STYLES = {
  routine: { text: 'text-slate-600', border: 'border-slate-300', icon: 'radio' },
  prioritaet: { text: 'text-amber-600', border: 'border-amber-500', icon: 'warning' },
  notfall: { text: 'text-red-700', border: 'border-red-600', icon: 'siren', pulse: true },
} as const;
```

- [ ] **Step 2: Failing Test**

```typescript
it('rendert "Routine" mit slate-Farbe', () => {
  render(<FunkPrioritaetBadge prioritaet="routine" />);
  expect(screen.getByText(/routine/i)).toBeInTheDocument();
});

it('Notfall hat Pulse-Animation und Siren-Icon', () => {
  const { container } = render(<FunkPrioritaetBadge prioritaet="notfall" />);
  expect(container.querySelector('.animate-pulse')).toBeTruthy();
  // Icon-Check je nach Icon-Library
});
```

- [ ] **Step 3: Implementieren**

```tsx
export const FunkPrioritaetBadge = ({ prioritaet }: { prioritaet: FunkPrioritaetValue }) => {
  const s = PRIORITAET_STYLES[prioritaet];
  const Icon = getIcon(s.icon);
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', s.text, s.pulse && 'animate-pulse')}>
      <Icon className="size-3.5" aria-hidden />
      {LABEL[prioritaet]}
    </span>
  );
};
```

Analog `KanalStatusBadge` für `aktiv | inaktiv | archiviert`.

- [ ] **Step 4: Tests PASS. Commit**

```bash
git commit -m "✨(frontend): Add FunkPrioritaetBadge und KanalStatusBadge Atoms"
```

---

### Task 31: Molecules — KanalDetailsForm + FunkKontextBadge + NotfallAlertToast

**Files:**
- Create: `ui/molecules/KanalDetailsForm.molecule.tsx`
- Create: `ui/molecules/FunkKontextBadge.molecule.tsx`
- Create: `ui/molecules/NotfallAlertToast.molecule.tsx`
- Create: `ui/molecules/FunkspruchBubble.molecule.tsx`
- Create: `ui/molecules/FunkspruchCompactRow.molecule.tsx`
- Create: Specs

- [ ] **Step 1: KanalDetailsForm — typabhängige Felder**

Props:
```typescript
interface Props {
  value: KanalDetailsShape;
  onChange: (next: KanalDetailsShape) => void;
  errors?: Partial<Record<keyof KanalDetailsShape, string>>;
}
```

Rendert Radio-Group für Typ (TMO/DMO/Analog) und wechselt dann die sichtbaren Felder. TanStack-Form verdrahtet (siehe KanalEditDrawer in Task 32).

- [ ] **Step 2: FunkKontextBadge**

Zeigt Kanal-Name + Priorität kompakt. Falls `kanal` zur Zeit nicht auflösbar (z.B. inaktiv gelöscht) → "Kanal (gelöscht)".

- [ ] **Step 3: NotfallAlertToast — triggered on event**

```tsx
// via sonner's custom content
toast.custom((id) => (
  <div className="animate-pulse rounded border-l-4 border-red-700 bg-red-50 p-3">
    <SirenIcon /> NOTFALL — {payload.kanal}: "{payload.text}"
  </div>
), { duration: 10_000 });
```

- [ ] **Step 4: FunkspruchBubble + FunkspruchCompactRow**

`FunkspruchBubble`: Links Absender + Zeit, Rechts Empfänger; Inhalt als Text. Farbakzent via Priorität-Border links.
`FunkspruchCompactRow`: `[HH:mm:ss] {KANAL} {ABSENDER} → {EMPFAENGER}: "{Inhalt}"` mit Priorität-Icon.

- [ ] **Step 5: Tests je Molecule**

- [ ] **Step 6: Commit**

```bash
git commit -m "✨(frontend): Add Funkverkehr Molecules (KanalDetailsForm, Bubbles, NotfallToast)"
```

---

## Phase 11: Frontend — UI Organisms — Kanalplan

### Task 32: KanalEditDrawer + ZuordnungsManager

**Files:**
- Create: `ui/organisms/KanalEditDrawer.organism.tsx`
- Create: `ui/organisms/ZuordnungsManager.organism.tsx`
- Create: `schemas/kanal.schema.ts` (Zod)
- Create: Specs

- [ ] **Step 1: Zod-Schema für Kanal**

```typescript
export const kanalDetailsSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tmo'), sprechgruppe: z.string().min(1), gssi: z.string().optional() }),
  z.object({ type: z.literal('dmo'), dmoKanal: z.string().min(1), repeater: z.string().optional() }),
  z.object({ type: z.literal('analog'), band: z.enum(['4m', '2m']), frequenz: z.string().min(1), kanalnummer: z.string().optional() }),
]);

export const kanalFormSchema = z.object({
  name: z.string().min(1).max(100),
  details: kanalDetailsSchema,
  zweck: z.string().optional(),
});
```

- [ ] **Step 2: KanalEditDrawer implementieren**

- Nutzt `Dialog.SlideIn` (aus `shared/ui/molecules/dialog.molecule.tsx`, `position="right"`, `size="lg"`)
- TanStack Form (`@tanstack/react-form`) mit Zod-Resolver
- Props: `kanal?: FunkkanalDto` (undefined → Create-Modus, sonst Edit)
- Submit → `useCreateFunkkanal` oder `useUpdateFunkkanal` (je nach Modus)
- Zeigt `KanalDetailsForm`
- Zeigt Löschen-Button (nur Edit-Modus) → `useDeleteFunkkanal` mit Confirm-Dialog; falls Fehler 422 → Toast mit Archivieren-Vorschlag

- [ ] **Step 3: ZuordnungsManager**

- Combobox (Headless UI Combobox) mit `useRufnamenVorschlaege(einsatzId)` als Datenquelle
- Gruppen: Fahrzeuge (funkrufname), Personen (funkrufname), Einheiten (name)
- Pro bereits zugeordnete Kraft: Segmented-Control für Rolle (`primaer | sekundaer | zuhoeren`) + Remove-X
- Submit `Kraft zuordnen` → `useCreateZuordnung`
- Rolle ändern → `useUpdateZuordnungRolle`
- Entfernen → `useRemoveZuordnung`

- [ ] **Step 4: Tests mit Mock-API-Client**

- [ ] **Step 5: Commit**

```bash
git commit -m "✨(frontend): Add KanalEditDrawer und ZuordnungsManager Organisms"
```

---

### Task 33: KanalplanTable mit Drag-and-Drop

**Files:**
- Create: `ui/organisms/KanalplanTable.organism.tsx`
- Create: `hooks/use-kanal-columns.tsx`
- Create: Spec
- Check: `@dnd-kit/core` + `@dnd-kit/sortable` in `package.json` (sonst installieren)

- [ ] **Step 1: dnd-kit installieren (falls fehlt)**

Run:
```bash
cd packages/frontend && grep dnd-kit package.json || pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: KanalplanTable implementieren**

Basis: `DataTable` (aus `shared/ui/organisms/data-table.organism.tsx`) **wird nicht** genutzt (passt nicht zu Drag-Row). Stattdessen eigene `<table>` mit `DndContext` + `SortableContext` + `useSortable`.

Spalten laut Spec 8.3:
- Drag-Handle (`useSortable`)
- Name
- Typ-Badge (aus `details.type`)
- Kennung (formatiert: `formatKanalKennung(details)` aus `utils/kanal-details-helpers.ts`)
- Zuordnungen — `<ZuordnungChipList>` (inline editor öffnet `ZuordnungsManager` per Click)
- Status-Badge
- Aktionen — Dropdown (Edit, Archivieren, Löschen, Kräfte zuordnen)

`onDragEnd` → baut neue `ordering` (id + sortIndex) → `useReorderFunkkanaele`.

- [ ] **Step 3: Tests**

- Dragging-Interaction (jest-dom + fireEvent)
- Sortierung nach Drop
- Dropdown-Aktionen

- [ ] **Step 4: Commit**

```bash
git commit -m "✨(frontend): Add KanalplanTable mit Drag-and-Drop-Sortierung"
```

---

## Phase 12: Frontend — UI Organisms — Funkprotokoll

### Task 34: FunkspruchComposer

**Files:**
- Create: `ui/organisms/FunkspruchComposer.organism.tsx`
- Create: Spec

- [ ] **Step 1: Failing Test**

- Cmd/Ctrl+Enter triggert Submit
- Shift+Enter fügt Newline ein
- Priorität-Default `routine`
- Ereigniszeitpunkt-Default = now
- `useRufnamenVorschlaege` wird für Absender-Combobox genutzt
- Kanal-Dropdown nur aktive Kanäle

- [ ] **Step 2: Implementieren**

- TanStack Form
- Felder:
  - Combobox Absender — Rufnamen-Vorschläge (gruppiert), `allowCustomValue=true`
  - Combobox Empfänger — optional, `allowCustomValue=true`
  - Dropdown Kanal — `kanalplan.filter(k => k.status === 'aktiv')`
  - Textarea Inhalt (min-height 2.5rem, grows)
  - Segmented-Control Priorität
  - DateTimePicker Ereigniszeitpunkt (default jetzt, edit-bar)
- Sticky am unteren Rand des Chat-Views (Flex-Container)
- Submit → `useCreateFunkspruch`

- [ ] **Step 3: Tests PASS. Commit**

```bash
git commit -m "✨(frontend): Add FunkspruchComposer"
```

---

### Task 35: FunkprotokollFilterSidebar

**Files:**
- Create: `ui/organisms/FunkprotokollFilterSidebar.organism.tsx`
- Create: Spec

- [ ] **Step 1: Implementieren**

- Multi-Select Combobox Kanal (aus `useKanalplan`)
- Checkbox-Gruppe Priorität (3 Werte)
- DateTime-Picker von/bis
- Combobox Absender (`allowCustomValue`)
- Input Volltextsuche (debounce 250ms)
- "Zurücksetzen"-Button → `resetFilterForEinsatz`
- Liest/schreibt über `funkprotokollFilterStore`

- [ ] **Step 2: Tests**

- [ ] **Step 3: Commit**

```bash
git commit -m "✨(frontend): Add FunkprotokollFilterSidebar"
```

---

### Task 36: FunkprotokollView (virtualisiert)

**Files:**
- Create: `ui/organisms/FunkprotokollView.organism.tsx`
- Create: Spec

- [ ] **Step 1: Implementieren**

- `useFunkprotokollEintraege(einsatzId)` Daten
- `useVirtualizer` (wie in `EtbEntryList`) mit:
  - `count: eintraege.length`
  - `estimateSize: () => (dichteMode === 'kompakt' ? 28 : 88)`
  - `getScrollElement: () => scrollContainerRef.current`
  - `useFlushSync: false`
- Dichte-Toggle oben rechts (`useDichteMode`): Bubbles | Kompakt
- Render-Item je nach Modus: `FunkspruchBubble` oder `FunkspruchCompactRow`
- Auto-Scroll: wenn User am unteren Ende (`isNearBottom`), bei neuem Eintrag automatisch scrollen. Sonst Badge "X neue Nachrichten" oben anzeigen, Click springt runter.
- Pause-Indikator wenn `!isNearBottom`

- [ ] **Step 2: Tests (mit Mock-Daten, evtl. Virtualizer-Mock)**

- [ ] **Step 3: Commit**

```bash
git commit -m "✨(frontend): Add virtualisierte FunkprotokollView mit Dichte-Modi"
```

---

### Task 37: FunkverkehrLayout + Page + Tab-Routing

**Files:**
- Create: `ui/organisms/FunkverkehrLayout.organism.tsx`
- Create: `ui/pages/FunkverkehrPage.tsx`
- Modify: `packages/frontend/src/routes/app/einsatz/$einsatzId/kommunikation/funk.tsx`
- Create: Specs

- [ ] **Step 1: Route validateSearch**

```typescript
// funk.tsx
import { z } from 'zod';
const searchSchema = z.object({ tab: z.enum(['kanalplan', 'protokoll']).optional().default('kanalplan') });

export const Route = createFileRoute('/app/einsatz/$einsatzId/kommunikation/funk')({
  validateSearch: searchSchema.parse,
  component: FunkverkehrPage,
});
```

- [ ] **Step 2: FunkverkehrLayout**

- Tab-Leiste (Headless UI Tabs oder Custom) mit `tab` aus URL
- Tab-Click → `router.navigate` mit neuen Search-Params (erhalten)
- Zeigt Child-Organismus je nach Tab:
  - `tab=kanalplan` → Filter-Bar + `KanalplanTable` + "Kanal hinzufügen"-Button + "PDF exportieren"-Button
  - `tab=protokoll` → Flex-Layout: Filter-Sidebar (links 280px) + `FunkprotokollView` (flex-1) mit `FunkspruchComposer` sticky unten

- [ ] **Step 3: FunkverkehrPage verdrahtet useEinsatzEvents**

```typescript
export function FunkverkehrPage() {
  const { einsatzId } = Route.useParams();
  useEinsatzEvents({ einsatzId, onNotfall: showNotfallToast });
  return <FunkverkehrLayout einsatzId={einsatzId} />;
}
```

- [ ] **Step 4: Route-Tests**

- URL `?tab=protokoll` rendert Protokoll-Tab
- Tab-Switch ändert URL
- Default (keine query) → Kanalplan-Tab

- [ ] **Step 5: Commit**

```bash
git commit -m "✨(frontend): Add FunkverkehrPage mit Tab-Routing (Kanalplan/Protokoll)"
```

---

## Phase 13: Architektur-Dokumentation

### Task 38: Vier ADRs schreiben

**Files:**
- Create: `docs/adr/NNNN-etb-eintrag-kontext-discriminated-union.md`
- Create: `docs/adr/NNNN-websocket-event-bus-einsatz-scoped.md`
- Create: `docs/adr/NNNN-funkkanal-als-aggregat.md`
- Create: `docs/adr/NNNN-polymorphe-zuordnung-nullable-fks.md`

`NNNN` = nächste freie Nummer (ls `docs/adr/` zuerst).

- [ ] **Step 1: ADR-Nummerierung prüfen**

Run:
```bash
ls docs/adr/ | sort | tail -5
```
Nächste Nummer ermitteln.

- [ ] **Step 2: ADR-Template nutzen**

Projekt-Konvention (`docs/adr/000X-template.md` falls vorhanden, sonst aus bestehender ADR kopieren).

Inhalte:
1. **ETB-Kontext-ADR:** Status, Kontext (ETB als Protokoll-Backbone), Entscheidung (Discriminated Union via `kontextType + kontextData` JSONB), Alternativen (separate Tabellen, Inheritance), Konsequenzen, Migration.
2. **WebSocket-ADR:** Namespace `/ws/einsatz-events`, Room-Pattern `einsatz:{id}`, JWT-Auth-Flow, Broadcast-Semantik (nur Notifications, nicht State), Reconnect-Strategie (Client-seitig).
3. **Funkkanal-Aggregat-ADR:** Abgrenzung zu ETB, Lifecycle (aktiv/inaktiv/archiviert), typisierte `KanalDetails`-VO.
4. **Polymorphe-Zuordnung-ADR:** Gegenüberstellung `kraftType + kraftId` (String) vs. drei nullable FKs + Check-Constraint. Entscheidung: FKs + Constraint wegen referentieller Integrität und CASCADE-Delete-Korrektheit.

- [ ] **Step 3: Commit**

```bash
git add docs/adr
git commit -m "📝(docs): Add 4 ADRs für Funkverkehr-Feature"
```

---

### Task 39: arc42-Architektur aktualisieren

**Files:**
- Modify: `docs/architecture/` — relevante Sektionen (Bausteinsicht, Laufzeitsicht)

- [ ] **Step 1: Architektur-Dateien sichten**

Run:
```bash
ls docs/architecture/
```

- [ ] **Step 2: Neue Bausteine dokumentieren**

Ergänzen:
- Funkkanal-Aggregat im Bausteinsicht-Abschnitt (Domain-Layer)
- WebSocket-Gateway in Infrastructure
- Laufzeitsicht: Sequenzdiagramm "Funkspruch mit Notfall-Priorität" (Command → Aggregat → Event → Adapter → WebSocket → Client)

- [ ] **Step 3: Commit**

```bash
git add docs/architecture
git commit -m "📝(docs): arc42 um Funkkanal-Aggregat und WebSocket-Gateway erweitert"
```

---

## Phase 14: Verification

### Task 40: Full-Stack E2E im Browser

**Files:** _(keine Änderungen — Verification-Schritt)_

- [ ] **Step 1: Backend + Frontend starten**

Run (parallel):
```bash
pnpm -r dev
```
Bis `http://localhost:3090` und `http://localhost:3091/api` erreichbar.

- [ ] **Step 2: Login + Einsatz öffnen**

Chrome-DevTools-MCP oder Browser:
- Login mit `rubeen / MyPass123*`
- Einsatz auswählen, zur URL `/app/einsatz/:einsatzId/kommunikation/funk` navigieren

- [ ] **Step 3: Kanalplan-Golden-Path**

- Kanal `TMO/SG_Feuer_1` hinzufügen → erscheint in Tabelle
- Zweiten Kanal `DMO/310` hinzufügen
- Drag-and-Drop Reihenfolge ändern → persistiert nach Reload
- Kräfte zuordnen (Fahrzeug + Person) → `rufnameSnapshot` korrekt
- PDF exportieren → Download startet, PDF enthält beide Kanäle + Zuordnungen
- Kanal archivieren → verschwindet (Filter `aktiv`)
- Filter auf "alle inkl. archiviert" → archivierter Kanal erscheint mit Badge

- [ ] **Step 4: Funkprotokoll-Golden-Path**

- Tab wechseln `?tab=protokoll`
- Funkspruch eingeben: Absender "Florian 1", Empfänger "LST", Kanal (erster aktiver Kanal), Text "Anfahrt", Priorität Routine → erscheint im Bubble-View
- Dichte umschalten auf Kompakt → Darstellung wechselt, Scroll-Position bleibt
- Filter: nur Kanal X → nur dessen Einträge sichtbar
- Filter zurücksetzen

- [ ] **Step 5: Live-Updates (zwei Sessions)**

- In zweitem Browser-Tab (oder Incognito, gleicher User) gleicher Einsatz
- Tab A erstellt Funkspruch → erscheint in Tab B ohne Reload
- Tab A setzt Priorität `notfall` → Tab B zeigt `NotfallAlertToast` + Pulse

- [ ] **Step 6: Reconnect**

- Backend kurz stoppen (`pnpm --filter @bluelight-hub/backend dev` Prozess stoppen)
- Banner "Verbindung wird wiederhergestellt" erscheint
- Backend neu starten → nach wenigen Sekunden erneut connected, Daten werden invalidiert und neu geladen

- [ ] **Step 7: Edge-Cases manuell**

- Kanal mit referenziertem Funkspruch löschen → 422-Fehler-Toast mit Archivieren-Hinweis
- Doppelter Kanalname → 409-Fehler-Toast
- Funkspruch mit Ereigniszeitpunkt in Zukunft → Validation-Block

- [ ] **Step 8: Ergebnisse dokumentieren**

Befunde in PR-Beschreibung festhalten. Bei Fehler: zurück in den Plan, Task korrigieren.

---

### Task 41: Definition of Done Checks

**Files:** _(keine Änderungen)_

- [ ] **Step 1: Tests grün**

Run:
```bash
pnpm --filter @bluelight-hub/backend test 2>&1 | tail -10
cd packages/frontend && pnpm test -- --run --reporter=basic 2>&1 | tail -10
```

Exakte Test-Counts notieren — Backend + Frontend mit `/` (pre-existing Failures erlaubt wenn unrelated).

- [ ] **Step 2: Linting**

Run:
```bash
pnpm lint
```
Expected: keine Fehler (oxlint + oxfmt).

- [ ] **Step 3: Architektur-Checks**

Run:
```bash
pnpm --filter @bluelight-hub/backend check:arch
pnpm --filter @bluelight-hub/backend check:di:imports
```
Beide grün.

- [ ] **Step 4: generate-api verifizieren**

Run:
```bash
pnpm run generate-api
git status packages/shared/client
```
Expected: keine ungetrackten Änderungen (alle Updates bereits committed).

- [ ] **Step 5: Event-Registry-Check**

Alle neuen Events in 4 Stellen registriert:
- `infrastructure/outbox/event-serializer.ts`
- `infrastructure/outbox/event-deserializer.ts`
- `infrastructure/events/adapters/index.ts`
- `infrastructure/events/event-adapters.module.ts`

Run:
```bash
grep -l "FunkkanalErstellt\|FunkkanalZuordnungErstellt\|NotfallAlertRequested" packages/backend/src/infrastructure/outbox packages/backend/src/infrastructure/events -r
```
Expected: mindestens 4 Treffer.

- [ ] **Step 6: Migrations prüfen**

Run:
```bash
ls packages/backend/prisma/migrations | grep -E "add_etb_eintrag_kontext_and_zeitstempel|add_funkkanal_and_zuordnung"
```
Expected: beide Migrations vorhanden.

- [ ] **Step 7: PR-Beschreibung vorbereiten**

Enthält:
- Scope-Zusammenfassung
- Migration-Hinweis (zwei neue Migrations)
- Test-Counts Backend + Frontend (vorher/nachher)
- Browser-Test-Checkliste (Kanalplan, Protokoll, Live-Updates, Reconnect, Edge-Cases)
- Verweis auf Follow-ups #685, #686, #687

- [ ] **Step 8: Finaler Commit (falls noch etwas offen)**

Falls aus Verification kleinere Fixes nötig waren, als separate Commits. Sonst: Plan ist fertig.

---

## Zusammenfassung

- **41 Tasks** über 14 Phasen
- **Zwei Prisma-Migrations** mit klarem Namen und Backfill
- **Domain-first** (ETB-Refactor, Funkkanal-Aggregat) vor Infrastructure, Application, HTTP, Frontend
- **Event-Registry** an 4 Stellen (Task 12)
- **WebSocket-Integration** mit JWT-Auth und Reconnect-Backoff
- **Full-Stack-E2E** + DoD-Checks vor PR
- **4 ADRs** + arc42-Update
- **Follow-up-Issue #687** für Einsatzabschnitt-Nachzug

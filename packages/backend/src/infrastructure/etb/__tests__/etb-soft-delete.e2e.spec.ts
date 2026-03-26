// @ts-nocheck
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatztagebuchAggregate } from '@domain/aggregates/einsatztagebuch.aggregate';
import { EintragId } from '@domain/value-objects/eintrag-id';
import { createEtbE2eModule, teardownE2eModule, cleanupTestData, type EtbE2eTestContext } from './etb.e2e-setup';

const databaseAvailable = !!process.env.DATABASE_URL;

/**
 * E2E Tests fuer ETB Korrektur-Eintrag Funktionalitaet (Issue #554)
 *
 * Testet das DRK-konforme Korrektur-Verhalten:
 * - Eintraege sind nach Erstellung unveraenderlich
 * - Korrekturen erfolgen ueber neue Korrektur-Eintraege
 * - Original-Eintraege werden als korrigiert markiert
 * - Sequence Numbers bleiben stabil
 *
 * Compliance: DRK Revisionssicherheit durch Korrektur-Pattern
 */
(databaseAvailable ? describe : describe.skip)('ETB Korrektur-Eintraege (E2E)', () => {
  let ctx: EtbE2eTestContext;

  beforeAll(async () => {
    ctx = await createEtbE2eModule();
  });

  afterAll(async () => {
    await teardownE2eModule(ctx);
  });

  beforeEach(async () => {
    await cleanupTestData(ctx);
  });

  it('should create korrektur eintrag and mark original as korrigiert', async () => {
    const einsatzId = EinsatzId.create(ctx.testEinsatzId).value!;
    const userId = UserId.create(ctx.testUserId).value!;
    const aggregate = EinsatztagebuchAggregate.create(einsatzId).value!;
    const addResult = aggregate.addEintrag('Original text', userId);
    expect(addResult.isSuccess).toBe(true);
    const eintragId = addResult.value?.id;
    await ctx.repository.save(aggregate);

    // When: Korrektur erstellen
    const retrieved = await ctx.repository.findByEinsatzId(einsatzId);
    expect(retrieved).not.toBeNull();
    const korrekturResult = retrieved?.addKorrekturEintrag(eintragId, 'Korrigierter Text', userId);
    expect(korrekturResult.isSuccess).toBe(true);
    await ctx.repository.save(retrieved!);

    // Then: Original ist korrigiert, Korrektur-Eintrag existiert
    const reloaded = await ctx.repository.findByEinsatzId(einsatzId);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.eintraege).toHaveLength(2);
    expect(reloaded?.eintraege[0]?.isKorrigiert).toBe(true);
    expect(reloaded?.eintraege[1]?.isKorrektur).toBe(true);
    expect(reloaded?.eintraege[1]?.text).toBe('Korrigierter Text');
  });

  it('should include korrektur entries in loaded aggregate', async () => {
    const einsatzId = EinsatzId.create(ctx.testEinsatzId).value!;
    const userId = UserId.create(ctx.testUserId).value!;
    const aggregate = EinsatztagebuchAggregate.create(einsatzId).value!;
    aggregate.addEintrag('Entry 1', userId);
    aggregate.addEintrag('Entry 2', userId);
    aggregate.addEintrag('Entry 3', userId);
    await ctx.repository.save(aggregate);

    // Korrektur fuer Entry 2
    const retrieved = await ctx.repository.findByEinsatzId(einsatzId);
    expect(retrieved).not.toBeNull();
    const entry2Id = retrieved?.eintraege[1]?.id;
    retrieved?.addKorrekturEintrag(entry2Id, 'Korrektur Entry 2', userId);
    await ctx.repository.save(retrieved!);

    // When: Neu laden
    const reloaded = await ctx.repository.findByEinsatzId(einsatzId);

    // Then: 3 Original + 1 Korrektur = 4 Eintraege
    expect(reloaded).not.toBeNull();
    expect(reloaded?.eintraege).toHaveLength(4);
  });

  it('should maintain stable sequence numbers after korrektur', async () => {
    const einsatzId = EinsatzId.create(ctx.testEinsatzId).value!;
    const userId = UserId.create(ctx.testUserId).value!;
    const aggregate = EinsatztagebuchAggregate.create(einsatzId).value!;
    aggregate.addEintrag('Entry 1', userId);
    aggregate.addEintrag('Entry 2', userId);
    aggregate.addEintrag('Entry 3', userId);
    await ctx.repository.save(aggregate);

    // When: Korrektur fuer Entry 2
    const retrieved = await ctx.repository.findByEinsatzId(einsatzId);
    const entry2Id = retrieved?.eintraege[1]?.id;
    retrieved?.addKorrekturEintrag(entry2Id, 'Korrektur', userId);
    await ctx.repository.save(retrieved!);

    // Then: Sequence numbers stabil (1, 2, 3, 4)
    const reloaded = await ctx.repository.findByEinsatzId(einsatzId);
    const seqNums = reloaded?.eintraege.map((e) => e.sequenceNumber.value);
    expect(seqNums).toEqual([1, 2, 3, 4]);
  });

  it('should increment version on korrektur', async () => {
    const einsatzId = EinsatzId.create(ctx.testEinsatzId).value!;
    const userId = UserId.create(ctx.testUserId).value!;
    const aggregate = EinsatztagebuchAggregate.create(einsatzId).value!;
    aggregate.addEintrag('Entry', userId);
    await ctx.repository.save(aggregate);

    const retrieved = await ctx.repository.findByEinsatzId(einsatzId);
    expect(retrieved?.version.versionNumber).toBe(2);

    // When: Korrektur
    const eintragId = retrieved?.eintraege[0]?.id;
    retrieved?.addKorrekturEintrag(eintragId, 'Korrektur', userId);
    await ctx.repository.save(retrieved!);

    // Then: Version inkrementiert
    const updated = await ctx.repository.findByEinsatzId(einsatzId);
    expect(updated?.version.versionNumber).toBe(3);
  });

  it('should fail korrektur for already korrigiert entry', async () => {
    const einsatzId = EinsatzId.create(ctx.testEinsatzId).value!;
    const userId = UserId.create(ctx.testUserId).value!;
    const aggregate = EinsatztagebuchAggregate.create(einsatzId).value!;
    aggregate.addEintrag('Entry', userId);
    await ctx.repository.save(aggregate);

    // Erste Korrektur
    let retrieved = await ctx.repository.findByEinsatzId(einsatzId);
    const eintragId = retrieved?.eintraege[0]?.id;
    retrieved?.addKorrekturEintrag(eintragId, 'Korrektur 1', userId);
    await ctx.repository.save(retrieved!);

    // When: Zweite Korrektur fuer gleichen Eintrag
    retrieved = await ctx.repository.findByEinsatzId(einsatzId);
    const secondResult = retrieved?.addKorrekturEintrag(eintragId, 'Korrektur 2', userId);

    // Then: Fehlschlag - bereits korrigiert
    expect(secondResult.isFailure).toBe(true);
    expect(secondResult.error).toContain('bereits korrigiert');
  });

  it('should create snapshot BEFORE korrektur mutation', async () => {
    const einsatzId = EinsatzId.create(ctx.testEinsatzId).value!;
    const userId = UserId.create(ctx.testUserId).value!;
    const aggregate = EinsatztagebuchAggregate.create(einsatzId).value!;
    aggregate.addEintrag('Original Entry', userId);
    await ctx.repository.save(aggregate);

    // When: Korrektur
    const retrieved = await ctx.repository.findByEinsatzId(einsatzId);
    const eintragId = retrieved?.eintraege[0]?.id;
    retrieved?.addKorrekturEintrag(eintragId, 'Korrektur', userId);
    await ctx.repository.save(retrieved!);

    // Then: Snapshot enthaelt Eintrag vor Korrektur
    const history = await ctx.repository.getHistory(retrieved?.id);
    expect(history.length).toBeGreaterThan(0);
    const lastSnapshot = history[history.length - 1];
    const snapshotEntry = lastSnapshot.eintraege.find((e) => e.text === 'Original Entry');
    expect(snapshotEntry).toBeDefined();
  });
});

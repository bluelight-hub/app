import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEquipmentChecklistState } from '../use-equipment-checklist-state';
import { AUSRUESTUNGS_CHECKLISTEN } from '../../constants/ausruestungs-checkliste.constants';

describe('useEquipmentChecklistState (Story 3.5 AC6)', () => {
  const einheitId = 'cle-einheit-1';

  it('startet im pristine-Status, geht über in-progress nach complete', () => {
    const basisItems = AUSRUESTUNGS_CHECKLISTEN.BASIS.items;
    const { result } = renderHook(() =>
      useEquipmentChecklistState({
        propagationGroupId: 'pg-1',
        einheitenIds: [einheitId],
        aktiveProfile: ['BASIS'],
      }),
    );

    expect(result.current.statusFor(einheitId)).toBe('pristine');

    act(() => {
      result.current.toggle(einheitId, basisItems[0].id, true);
    });
    expect(result.current.statusFor(einheitId)).toBe('in-progress');

    act(() => {
      for (const item of basisItems) {
        result.current.toggle(einheitId, item.id, true);
      }
    });
    expect(result.current.statusFor(einheitId)).toBe('complete');
  });

  it('liefert nicht-gehakte Items in deterministischer Reihenfolge via missingItemsFor', () => {
    const basisItems = AUSRUESTUNGS_CHECKLISTEN.BASIS.items;
    const { result } = renderHook(() =>
      useEquipmentChecklistState({
        propagationGroupId: 'pg-1',
        einheitenIds: [einheitId],
        aktiveProfile: ['BASIS'],
      }),
    );

    act(() => {
      result.current.toggle(einheitId, basisItems[1].id, true);
    });

    const missing = result.current.missingItemsFor(einheitId);
    expect(missing.map((m) => m.id)).toEqual([basisItems[0].id, basisItems[2].id]);
  });

  it('ist toggle-idempotent (gleicher Wert → keine State-Mutation)', () => {
    const basisItems = AUSRUESTUNGS_CHECKLISTEN.BASIS.items;
    const { result } = renderHook(() =>
      useEquipmentChecklistState({
        propagationGroupId: 'pg-1',
        einheitenIds: [einheitId],
        aktiveProfile: ['BASIS'],
      }),
    );

    act(() => {
      result.current.toggle(einheitId, basisItems[0].id, true);
    });
    const checkedAfterFirst = result.current.checked;

    act(() => {
      result.current.toggle(einheitId, basisItems[0].id, true);
    });
    // Idempotenz: Map-Referenz bleibt identisch.
    expect(result.current.checked).toBe(checkedAfterFirst);
  });

  it('reset() leert den Stand', () => {
    const basisItems = AUSRUESTUNGS_CHECKLISTEN.BASIS.items;
    const { result } = renderHook(() =>
      useEquipmentChecklistState({
        propagationGroupId: 'pg-1',
        einheitenIds: [einheitId],
        aktiveProfile: ['BASIS'],
      }),
    );

    act(() => {
      result.current.toggle(einheitId, basisItems[0].id, true);
      result.current.toggle(einheitId, basisItems[1].id, true);
    });
    expect(result.current.statusFor(einheitId)).toBe('in-progress');

    act(() => {
      result.current.reset();
    });
    expect(result.current.statusFor(einheitId)).toBe('pristine');
    expect(result.current.checked.size).toBe(0);
  });

  it('liefert missingByEinheit pro Einheit als Label-Liste', () => {
    const basisItems = AUSRUESTUNGS_CHECKLISTEN.BASIS.items;
    const einheitA = 'cle-a';
    const einheitB = 'cle-b';
    const { result } = renderHook(() =>
      useEquipmentChecklistState({
        propagationGroupId: 'pg-1',
        einheitenIds: [einheitA, einheitB],
        aktiveProfile: ['BASIS'],
      }),
    );

    act(() => {
      // Einheit A komplett gehakt, B teilweise.
      for (const item of basisItems) result.current.toggle(einheitA, item.id, true);
      result.current.toggle(einheitB, basisItems[0].id, true);
    });

    expect(result.current.missingByEinheit.get(einheitA)).toEqual([]);
    expect(result.current.missingByEinheit.get(einheitB)).toEqual([basisItems[1].label, basisItems[2].label]);
  });

  it('Wechsel der propagationGroupId resettet den Stand (P2)', () => {
    const basisItems = AUSRUESTUNGS_CHECKLISTEN.BASIS.items;
    const { result, rerender } = renderHook(
      ({ pgId }: { pgId: string }) =>
        useEquipmentChecklistState({
          propagationGroupId: pgId,
          einheitenIds: [einheitId],
          aktiveProfile: ['BASIS'],
        }),
      { initialProps: { pgId: 'pg-A' } },
    );

    act(() => {
      result.current.toggle(einheitId, basisItems[0].id, true);
      result.current.toggle(einheitId, basisItems[1].id, true);
    });
    expect(result.current.checked.size).toBe(2);

    // Wechsel auf andere Gruppe → State darf NICHT mit kommen.
    rerender({ pgId: 'pg-B' });
    expect(result.current.checked.size).toBe(0);
    expect(result.current.statusFor(einheitId)).toBe('pristine');
  });

  it('aggregiert Items über mehrere Profile und de-dupliziert nach id', () => {
    const { result } = renderHook(() =>
      useEquipmentChecklistState({
        propagationGroupId: 'pg-1',
        einheitenIds: [einheitId],
        aktiveProfile: ['BASIS', 'INFEKTION'],
      }),
    );

    const expectedTotal = AUSRUESTUNGS_CHECKLISTEN.BASIS.items.length + AUSRUESTUNGS_CHECKLISTEN.INFEKTION.items.length;
    const missing = result.current.missingItemsFor(einheitId);
    expect(missing.length).toBe(expectedTotal);
  });
});

/**
 * Tests für den DRY-Helper `lookupPsaPropagationExists` (Story 3.6 AC3 / AC4).
 *
 * Wird sowohl vom `AckPsaQuittungHandler` (Story 3.4) als auch vom
 * `MeldeLueckeHandler` (Story 3.6) konsumiert.
 */
import { lookupPsaPropagationExists } from '../lookup-psa-propagation';

const PROPAGATION_GROUP_ID = 'group-cuid2-12345678901234567';
const EINHEIT_ID = 'einheit-cuid2-1234567890123456';

describe('lookupPsaPropagationExists()', () => {
  it('liefert true, wenn die Outbox eine passende psa_profil_geaendert-Row enthält', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'outbox-row-1' });
    const tx = { outboxEvent: { findFirst } } as never;

    const result = await lookupPsaPropagationExists(tx, PROPAGATION_GROUP_ID, EINHEIT_ID);

    expect(result).toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        eventName: 'eigenschutz.psa_profil_geaendert',
        AND: [{ payload: { path: ['propagationGroupId'], equals: PROPAGATION_GROUP_ID } }, { payload: { path: ['einheitId'], equals: EINHEIT_ID } }],
      },
      select: { id: true },
    });
  });

  it('liefert false, wenn keine passende Row gefunden wird', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const tx = { outboxEvent: { findFirst } } as never;

    const result = await lookupPsaPropagationExists(tx, PROPAGATION_GROUP_ID, EINHEIT_ID);

    expect(result).toBe(false);
  });

  it('liefert false, wenn der TransactionContext kein outboxEvent-Delegate exposed (Test-Mock-Fallback)', async () => {
    const tx = {} as never;

    const result = await lookupPsaPropagationExists(tx, PROPAGATION_GROUP_ID, EINHEIT_ID);

    expect(result).toBe(false);
  });

  it('liefert false, wenn outboxEvent.findFirst nicht existiert', async () => {
    const tx = { outboxEvent: {} } as never;

    const result = await lookupPsaPropagationExists(tx, PROPAGATION_GROUP_ID, EINHEIT_ID);

    expect(result).toBe(false);
  });
});

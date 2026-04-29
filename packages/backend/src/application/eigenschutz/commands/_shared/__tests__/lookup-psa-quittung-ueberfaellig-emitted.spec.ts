import { lookupQuittungUeberfaelligEmitted } from '../lookup-psa-quittung-ueberfaellig-emitted';

describe('lookupQuittungUeberfaelligEmitted (Story 3.7 AC4)', () => {
  it('liefert false, wenn Tx-Mock kein outboxEvent-Delegate exposed', async () => {
    const result = await lookupQuittungUeberfaelligEmitted({} as never, 'group-1', 'einheit-1');
    expect(result).toBe(false);
  });

  it('liefert false, wenn findFirst null zurückgibt (kein Treffer)', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const tx = { outboxEvent: { findFirst } } as never;

    const result = await lookupQuittungUeberfaelligEmitted(tx, 'group-1', 'einheit-1');
    expect(result).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        eventName: 'eigenschutz.quittung_ueberfaellig',
        AND: [{ payload: { path: ['propagationGroupId'], equals: 'group-1' } }, { payload: { path: ['einheitId'], equals: 'einheit-1' } }],
      },
      select: { id: true },
    });
  });

  it('liefert true, wenn findFirst eine Outbox-Row liefert', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'evt-1' });
    const tx = { outboxEvent: { findFirst } } as never;

    const result = await lookupQuittungUeberfaelligEmitted(tx, 'group-1', 'einheit-1');
    expect(result).toBe(true);
  });
});

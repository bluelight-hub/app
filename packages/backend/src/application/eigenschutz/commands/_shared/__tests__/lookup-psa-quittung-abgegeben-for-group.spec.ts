import { lookupQuittungAbgegebenForGroup } from '../lookup-psa-quittung-abgegeben-for-group';

describe('lookupQuittungAbgegebenForGroup (Story 3.7 AC4)', () => {
  it('liefert false, wenn Tx-Mock kein psaProfilQuittung-Delegate exposed', async () => {
    const result = await lookupQuittungAbgegebenForGroup({} as never, 'group-1', 'einheit-1');
    expect(result).toBe(false);
  });

  it('liefert false, wenn findFirst null liefert (keine Quittung abgegeben)', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const tx = { psaProfilQuittung: { findFirst } } as never;

    const result = await lookupQuittungAbgegebenForGroup(tx, 'group-1', 'einheit-1');
    expect(result).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({
      where: { propagationGroupId: 'group-1', einheitId: 'einheit-1' },
      select: { id: true },
    });
  });

  it('liefert true, wenn findFirst eine Quittungs-Row liefert', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'q-1' });
    const tx = { psaProfilQuittung: { findFirst } } as never;

    const result = await lookupQuittungAbgegebenForGroup(tx, 'group-1', 'einheit-1');
    expect(result).toBe(true);
  });
});

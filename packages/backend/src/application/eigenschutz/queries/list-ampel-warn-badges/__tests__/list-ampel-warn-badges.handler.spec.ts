import { Result } from '@domain/common/result';
import type { IAmpelWarnBadgeReadPort } from '@domain/eigenschutz/repositories';
import { AmpelWarnBadgeService } from '@domain/eigenschutz/services/ampel-warn-badge.service';
import { ListAmpelWarnBadgesHandler } from '../list-ampel-warn-badges.handler';
import { ListAmpelWarnBadgesQuery } from '../list-ampel-warn-badges.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui06501';

describe('ListAmpelWarnBadgesHandler', () => {
  it('lädt Kandidaten über den Read-Port und mappt über den Domain-Service auf DTOs', async () => {
    const readPort = {
      listCandidatesByEinsatz: jest.fn().mockResolvedValue(
        Result.ok({
          gefaehrdungen: [{ einsatzId: EINSATZ_ID, einheitId: 'einheit-1', gefaehrdungsbeurteilungId: 'gef-1', gefaehrdungItemId: 'item-1', gefaehrdungTitel: 'Gefahr', risikoklasse: 'ROT' }],
          psa: [{ einsatzId: EINSATZ_ID, einheitId: 'einheit-1', propagationGroupId: 'group-1', occurredAt: new Date('2026-05-08T10:00:00.000Z'), ueberfaelligSeitMin: 8 }],
        }),
      ),
    } as unknown as IAmpelWarnBadgeReadPort;
    const handler = new ListAmpelWarnBadgesHandler(readPort, new AmpelWarnBadgeService());

    const result = await handler.execute(new ListAmpelWarnBadgesQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(2);
    expect(readPort.listCandidatesByEinsatz).toHaveBeenCalledWith(EINSATZ_ID);
  });

  it('validiert leere Einsatz-IDs defensiv', async () => {
    const readPort = { listCandidatesByEinsatz: jest.fn() } as unknown as IAmpelWarnBadgeReadPort;
    const handler = new ListAmpelWarnBadgesHandler(readPort, new AmpelWarnBadgeService());

    const result = await handler.execute(new ListAmpelWarnBadgesQuery('   '));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('BusinessRule:EinsatzErforderlich');
    expect(readPort.listCandidatesByEinsatz).not.toHaveBeenCalled();
  });

  it('reicht InfrastructureError-Sentinels aus dem Read-Port durch', async () => {
    const readPort = { listCandidatesByEinsatz: jest.fn().mockResolvedValue(Result.fail('InfrastructureError:AmpelWarnBadgeRead:Error')) } as unknown as IAmpelWarnBadgeReadPort;
    const handler = new ListAmpelWarnBadgesHandler(readPort, new AmpelWarnBadgeService());

    const result = await handler.execute(new ListAmpelWarnBadgesQuery(EINSATZ_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:AmpelWarnBadgeRead:Error');
  });
});

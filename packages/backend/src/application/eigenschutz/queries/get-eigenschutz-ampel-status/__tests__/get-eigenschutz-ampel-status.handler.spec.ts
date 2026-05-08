import { Result } from '@domain/common/result';
import type { IAmpelProjectionRepository } from '@domain/eigenschutz/repositories';
import { GetEigenschutzAmpelStatusHandler } from '../get-eigenschutz-ampel-status.handler';
import { GetEigenschutzAmpelStatusQuery } from '../get-eigenschutz-ampel-status.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui06201';

describe('GetEigenschutzAmpelStatusHandler', () => {
  it('delegiert an das AmpelProjection-Repository', async () => {
    const rows = [{ einsatzId: EINSATZ_ID, einheitId: 'einheit-1', status: 'GRUEN' }];
    const repo = { findByEinsatz: jest.fn().mockResolvedValue(Result.ok(rows)) } as unknown as IAmpelProjectionRepository;
    const handler = new GetEigenschutzAmpelStatusHandler(repo);

    const result = await handler.execute(new GetEigenschutzAmpelStatusQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(rows);
    expect(repo.findByEinsatz).toHaveBeenCalledWith(EINSATZ_ID);
  });

  it('validiert leere Einsatz-IDs defensiv', async () => {
    const repo = { findByEinsatz: jest.fn() } as unknown as IAmpelProjectionRepository;
    const handler = new GetEigenschutzAmpelStatusHandler(repo);

    const result = await handler.execute(new GetEigenschutzAmpelStatusQuery('   '));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('BusinessRule:EinsatzErforderlich');
    expect(repo.findByEinsatz).not.toHaveBeenCalled();
  });

  it('reicht InfrastructureError-Sentinels durch', async () => {
    const repo = { findByEinsatz: jest.fn().mockResolvedValue(Result.fail('InfrastructureError:AmpelProjection:db-down')) } as unknown as IAmpelProjectionRepository;
    const handler = new GetEigenschutzAmpelStatusHandler(repo);

    const result = await handler.execute(new GetEigenschutzAmpelStatusQuery(EINSATZ_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:AmpelProjection:db-down');
  });
});

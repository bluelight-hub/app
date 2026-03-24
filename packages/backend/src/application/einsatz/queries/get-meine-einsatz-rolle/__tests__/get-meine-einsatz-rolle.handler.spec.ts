import { GetMeineEinsatzRolleQueryHandler } from '../get-meine-einsatz-rolle.handler';
import { GetMeineEinsatzRolleQuery } from '../get-meine-einsatz-rolle.query';
import type { IEinsatzRollenReadRepository } from '@domain/repositories/i-einsatz-rollen-read.repository';
import { Result } from '@domain/common/result';

describe('GetMeineEinsatzRolleQueryHandler', () => {
  let handler: GetMeineEinsatzRolleQueryHandler;
  let mockRepository: {
    findMeineRolle: jest.Mock;
    hasAnyRollen: jest.Mock;
  };

  const userId = 'user-123';
  const einsatzId = 'einsatz-456';

  beforeEach(() => {
    mockRepository = {
      findMeineRolle: jest.fn(),
      hasAnyRollen: jest.fn().mockResolvedValue(Result.ok(true)),
    };

    handler = new GetMeineEinsatzRolleQueryHandler(mockRepository as unknown as IEinsatzRollenReadRepository);
  });

  describe('Admin/SuperAdmin', () => {
    it('gibt volle Permissions fuer ADMIN zurueck (aus JWT, keine DB-Abfrage)', async () => {
      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'ADMIN');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        rolle: 'ADMIN',
        permissions: {
          canCreate: true,
          canQuittieren: true,
          canKorrigieren: true,
          canManageStatus: true,
          canExport: true,
          canViewAll: true,
          isBeobachter: false,
          canEditEtb: true,
          canEditPinnwand: true,
          isSecondaryRole: false,
        },
      });
      expect(mockRepository.findMeineRolle).not.toHaveBeenCalled();
    });

    it('gibt volle Permissions fuer SUPER_ADMIN zurueck (aus JWT, keine DB-Abfrage)', async () => {
      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'SUPER_ADMIN');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.rolle).toBe('SUPER_ADMIN');
      expect(result.value?.permissions.canCreate).toBe(true);
      expect(result.value?.permissions.canQuittieren).toBe(true);
      expect(result.value?.permissions.canKorrigieren).toBe(true);
      expect(result.value?.permissions.canManageStatus).toBe(true);
      expect(result.value?.permissions.canExport).toBe(true);
      expect(result.value?.permissions.canViewAll).toBe(true);
      expect(result.value?.permissions.isBeobachter).toBe(false);
      expect(mockRepository.findMeineRolle).not.toHaveBeenCalled();
    });
  });

  describe('BEFEHLSGEBER', () => {
    it('gibt korrekte Permissions zurueck', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: 'BEFEHLSGEBER' }));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        rolle: 'BEFEHLSGEBER',
        permissions: {
          canCreate: true,
          canQuittieren: true,
          canKorrigieren: true,
          canManageStatus: true,
          canExport: true,
          canViewAll: true,
          isBeobachter: false,
          canEditEtb: true,
          canEditPinnwand: true,
          isSecondaryRole: false,
        },
      });
    });
  });

  describe('ERSTELLER', () => {
    it('kann erstellen und exportieren, aber nicht quittieren oder korrigieren', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: 'ERSTELLER' }));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        rolle: 'ERSTELLER',
        permissions: {
          canCreate: true,
          canQuittieren: false,
          canKorrigieren: false,
          canManageStatus: true,
          canExport: true,
          canViewAll: true,
          isBeobachter: false,
          canEditEtb: true,
          canEditPinnwand: true,
          isSecondaryRole: false,
        },
      });
    });
  });

  describe('EMPFAENGER', () => {
    it('kann nur quittieren', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: 'EMPFAENGER' }));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        rolle: 'EMPFAENGER',
        permissions: {
          canCreate: false,
          canQuittieren: true,
          canKorrigieren: false,
          canManageStatus: false,
          canExport: false,
          canViewAll: false,
          isBeobachter: false,
          canEditEtb: false,
          canEditPinnwand: false,
          isSecondaryRole: true,
        },
      });
    });
  });

  describe('BEOBACHTER', () => {
    it('kann nur alles einsehen, ist Beobachter', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: 'BEOBACHTER' }));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        rolle: 'BEOBACHTER',
        permissions: {
          canCreate: false,
          canQuittieren: false,
          canKorrigieren: false,
          canManageStatus: false,
          canExport: false,
          canViewAll: true,
          isBeobachter: true,
          canEditEtb: false,
          canEditPinnwand: false,
          isSecondaryRole: true,
        },
      });
    });
  });

  describe('Keine Rollenzuweisung', () => {
    it('gibt volle Permissions wenn Rollensystem nicht konfiguriert (0 Zuweisungen)', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: null }));
      mockRepository.hasAnyRollen.mockResolvedValue(Result.ok(false));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        rolle: null,
        permissions: {
          canCreate: true,
          canQuittieren: true,
          canKorrigieren: true,
          canManageStatus: true,
          canExport: true,
          canViewAll: true,
          isBeobachter: false,
          canEditEtb: true,
          canEditPinnwand: true,
          isSecondaryRole: false,
        },
      });
    });

    it('gibt keine Permissions wenn Rollensystem aktiv aber User ohne Rolle', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: null }));
      mockRepository.hasAnyRollen.mockResolvedValue(Result.ok(true));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        rolle: null,
        permissions: {
          canCreate: false,
          canQuittieren: false,
          canKorrigieren: false,
          canManageStatus: false,
          canExport: false,
          canViewAll: false,
          isBeobachter: false,
          canEditEtb: false,
          canEditPinnwand: false,
          isSecondaryRole: false,
        },
      });
    });
  });

  describe('Repository-Aufrufe', () => {
    it('fragt Repository mit korrekten Parametern ab', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: 'ERSTELLER' }));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      await handler.execute(query);

      expect(mockRepository.findMeineRolle).toHaveBeenCalledWith(einsatzId, userId);
    });

    it('ueberspringt Repository-Lookup fuer Admin', async () => {
      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'ADMIN');
      await handler.execute(query);

      expect(mockRepository.findMeineRolle).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('gibt Result.fail bei Repository-Fehler zurueck', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.fail('DB connection lost'));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB connection lost');
    });

    it('gibt Result.fail bei Exception zurueck', async () => {
      mockRepository.findMeineRolle.mockRejectedValue(new Error('Unexpected'));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Rollen-Abfrage fehlgeschlagen');
      expect(result.error).toContain('Unexpected');
    });

    it('gibt Result.fail bei nicht-Error-Ausnahme zurueck', async () => {
      mockRepository.findMeineRolle.mockRejectedValue('string error');

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Unbekannter Fehler');
    });
  });

  describe('Unbekannte Rolle', () => {
    it('gibt NO_PERMISSIONS fuer unbekannte Rolle zurueck', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: 'UNBEKANNTE_ROLLE' }));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId, 'USER');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.rolle).toBe('UNBEKANNTE_ROLLE');
      expect(result.value?.permissions).toEqual({
        canCreate: false,
        canQuittieren: false,
        canKorrigieren: false,
        canManageStatus: false,
        canExport: false,
        canViewAll: false,
        isBeobachter: false,
        canEditEtb: false,
        canEditPinnwand: false,
        isSecondaryRole: false,
      });
    });
  });

  describe('Ohne userRole (Backward Compatibility)', () => {
    it('fragt Repository ab wenn userRole undefined', async () => {
      mockRepository.findMeineRolle.mockResolvedValue(Result.ok({ rolle: 'BEFEHLSGEBER' }));

      const query = new GetMeineEinsatzRolleQuery(einsatzId, userId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.rolle).toBe('BEFEHLSGEBER');
      expect(mockRepository.findMeineRolle).toHaveBeenCalledWith(einsatzId, userId);
    });
  });
});

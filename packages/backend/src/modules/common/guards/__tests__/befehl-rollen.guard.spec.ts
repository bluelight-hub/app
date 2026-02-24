import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BefehlRollenGuard } from '../befehl-rollen.guard';

describe('BefehlRollenGuard', () => {
  let guard: BefehlRollenGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockPrisma: any;

  const createMockExecutionContext = (user: any, body: any = {}, params: any = {}, query: any = {}) => ({
    getHandler: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user, body, params, query }),
    }),
  });

  beforeEach(() => {
    mockReflector = {
      get: jest.fn(),
    } as any;

    mockPrisma = {
      einsatzRollenzuweisung: {
        findUnique: jest.fn(),
      },
      befehl: {
        findUnique: jest.fn(),
      },
    };

    guard = new BefehlRollenGuard(mockReflector, mockPrisma);
  });

  describe('No decorator applied (Fail-Closed)', () => {
    it('should throw ForbiddenException when no @RequiresBefehlRolle decorator', async () => {
      mockReflector.get.mockReturnValue(undefined);
      const context = createMockExecutionContext({ userId: 'user-1' });

      await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context as any)).rejects.toThrow('Endpoint nicht autorisiert');
    });

    it('should throw ForbiddenException when empty rollen array', async () => {
      mockReflector.get.mockReturnValue([]);
      const context = createMockExecutionContext({ userId: 'user-1' });

      await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context as any)).rejects.toThrow('@RequiresBefehlRolle() Decorator fehlt');
    });
  });

  describe('ERSTELLER can create Befehl', () => {
    it('should allow ERSTELLER to create Befehl', async () => {
      mockReflector.get.mockReturnValue(['ERSTELLER', 'BEFEHLSGEBER']);
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({
        rolle: 'ERSTELLER',
      });

      const context = createMockExecutionContext({ userId: 'user-1' }, { einsatzId: 'einsatz-1' });

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
    });
  });

  describe('BEFEHLSGEBER can create Befehl', () => {
    it('should allow BEFEHLSGEBER to create Befehl', async () => {
      mockReflector.get.mockReturnValue(['ERSTELLER', 'BEFEHLSGEBER']);
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({
        rolle: 'BEFEHLSGEBER',
      });

      const context = createMockExecutionContext({ userId: 'user-1' }, { einsatzId: 'einsatz-1' });

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
    });
  });

  describe('EMPFAENGER cannot create Befehl', () => {
    it('should deny EMPFAENGER from creating Befehl', async () => {
      mockReflector.get.mockReturnValue(['ERSTELLER', 'BEFEHLSGEBER']);
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({
        rolle: 'EMPFAENGER',
      });

      const context = createMockExecutionContext({ userId: 'user-1' }, { einsatzId: 'einsatz-1' });

      await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('BEOBACHTER can view all Befehle', () => {
    it('should allow BEOBACHTER to view Befehle', async () => {
      mockReflector.get.mockReturnValue(['BEFEHLSGEBER', 'ERSTELLER', 'EMPFAENGER', 'BEOBACHTER']);
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({
        rolle: 'BEOBACHTER',
      });

      const context = createMockExecutionContext({ userId: 'user-1' }, { einsatzId: 'einsatz-1' });

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
    });
  });

  describe('BEOBACHTER cannot quittieren', () => {
    it('should deny BEOBACHTER from quittieren', async () => {
      mockReflector.get.mockReturnValue(['EMPFAENGER']);
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({
        rolle: 'BEOBACHTER',
      });

      const context = createMockExecutionContext({ userId: 'user-1' }, { einsatzId: 'einsatz-1' });

      await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Missing einsatzId', () => {
    it('should throw ForbiddenException when einsatzId missing', async () => {
      mockReflector.get.mockReturnValue(['ERSTELLER']);

      const context = createMockExecutionContext(
        { userId: 'user-1' },
        {}, // no einsatzId in body
        {}, // no einsatzId in params
      );

      await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('No rolle assigned', () => {
    it('should throw ForbiddenException when user has no rolle in einsatz', async () => {
      mockReflector.get.mockReturnValue(['ERSTELLER']);
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue(null);

      const context = createMockExecutionContext({ userId: 'user-1' }, { einsatzId: 'einsatz-1' });

      await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('einsatzId from params', () => {
    it('should read einsatzId from params when not in body', async () => {
      mockReflector.get.mockReturnValue(['ERSTELLER']);
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({
        rolle: 'ERSTELLER',
      });

      const context = createMockExecutionContext(
        { userId: 'user-1' },
        {}, // no einsatzId in body
        { einsatzId: 'einsatz-from-params' },
      );

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
      expect(mockPrisma.einsatzRollenzuweisung.findUnique).toHaveBeenCalledWith({
        where: {
          einsatzId_userId: {
            einsatzId: 'einsatz-from-params',
            userId: 'user-1',
          },
        },
      });
    });
  });

  describe('No user (should not happen after JwtAuthGuard)', () => {
    it('should throw ForbiddenException when no user', async () => {
      mockReflector.get.mockReturnValue(['ERSTELLER']);

      const context = createMockExecutionContext(undefined, { einsatzId: 'einsatz-1' });

      await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('einsatzId from query params', () => {
    it('sollte einsatzId aus Query-Parametern lesen', async () => {
      mockReflector.get.mockReturnValue(['ERSTELLER']);
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({
        rolle: 'ERSTELLER',
      });

      const context = createMockExecutionContext(
        { userId: 'user-1' },
        {}, // no einsatzId in body
        {}, // no einsatzId in params
        { einsatzId: 'test-einsatz-id' }, // einsatzId in query
      );

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
      expect(mockPrisma.einsatzRollenzuweisung.findUnique).toHaveBeenCalledWith({
        where: {
          einsatzId_userId: {
            einsatzId: 'test-einsatz-id',
            userId: 'user-1',
          },
        },
      });
    });
  });

  describe('einsatzId via Befehl-Lookup', () => {
    it('sollte einsatzId via Befehl-Lookup ermitteln wenn nur params.id vorhanden', async () => {
      mockReflector.get.mockReturnValue(['EMPFAENGER']);
      mockPrisma.befehl.findUnique.mockResolvedValue({
        einsatzId: 'test-einsatz-id',
      });
      mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({
        rolle: 'EMPFAENGER',
      });

      const context = createMockExecutionContext(
        { userId: 'user-1' },
        {}, // no einsatzId in body
        { id: 'befehl-id' }, // only befehl ID in params
      );

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
      expect(mockPrisma.befehl.findUnique).toHaveBeenCalledWith({
        where: { id: 'befehl-id' },
        select: { einsatzId: true },
      });
      expect(mockPrisma.einsatzRollenzuweisung.findUnique).toHaveBeenCalledWith({
        where: {
          einsatzId_userId: {
            einsatzId: 'test-einsatz-id',
            userId: 'user-1',
          },
        },
      });
    });

    it('sollte ForbiddenException werfen wenn Befehl nicht gefunden', async () => {
      mockReflector.get.mockReturnValue(['EMPFAENGER']);
      mockPrisma.befehl.findUnique.mockResolvedValue(null);

      const context = createMockExecutionContext(
        { userId: 'user-1' },
        {}, // no einsatzId in body
        { id: 'unknown-befehl-id' }, // only befehl ID in params
      );

      await expect(guard.canActivate(context as any)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.befehl.findUnique).toHaveBeenCalledWith({
        where: { id: 'unknown-befehl-id' },
        select: { einsatzId: true },
      });
    });
  });
});

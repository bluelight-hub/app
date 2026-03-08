// @ts-nocheck
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ConfigService } from '@nestjs/config';
import type { Socket } from 'socket.io';
import { ErinnerungGateway } from '../erinnerung.gateway';
import type { JoinEinsatzDto } from '../../dto/join-einsatz.dto';

describe('ErinnerungGateway', () => {
  let gateway: ErinnerungGateway;
  let mockLogger: jest.Mocked<ILogger>;
  let mockEinsatzTeilnehmerRepository: jest.Mocked<IEinsatzTeilnehmerRepository>;

  const TEST_EINSATZ_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TEST_USER_ID = 'user-123';
  const EXPECTED_ROOM = `einsatz:${TEST_EINSATZ_ID}:erinnerungen`;

  const createMockClient = (overrides?: Partial<{ id: string; data: Record<string, unknown> }>): Socket =>
    ({
      id: overrides?.id ?? 'test-socket-id',
      data: overrides?.data ?? { userId: TEST_USER_ID, role: 'USER' },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    }) as unknown as Socket;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockEinsatzTeilnehmerRepository = {
      existsEinsatzPerson: jest.fn(),
      findByEinsatzAndUser: jest.fn(),
      findActiveByEinsatz: jest.fn(),
      isPersonAlreadyLinked: jest.fn(),
      create: jest.fn(),
      updateEinsatzPerson: jest.fn(),
      leave: jest.fn(),
    } as unknown as jest.Mocked<IEinsatzTeilnehmerRepository>;

    gateway = new ErinnerungGateway(mockLogger, mockEinsatzTeilnehmerRepository, {} as ConfigService);
  });

  describe('handleJoinEinsatz', () => {
    it('should join room when user has access to einsatz', async () => {
      const client = createMockClient();
      const dto: JoinEinsatzDto = { einsatzId: TEST_EINSATZ_ID };

      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValue({
        id: 'teilnahme-1',
        einsatzId: TEST_EINSATZ_ID,
        userId: TEST_USER_ID,
        einsatzPersonId: 'einsatz-person-1',
        personVorname: 'Max',
        personNachname: 'Mustermann',
        personFunkrufname: null,
        personFunktion: 'Sanitaeter',
        joinedAt: new Date('2026-03-01T10:00:00.000Z'),
        leftAt: null,
      });

      await gateway.handleJoinEinsatz(dto, client);

      expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(TEST_EINSATZ_ID, TEST_USER_ID);
      expect(client.join).toHaveBeenCalledWith(EXPECTED_ROOM);
      expect(client.emit).not.toHaveBeenCalledWith('join:einsatz:error', expect.anything());
    });

    it('should deny room join when user has no access to einsatz', async () => {
      const client = createMockClient();
      const dto: JoinEinsatzDto = { einsatzId: TEST_EINSATZ_ID };

      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValue(null);

      await gateway.handleJoinEinsatz(dto, client);

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'join:einsatz:error',
        expect.objectContaining({
          code: 'ERINNERUNG_WS_JOIN_FORBIDDEN',
          einsatzId: TEST_EINSATZ_ID,
        }),
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Forbidden join:einsatz attempt'), 'ErinnerungGateway');
    });

    it('should emit join error when access check fails', async () => {
      const client = createMockClient();
      const dto: JoinEinsatzDto = { einsatzId: TEST_EINSATZ_ID };

      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockRejectedValue(new Error('database unavailable'));

      await gateway.handleJoinEinsatz(dto, client);

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'join:einsatz:error',
        expect.objectContaining({
          code: 'ERINNERUNG_WS_JOIN_ACCESS_CHECK_FAILED',
          einsatzId: TEST_EINSATZ_ID,
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Join access check failed'), 'ErinnerungGateway');
    });
  });
});

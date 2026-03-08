// @ts-nocheck
import { BefehlGateway } from '../befehl.gateway';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { Socket } from 'socket.io';
import type { BefehlErstelltPayload, BefehlZugestelltPayload, BefehlStatusGeaendertPayload, BefehlKommentarHinzugefuegtPayload, RolleGeaendertPayload } from '../befehl.gateway';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

describe('BefehlGateway', () => {
  let gateway: BefehlGateway;
  let mockLogger: jest.Mocked<ILogger>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreakerService>;
  let mockServer: { to: jest.Mock; emit: jest.Mock };
  let mockEmit: jest.Mock;
  let mockWsGauge: { inc: jest.Mock; dec: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockCircuitBreaker = {
      onStateChange: jest.fn(),
      register: jest.fn(),
      registerIfNotExists: jest.fn(),
      execute: jest.fn(),
      getState: jest.fn(),
      getAllStatus: jest.fn(),
      reset: jest.fn(),
      isOpen: jest.fn(),
    } as unknown as jest.Mocked<CircuitBreakerService>;

    mockEmit = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: mockEmit }),
      emit: jest.fn(),
    };

    mockWsGauge = { inc: jest.fn(), dec: jest.fn() };

    gateway = new BefehlGateway(mockLogger, mockCircuitBreaker, mockWsGauge as any, {} as any);
    (gateway as any).server = mockServer;
  });

  const createMockClient = (overrides?: Partial<{ id: string; data: Record<string, unknown> }>): Socket =>
    ({
      id: overrides?.id ?? 'test-socket-id',
      data: overrides?.data ?? { userId: 'test-user-id', role: 'ADMIN' },
      join: jest.fn(),
      leave: jest.fn(),
    }) as unknown as Socket;

  const TEST_EINSATZ_ID = '550e8400-e29b-41d4-a716-446655440000';
  const EXPECTED_ROOM = `einsatz:${TEST_EINSATZ_ID}:befehle`;

  describe('handleConnection', () => {
    it('sollte Connection mit userId loggen', () => {
      const client = createMockClient();

      gateway.handleConnection(client);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Client connected: test-socket-id'), 'BefehlGateway');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('userId: test-user-id'), 'BefehlGateway');
    });

    it('sollte "unknown" loggen wenn userId fehlt', () => {
      const client = createMockClient({ data: {} });

      gateway.handleConnection(client);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('userId: unknown'), 'BefehlGateway');
    });
  });

  describe('handleDisconnect', () => {
    it('sollte Disconnect mit Client-ID loggen', () => {
      const client = createMockClient({ id: 'disconnect-socket-id' });

      gateway.handleDisconnect(client);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Client disconnected: disconnect-socket-id'), 'BefehlGateway');
    });
  });

  describe('handleJoinEinsatz', () => {
    it('sollte Client dem korrekten Room joinen lassen', () => {
      const client = createMockClient();
      const dto = { einsatzId: TEST_EINSATZ_ID };

      gateway.handleJoinEinsatz(dto as any, client);

      expect(client.join).toHaveBeenCalledWith(EXPECTED_ROOM);
    });

    it('sollte Room-Join loggen', () => {
      const client = createMockClient();
      const dto = { einsatzId: TEST_EINSATZ_ID };

      gateway.handleJoinEinsatz(dto as any, client);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`joined room ${EXPECTED_ROOM}`), 'BefehlGateway');
    });

    it('sollte Room-Name im Format einsatz:{einsatzId}:befehle verwenden', () => {
      const client = createMockClient();
      const customEinsatzId = '11111111-1111-1111-1111-111111111111';
      const dto = { einsatzId: customEinsatzId };

      gateway.handleJoinEinsatz(dto as any, client);

      expect(client.join).toHaveBeenCalledWith(`einsatz:${customEinsatzId}:befehle`);
    });
  });

  describe('handleLeaveEinsatz', () => {
    it('sollte Client den Room verlassen lassen', () => {
      const client = createMockClient();
      const dto = { einsatzId: TEST_EINSATZ_ID };

      gateway.handleLeaveEinsatz(dto as any, client);

      expect(client.leave).toHaveBeenCalledWith(EXPECTED_ROOM);
    });

    it('sollte Room-Leave loggen', () => {
      const client = createMockClient();
      const dto = { einsatzId: TEST_EINSATZ_ID };

      gateway.handleLeaveEinsatz(dto as any, client);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`left room ${EXPECTED_ROOM}`), 'BefehlGateway');
    });
  });

  describe('emitBefehlErstellt', () => {
    it('sollte Event an korrekten Room emittieren', () => {
      const payload: BefehlErstelltPayload = {
        befehlId: 'befehl-1',
        einsatzId: TEST_EINSATZ_ID,
        nummer: 'B-001',
        auftrag: 'Testauftrag',
        befehlsgeberName: 'EL Müller',
        erstellerId: 'ersteller-1',
        empfaenger: ['ZF Nord', 'ZF Süd'],
        status: 'ERTEILT',
        erteiltAm: '2026-02-17T10:00:00Z',
      };

      gateway.emitBefehlErstellt(payload);

      expect(mockServer.to).toHaveBeenCalledWith(EXPECTED_ROOM);
      expect(mockEmit).toHaveBeenCalledWith('befehl.erstellt', payload);
    });

    it('sollte Emission loggen', () => {
      const payload: BefehlErstelltPayload = {
        befehlId: 'befehl-1',
        einsatzId: TEST_EINSATZ_ID,
        nummer: 'B-001',
        auftrag: 'Testauftrag',
        befehlsgeberName: 'EL Müller',
        erstellerId: 'ersteller-1',
        empfaenger: ['ZF Nord'],
        status: 'ERTEILT',
        erteiltAm: '2026-02-17T10:00:00Z',
      };

      gateway.emitBefehlErstellt(payload);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('befehl.erstellt'), 'BefehlGateway');
    });
  });

  describe('emitBefehlZugestellt', () => {
    it('sollte Event an korrekten Room emittieren', () => {
      const payload: BefehlZugestelltPayload = {
        befehlId: 'befehl-1',
        einsatzId: TEST_EINSATZ_ID,
        empfaengerId: 'emp-1',
        zugestelltAm: '2026-02-17T10:05:00Z',
      };

      gateway.emitBefehlZugestellt(payload);

      expect(mockServer.to).toHaveBeenCalledWith(EXPECTED_ROOM);
      expect(mockEmit).toHaveBeenCalledWith('befehl.zugestellt', payload);
    });

    it('sollte Emission mit befehlId und empfaengerId loggen', () => {
      const payload: BefehlZugestelltPayload = {
        befehlId: 'befehl-1',
        einsatzId: TEST_EINSATZ_ID,
        empfaengerId: 'emp-1',
        zugestelltAm: '2026-02-17T10:05:00Z',
      };

      gateway.emitBefehlZugestellt(payload);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('befehl.zugestellt'), 'BefehlGateway');
    });
  });

  describe('emitBefehlStatusGeaendert', () => {
    it('sollte Event an korrekten Room emittieren', () => {
      const payload: BefehlStatusGeaendertPayload = {
        befehlId: 'befehl-1',
        einsatzId: TEST_EINSATZ_ID,
        oldStatus: 'ERTEILT',
        newStatus: 'QUITTIERT',
        timestamp: '2026-02-17T10:10:00Z',
      };

      gateway.emitBefehlStatusGeaendert(payload);

      expect(mockServer.to).toHaveBeenCalledWith(EXPECTED_ROOM);
      expect(mockEmit).toHaveBeenCalledWith('befehl.statusGeaendert', payload);
    });

    it('sollte Statuswechsel loggen', () => {
      const payload: BefehlStatusGeaendertPayload = {
        befehlId: 'befehl-1',
        einsatzId: TEST_EINSATZ_ID,
        oldStatus: 'ERTEILT',
        newStatus: 'QUITTIERT',
        timestamp: '2026-02-17T10:10:00Z',
      };

      gateway.emitBefehlStatusGeaendert(payload);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('ERTEILT -> QUITTIERT'), 'BefehlGateway');
    });
  });

  describe('emitBefehlKommentarHinzugefuegt', () => {
    it('sollte Event an korrekten Room emittieren', () => {
      const payload: BefehlKommentarHinzugefuegtPayload = {
        befehlId: 'befehl-1',
        einsatzId: TEST_EINSATZ_ID,
        kommentarId: 'kommentar-1',
        authorId: 'author-1',
        text: 'Testkommentar',
        isRueckfrage: false,
        timestamp: '2026-02-17T10:15:00Z',
      };

      gateway.emitBefehlKommentarHinzugefuegt(payload);

      expect(mockServer.to).toHaveBeenCalledWith(EXPECTED_ROOM);
      expect(mockEmit).toHaveBeenCalledWith('befehl.kommentarHinzugefuegt', payload);
    });

    it('sollte Emission mit kommentarId loggen', () => {
      const payload: BefehlKommentarHinzugefuegtPayload = {
        befehlId: 'befehl-1',
        einsatzId: TEST_EINSATZ_ID,
        kommentarId: 'kommentar-1',
        authorId: 'author-1',
        text: 'Rueckfrage',
        isRueckfrage: true,
        parentId: 'parent-kommentar-1',
        timestamp: '2026-02-17T10:15:00Z',
      };

      gateway.emitBefehlKommentarHinzugefuegt(payload);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('kommentarId=kommentar-1'), 'BefehlGateway');
    });
  });

  describe('emitRolleGeaendert', () => {
    it('sollte Event an korrekten Room emittieren', () => {
      // Given - Rolle geaendert Payload
      const payload: RolleGeaendertPayload = {
        einsatzId: TEST_EINSATZ_ID,
        timestamp: '2026-02-23T12:00:00Z',
      };

      // When - Event emittieren
      gateway.emitRolleGeaendert(payload);

      // Then - Event an Room gesendet
      expect(mockServer.to).toHaveBeenCalledWith(EXPECTED_ROOM);
      expect(mockEmit).toHaveBeenCalledWith('rolle.geaendert', payload);
    });

    it('sollte Emission loggen', () => {
      // Given - Payload
      const payload: RolleGeaendertPayload = {
        einsatzId: TEST_EINSATZ_ID,
        timestamp: '2026-02-23T12:00:00Z',
      };

      // When - Event emittieren
      gateway.emitRolleGeaendert(payload);

      // Then - Emission geloggt
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('rolle.geaendert'), 'BefehlGateway');
    });
  });

  describe('afterInit', () => {
    it('sollte Circuit Breaker State Change Listener registrieren', () => {
      gateway.afterInit();

      expect(mockCircuitBreaker.onStateChange).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Circuit Breaker WebSocket listener registriert'), 'BefehlGateway');
    });
  });

  describe('emitIntegrationStatusChanged', () => {
    it('sollte Event global an alle Clients emittieren', () => {
      const payload = {
        serviceName: 'hiorg-server',
        state: 'OPEN' as const,
        timestamp: '2026-02-23T10:00:00Z',
      };

      gateway.emitIntegrationStatusChanged(payload);

      expect(mockServer.emit).toHaveBeenCalledWith('integration.status_changed', payload);
    });

    it('sollte Emission loggen', () => {
      const payload = {
        serviceName: 'etb',
        state: 'CLOSED' as const,
        timestamp: '2026-02-23T10:00:00Z',
      };

      gateway.emitIntegrationStatusChanged(payload);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('integration.status_changed'), 'BefehlGateway');
    });
  });
});

import { BefehlGateway } from '../befehl.gateway';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { Socket } from 'socket.io';
import type { BefehlErstelltPayload, BefehlZugestelltPayload, BefehlStatusGeaendertPayload, BefehlKommentarHinzugefuegtPayload } from '../befehl.gateway';

describe('BefehlGateway', () => {
  let gateway: BefehlGateway;
  let mockLogger: jest.Mocked<ILogger>;
  let mockServer: { to: jest.Mock };
  let mockEmit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockEmit = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: mockEmit }),
    };

    gateway = new BefehlGateway(mockLogger, {} as any);
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
        befehlsgeberId: 'geber-1',
        erstellerId: 'ersteller-1',
        empfaengerIds: ['emp-1', 'emp-2'],
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
        befehlsgeberId: 'geber-1',
        erstellerId: 'ersteller-1',
        empfaengerIds: ['emp-1'],
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
});

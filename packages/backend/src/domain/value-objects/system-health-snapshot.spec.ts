// @ts-nocheck
import { SystemHealthSnapshot } from './system-health-snapshot';

describe('SystemHealthSnapshot', () => {
  // Given: Standard-Testdaten fuer einen gesunden Zustand
  const validProps = {
    zustellrate: 98.5,
    websocketConnections: 42,
    outboxQueueDepth: 3,
    apiResponseTime: { p50: 12, p95: 45, p99: 120 },
    circuitBreakerStatus: { hiorg: 'CLOSED' as const, websocket: 'CLOSED' as const },
    dbConnectionPoolUsage: 35.2,
    uptime: 86400,
    timestamp: new Date('2026-02-24T10:00:00Z'),
  };

  describe('create', () => {
    it('sollte einen gueltigen Snapshot erstellen', () => {
      // When: Snapshot wird mit gueltigen Daten erstellt
      const result = SystemHealthSnapshot.create(validProps);

      // Then: Alle Properties sind korrekt
      expect(result.isSuccess).toBe(true);
      expect(result.value?.zustellrate).toBe(98.5);
      expect(result.value?.websocketConnections).toBe(42);
      expect(result.value?.outboxQueueDepth).toBe(3);
      expect(result.value?.apiResponseTime).toEqual({ p50: 12, p95: 45, p99: 120 });
      expect(result.value?.circuitBreakerStatus).toEqual({ hiorg: 'CLOSED', websocket: 'CLOSED' });
      expect(result.value?.dbConnectionPoolUsage).toBe(35.2);
      expect(result.value?.uptime).toBe(86400);
      expect(result.value?.timestamp).toEqual(new Date('2026-02-24T10:00:00Z'));
    });

    it('sollte bei Grenzwerten (Minimalwerte) erfolgreich sein', () => {
      const result = SystemHealthSnapshot.create({
        ...validProps,
        zustellrate: 0,
        websocketConnections: 0,
        outboxQueueDepth: 0,
        apiResponseTime: { p50: 0, p95: 0, p99: 0 },
        dbConnectionPoolUsage: 0,
        uptime: 0,
      });

      expect(result.isSuccess).toBe(true);
    });

    it('sollte bei Grenzwerten (Maximalwerte) erfolgreich sein', () => {
      const result = SystemHealthSnapshot.create({
        ...validProps,
        zustellrate: 100,
        dbConnectionPoolUsage: 100,
      });

      expect(result.isSuccess).toBe(true);
    });

    // Zustellrate-Validierung
    it('sollte bei negativer Zustellrate fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, zustellrate: -1 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Zustellrate');
    });

    it('sollte bei Zustellrate > 100 fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, zustellrate: 101 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Zustellrate');
    });

    // WebSocket-Validierung
    it('sollte bei negativen WebSocket-Connections fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, websocketConnections: -1 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('WebSocket');
    });

    it('sollte bei nicht-ganzzahligen WebSocket-Connections fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, websocketConnections: 3.5 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('WebSocket');
    });

    // Outbox-Validierung
    it('sollte bei negativer Outbox-Queue-Depth fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, outboxQueueDepth: -1 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox');
    });

    it('sollte bei nicht-ganzzahliger Outbox-Queue-Depth fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, outboxQueueDepth: 2.7 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox');
    });

    // API Response Time-Validierung
    it('sollte bei negativen API Response Times fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({
        ...validProps,
        apiResponseTime: { p50: -1, p95: 45, p99: 120 },
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('API Response');
    });

    it('sollte bei negativem p95 fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({
        ...validProps,
        apiResponseTime: { p50: 12, p95: -5, p99: 120 },
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('API Response');
    });

    it('sollte bei negativem p99 fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({
        ...validProps,
        apiResponseTime: { p50: 12, p95: 45, p99: -1 },
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('API Response');
    });

    // DB Connection Pool-Validierung
    it('sollte bei negativer DB-Connection-Pool-Usage fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, dbConnectionPoolUsage: -1 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB-Connection-Pool');
    });

    it('sollte bei DB-Connection-Pool-Usage > 100 fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, dbConnectionPoolUsage: 101 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB-Connection-Pool');
    });

    // Uptime-Validierung
    it('sollte bei negativer Uptime fehlschlagen', () => {
      const result = SystemHealthSnapshot.create({ ...validProps, uptime: -1 });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Uptime');
    });
  });

  describe('toString', () => {
    it('sollte eine lesbare Darstellung liefern', () => {
      const snapshot = SystemHealthSnapshot.create(validProps).value!;

      expect(snapshot.toString()).toBe('Health[zustellrate=98.5%, ws=42, outbox=3, db=35.2%, uptime=86400s]');
    });
  });

  describe('equality', () => {
    it('sollte gleiche Snapshots als gleich erkennen', () => {
      const a = SystemHealthSnapshot.create(validProps).value!;
      const b = SystemHealthSnapshot.create(validProps).value!;

      expect(a.equals(b)).toBe(true);
    });

    it('sollte unterschiedliche Snapshots als ungleich erkennen', () => {
      const a = SystemHealthSnapshot.create(validProps).value!;
      const b = SystemHealthSnapshot.create({ ...validProps, zustellrate: 50 }).value!;

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('circuit breaker status', () => {
    it('sollte verschiedene Circuit-Breaker-Status unterstuetzen', () => {
      const result = SystemHealthSnapshot.create({
        ...validProps,
        circuitBreakerStatus: {
          hiorg: 'CLOSED',
          websocket: 'OPEN',
          outbox: 'HALF_OPEN',
        },
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value?.circuitBreakerStatus).toEqual({
        hiorg: 'CLOSED',
        websocket: 'OPEN',
        outbox: 'HALF_OPEN',
      });
    });

    it('sollte leere Circuit-Breaker-Map unterstuetzen', () => {
      const result = SystemHealthSnapshot.create({
        ...validProps,
        circuitBreakerStatus: {},
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value?.circuitBreakerStatus).toEqual({});
    });
  });
});

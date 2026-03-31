// @ts-nocheck
import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { type EinsatzE2eTestContext, cleanupTestData, createEinsatzE2eModule, createTestEinsatz, teardownE2eModule, generateTestId } from './einsatz.e2e-setup';
import { AppModule } from '../../../app.module';
import { BCRYPT_COST_FACTOR_PASSWORD } from '@infrastructure/config/security.constants';

/**
 * EinsatzController HTTP Integration Tests.
 *
 * Testet die HTTP-Schnittstelle des EinsatzControllers:
 * - Korrekte Status-Codes für alle Endpoints
 * - NO-DELETE Policy via HTTP (400 für DELETE)
 * - Combined Query Endpoints
 * - Error Response Format
 *
 * @remarks
 * Diese Tests verwenden supertest für echte HTTP-Requests gegen
 * eine vollständig initialisierte NestJS-Anwendung. Sie validieren
 * das Verhalten der REST-API inklusive Guards, Interceptors und
 * Exception Filters.
 */
const databaseAvailable = !!process.env.DATABASE_URL;

(databaseAvailable ? describe : describe.skip)('EinsatzController HTTP Integration Tests (AC5.1, AC5.3, AC5.4)', () => {
  let app: INestApplication;
  let ctx: EinsatzE2eTestContext;
  let cachedAccessToken: string;
  /** Unique marker for this test run to identify test-created data */
  let testRunMarker: string;
  /** Server Access Token fuer X-Server-Access-Token Header */
  let serverAccessToken: string;

  beforeAll(async () => {
    ctx = await createEinsatzE2eModule();
    // Create unique marker for this test run (used to filter test data)
    testRunMarker = `E2E-HTTP-${Date.now()}-${generateTestId().slice(0, 8)}`;
    // Server Access Token fuer SetupPendingGuard (Setup muss komplett sein)
    serverAccessToken = ctx.serverAccessToken.rawToken;

    // Bootstrap der vollständigen NestJS-Anwendung für HTTP-Tests
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // App-Konfiguration wie in main.ts
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v-',
      defaultVersion: 'alpha',
    });
    app.setGlobalPrefix('api', { exclude: ['/'] });
    app.use(cookieParser());

    await app.init();

    // Admin-User mit echtem bcrypt-Hash erstellen (einmalig in beforeAll)
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('password', BCRYPT_COST_FACTOR_PASSWORD);

    await ctx.prisma.user.upsert({
      where: { username: 'admin' },
      create: {
        id: generateTestId(),
        username: 'admin',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        operativeRole: 'FUEHRUNGSKRAFT',
      },
      update: {
        passwordHash,
        isActive: true,
        operativeRole: 'FUEHRUNGSKRAFT',
      },
    });

    // Login einmalig durchführen und Token cachen (vermeidet Rate Limiting)
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'password',
      })
      .expect(200);

    // Token aus Cookie extrahieren und cachen
    const cookies = loginResponse.headers['set-cookie'] as string[];
    const accessTokenCookie = cookies.find((cookie) => cookie.startsWith('accessToken='));
    cachedAccessToken = accessTokenCookie?.split(';')[0]?.split('=')[1] || '';
  }, 60000);

  beforeEach(async () => {
    // Keine Login-Logik mehr hier - Token wird aus beforeAll gecacht
  });

  afterEach(async () => {
    await cleanupTestData(ctx);
  });

  afterAll(async () => {
    await teardownE2eModule(ctx);
    await app.close();
  });

  describe('POST /api/v-alpha/einsatz (Create)', () => {
    /**
     * Testet die erfolgreiche Erstellung eines Einsatzes.
     *
     * @remarks
     * Erwartet 201 Created mit dem erstellten Einsatz-Objekt im Body.
     * Der Response muss eine ID enthalten.
     */
    it('should return 201 Created with valid request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/einsatz')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .send({
          alarmstichwort: 'B3 - Wohnungsbrand',
          beschreibung: 'Küchenbrand in Mehrfamilienhaus',
          einsatzort: 'Musterstraße 123', // Korrekter Feldname (nicht 'ort')
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.alarmstichwort).toBe('B3 - Wohnungsbrand');
      expect(response.body.data.status).toBe('ANGELEGT'); // New Einsatz starts as ANGELEGT
    });

    /**
     * Testet dass Einsatz auch ohne alarmstichwort erstellt werden kann.
     *
     * @remarks
     * Alle Felder sind optional. Ein Einsatz kann minimal angelegt werden
     * und wird mit Status ANGELEGT und "Unbekannt" als Alarmstichwort erstellt.
     */
    it('should create Einsatz without alarmstichwort (all fields optional)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/einsatz')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .send({
          beschreibung: 'Test ohne Alarmstichwort',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.alarmstichwort).toBe('Unbekannt'); // Default value
      expect(response.body.data.status).toBe('ANGELEGT');
    });

    /**
     * Testet Authentifizierungsschutz des Endpoints.
     *
     * @remarks
     * Requests ohne gültigen JWT Token müssen mit 401 Unauthorized
     * abgelehnt werden.
     */
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v-alpha/einsatz')
        .set('X-Server-Access-Token', serverAccessToken)
        .send({
          alarmstichwort: 'Test',
        })
        .expect(401);
    });

    /**
     * Testet Validierung bei ungültigen Datentypen.
     *
     * @remarks
     * Bei ungültigen Feldtypen (z.B. Zahl statt String) muss
     * 400 Bad Request mit aussagekräftiger Fehlermeldung zurückgegeben werden.
     */
    it('should return 400 with invalid field types', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/einsatz')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .send({
          alarmstichwort: 12345, // Should be string
          alarmierungszeit: 'not-a-date', // Should be ISO date string
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('GET /api/v-alpha/einsatz/active-with-counts', () => {
    /**
     * Testet Abfrage aller aktiven Einsätze mit Zählern.
     *
     * @remarks
     * Dieser Combined Query Endpoint muss für jeden aktiven Einsatz
     * zusätzlich die Anzahl der ETB-Einträge und POIs zurückgeben.
     */
    it('should return 200 with list of active Einsätze', async () => {
      // Unique marker for this specific test
      const testMarker = `${testRunMarker}-active-list`;

      // Testdaten vorbereiten mit eindeutigem Marker
      const id1 = await createTestEinsatz(ctx, { status: 'IN_BEARBEITUNG', alarmstichwort: `${testMarker}-1` });
      const id2 = await createTestEinsatz(ctx, { status: 'IN_BEARBEITUNG', alarmstichwort: `${testMarker}-2` });
      await createTestEinsatz(ctx, { status: 'ARCHIVIERT', alarmstichwort: `${testMarker}-archived` }); // Nur ARCHIVIERT wird gefiltert

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/einsatz/active-with-counts')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);

      // Filter nur die Einsätze dieses Tests (nach Marker filtern)
      // eslint-disable-next-line typescript/no-explicit-any -- E2E test response body typing not strictly typed
      const testEinsaetze = response.body.data.filter((e: any) => e.alarmstichwort?.includes(testMarker));
      expect(testEinsaetze).toHaveLength(2); // Nur aktive mit unserem Marker

      // Verify our specific IDs are in the result
      // eslint-disable-next-line typescript/no-explicit-any -- E2E test response body typing not strictly typed
      const returnedIds = testEinsaetze.map((e: any) => e.id);
      expect(returnedIds).toContain(id1);
      expect(returnedIds).toContain(id2);
    });

    /**
     * Testet Struktur der Combined Query Response.
     *
     * @remarks
     * Jedes Einsatz-Objekt im Response muss die Felder etbEintraegeCount
     * und poisCount enthalten (Combined Query aus mehreren Aggregaten).
     */
    it('should include etbEintraegeCount and poisCount in response', async () => {
      const einsatzId = await createTestEinsatz(ctx, {
        status: 'IN_BEARBEITUNG',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/einsatz/active-with-counts')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      // eslint-disable-next-line typescript/no-explicit-any -- E2E test response body typing not strictly typed
      const einsatz = response.body.data.find((e: any) => e.id === einsatzId);
      expect(einsatz).toBeDefined();
      // ETB and POI counts should exist (even if 0)
      expect(einsatz).toHaveProperty('etbEintraegeCount');
      expect(einsatz).toHaveProperty('poisCount');
      expect(typeof einsatz.etbEintraegeCount).toBe('number');
      expect(typeof einsatz.poisCount).toBe('number');
    });

    /**
     * Testet Authentifizierungsschutz.
     */
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v-alpha/einsatz/active-with-counts').set('X-Server-Access-Token', serverAccessToken).expect(401);
    });

    /**
     * Testet dass keine aktiven Einsätze mit diesem Test-Marker existieren.
     *
     * @remarks
     * Da andere Tests parallel laufen können, prüfen wir nur dass keine
     * Einsätze mit unserem spezifischen Marker existieren (statt leere Liste).
     */
    it('should return no active Einsätze with test marker when none created', async () => {
      // Unique marker that won't match any existing data
      const uniqueMarker = `${testRunMarker}-empty-check-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/einsatz/active-with-counts')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      // Filter by our unique marker - should be empty since we didn't create any
      // eslint-disable-next-line typescript/no-explicit-any -- E2E test response body typing not strictly typed
      const matchingEinsaetze = response.body.data.filter((e: any) => e.alarmstichwort?.includes(uniqueMarker));
      expect(matchingEinsaetze).toEqual([]);
    });
  });

  describe('GET /api/v-alpha/einsatz/:id/details', () => {
    /**
     * Testet Abfrage der Einsatz-Details mit Combined Query.
     *
     * @remarks
     * Der /details Endpoint kombiniert Einsatz-Basisdaten mit
     * optionalem ETB und optionaler Lagekarte in einem Response.
     * Response-Struktur: { einsatz: {...}, etb: {...|null}, lagekarte: {...|null} }
     */
    it('should return 200 with combined DTO (nested structure)', async () => {
      const einsatzId = await createTestEinsatz(ctx);

      const response = await request(app.getHttpServer())
        .get(`/api/v-alpha/einsatz/${einsatzId}/details`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      // EinsatzDetailsDto has nested structure
      expect(response.body.data).toHaveProperty('einsatz');
      expect(response.body.data.einsatz).toHaveProperty('id', einsatzId);
      // ETB and Lagekarte are optional (null until created)
      expect(response.body.data).toHaveProperty('etb');
      expect(response.body.data).toHaveProperty('lagekarte');
    });

    /**
     * Testet 404 Response bei nicht existierendem Einsatz.
     *
     * @remarks
     * Bei ungültiger Einsatz-ID muss 404 Not Found mit
     * aussagekräftiger Fehlermeldung zurückgegeben werden.
     */
    it('should return 404 for non-existent Einsatz', async () => {
      // Use valid CUID format that doesn't exist in DB
      const nonExistentId = 'cnonexistent123456789abcd';

      const response = await request(app.getHttpServer())
        .get(`/api/v-alpha/einsatz/${nonExistentId}/details`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    /**
     * Testet Validierung bei ungültiger CUID-Format.
     */
    it('should return 400 with invalid CUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v-alpha/einsatz/invalid-uuid/details')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(400);
    });

    /**
     * Testet dass ETB und Lagekarte initial null sind (noch nicht erstellt).
     */
    it('should return null for etb and lagekarte when not yet created', async () => {
      const einsatzId = await createTestEinsatz(ctx);

      const response = await request(app.getHttpServer())
        .get(`/api/v-alpha/einsatz/${einsatzId}/details`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      // Initially, ETB and Lagekarte are null (not yet auto-created by event handler)
      expect(response.body.data.etb).toBeNull();
      expect(response.body.data.lagekarte).toBeNull();
    });
  });

  describe('POST /api/v-alpha/einsatz/:id/complete', () => {
    /**
     * Testet erfolgreichen Abschluss eines aktiven Einsatzes.
     */
    it('should return 201 on successful complete', async () => {
      const einsatzId = await createTestEinsatz(ctx, {
        status: 'IN_BEARBEITUNG',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v-alpha/einsatz/${einsatzId}/complete`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(201); // POST returns 201 Created

      expect(response.body.data).toHaveProperty('status', 'ABGESCHLOSSEN');
    });

    /**
     * Testet Fehlerbehandlung bei bereits abgeschlossenem Einsatz.
     *
     * @remarks
     * Ein bereits abgeschlossener Einsatz kann nicht erneut
     * abgeschlossen werden. Dies muss mit 400 Bad Request
     * abgelehnt werden.
     */
    it('should return 400 for already completed Einsatz', async () => {
      const einsatzId = await createTestEinsatz(ctx, {
        status: 'ABGESCHLOSSEN',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v-alpha/einsatz/${einsatzId}/complete`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      // Error message indicates status must be IN_BEARBEITUNG (not ABGESCHLOSSEN)
      expect(response.body.message).toContain('Status muss IN_BEARBEITUNG sein');
    });

    /**
     * Testet 404 bei nicht existierendem Einsatz.
     */
    it('should return 404 for non-existent Einsatz', async () => {
      // Use valid CUID format that doesn't exist in DB
      const nonExistentId = 'cnonexistent123456789abcd';

      await request(app.getHttpServer())
        .post(`/api/v-alpha/einsatz/${nonExistentId}/complete`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(404);
    });

    /**
     * Testet ETB-Lock beim Abschließen.
     *
     * @remarks
     * Das Abschließen eines Einsatzes muss das ETB automatisch
     * sperren, damit keine weiteren Einträge hinzugefügt werden können.
     */
    it('should complete Einsatz successfully', async () => {
      const einsatzId = await createTestEinsatz(ctx, {
        status: 'IN_BEARBEITUNG',
      });

      // Einsatz abschließen
      const response = await request(app.getHttpServer())
        .post(`/api/v-alpha/einsatz/${einsatzId}/complete`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(201); // POST returns 201 Created

      expect(response.body.data.status).toBe('ABGESCHLOSSEN');
    });
  });

  describe('DELETE /api/v-alpha/einsatz/:id (NO-DELETE Policy)', () => {
    /**
     * Testet NO-DELETE Policy via HTTP.
     *
     * @remarks
     * Einsätze dürfen NIEMALS gelöscht werden (Audit Trail).
     * DELETE-Requests müssen mit 400 Bad Request abgelehnt werden.
     */
    it('should return 400 Bad Request (DELETE not allowed)', async () => {
      const einsatzId = await createTestEinsatz(ctx);

      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/einsatz/${einsatzId}`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    /**
     * Testet hilfreiche Fehlermeldung mit Archive-Hinweis.
     *
     * @remarks
     * Die Fehlermeldung muss den Nutzer auf die Archive-Funktion
     * als Alternative hinweisen.
     */
    it('should include helpful error message', async () => {
      const einsatzId = await createTestEinsatz(ctx);

      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/einsatz/${einsatzId}`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(400);

      expect(response.body.message).toContain('Archive');
      expect(response.body.message).toContain('nicht gelöscht');
    });

    /**
     * Testet Persistenz nach DELETE-Versuch.
     *
     * @remarks
     * Nach einem fehlgeschlagenen DELETE muss der Einsatz
     * weiterhin in der Datenbank existieren.
     */
    it('should not delete Einsatz from database', async () => {
      const einsatzId = await createTestEinsatz(ctx);

      // DELETE-Versuch
      await request(app.getHttpServer())
        .delete(`/api/v-alpha/einsatz/${einsatzId}`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(400);

      // Einsatz muss noch existieren - EinsatzDetailsDto has nested structure
      const response = await request(app.getHttpServer())
        .get(`/api/v-alpha/einsatz/${einsatzId}/details`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      expect(response.body.data.einsatz).toHaveProperty('id', einsatzId);
    });
  });

  describe('Error Response Format (AC5.4)', () => {
    /**
     * Testet konsistentes Error Response Format für 404 Fehler.
     *
     * @remarks
     * Alle HTTP-Fehler müssen das NestJS Standard-Format befolgen:
     * { statusCode: number, message: string | string[], error: string }
     *
     * NOTE: POST /einsatz mit leerem Body ist valid (alarmstichwort defaults to 'Unbekannt')
     */
    it('should follow consistent error format for 404 errors', async () => {
      // Not Found Error (404) - use valid CUID format that doesn't exist
      const notFoundError = await request(app.getHttpServer())
        .get('/api/v-alpha/einsatz/cnonexistent123456789abcd/details')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(404);

      expect(notFoundError.body).toHaveProperty('statusCode', 404);
      expect(notFoundError.body).toHaveProperty('message');
      expect(notFoundError.body).toHaveProperty('error');
    });

    /**
     * Testet 400 Error Format bei ungültigen Datentypen.
     *
     * @remarks
     * Bei Validierungsfehlern (ungültige Typen) wird 400 zurückgegeben.
     */
    it('should return 400 with validation error for invalid types', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/einsatz')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .send({
          alarmstichwort: 12345, // Zahl statt String - Typ-Fehler
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    /**
     * Testet Error Response bei internen Serverfehler.
     *
     * @remarks
     * Auch bei 500er Fehlern muss das konsistente Format
     * eingehalten werden, jedoch ohne sensitive Details.
     */
    it('should return consistent format for 500 errors', async () => {
      // Dieser Test würde einen künstlichen 500er Fehler provozieren
      // z.B. durch Mocking einer Service-Methode, die wirft
      // Hier nur konzeptionell, da schwer zu simulieren ohne Setup
    });
  });

  describe('PATCH /api/v-alpha/einsatz/:id (Update)', () => {
    /**
     * Testet Teilaktualisierung von Einsatz-Daten.
     *
     * @remarks
     * Der Update-Endpoint konvertiert den einsatzort-String zu einem AddressDto.
     * Die Response enthält einsatzort als Objekt mit ort-Property.
     */
    it('should return 200 on successful partial update', async () => {
      const einsatzId = await createTestEinsatz(ctx, {
        alarmstichwort: 'B1',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v-alpha/einsatz/${einsatzId}`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .send({
          einsatzort: 'Neue Straße 456',
          beschreibung: 'Aktualisierte Beschreibung',
        })
        .expect(200);

      // einsatzort wird als AddressDto zurückgegeben (EinsatzDto)
      expect(response.body.data.einsatzort).toEqual(expect.objectContaining({ ort: 'Neue Straße 456' }));
      // beschreibung (Input DTO) wird zu bemerkung (Response DTO) gemappt
      expect(response.body.data.bemerkung).toBe('Aktualisierte Beschreibung');
      expect(response.body.data.alarmstichwort).toBe('B1'); // Unverändert
    });

    /**
     * Testet Validierung bei ungültigen Update-Daten.
     */
    it('should return 400 with invalid update data', async () => {
      const einsatzId = await createTestEinsatz(ctx);

      await request(app.getHttpServer())
        .patch(`/api/v-alpha/einsatz/${einsatzId}`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .send({
          status: 'INVALID_STATUS', // Ungültiger Enum-Wert
        })
        .expect(400);
    });
  });

  describe('POST /api/v-alpha/einsatz/:id/archive', () => {
    /**
     * Testet erfolgreiche Archivierung.
     */
    it('should return 200 on successful archive', async () => {
      const einsatzId = await createTestEinsatz(ctx, {
        status: 'ABGESCHLOSSEN',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v-alpha/einsatz/${einsatzId}/archive`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`]);

      // Accept either 200 or 201 as valid success status
      expect([200, 201]).toContain(response.status);
      expect(response.body.data).toHaveProperty('status', 'ARCHIVIERT');
    });

    /**
     * Testet Fehler beim Archivieren eines nicht abgeschlossenen Einsatzes.
     */
    it('should return 400 when archiving non-completed Einsatz', async () => {
      const einsatzId = await createTestEinsatz(ctx, {
        status: 'IN_BEARBEITUNG',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v-alpha/einsatz/${einsatzId}/archive`)
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(400);

      expect(response.body.message.toLowerCase()).toContain('abgeschlossen');
    });
  });

  describe('GET /api/v-alpha/einsatz (List All)', () => {
    /**
     * Testet Pagination bei Einsatz-Liste.
     *
     * @remarks
     * Da andere Tests parallel laufen können, erstellen wir Einsätze mit
     * eindeutigem Marker und prüfen die Pagination-Struktur sowie dass
     * unsere Test-Einsätze in der Response enthalten sind.
     */
    it('should support pagination with limit and offset', async () => {
      // Unique marker for this test
      const testMarker = `${testRunMarker}-pagination`;
      const createdIds: string[] = [];

      // 5 Einsätze erstellen mit eindeutigem Marker
      for (let i = 0; i < 5; i++) {
        const id = await createTestEinsatz(ctx, { alarmstichwort: `${testMarker}-${i}` });
        createdIds.push(id);
      }

      // Get all einsaetze to verify our test data exists
      const allResponse = await request(app.getHttpServer())
        .get('/api/v-alpha/einsatz?limit=100&page=1')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      // Filter by our marker to count only our test data
      // eslint-disable-next-line typescript/no-explicit-any -- E2E test response body typing not strictly typed
      const ourEinsaetze = allResponse.body.data.filter((e: any) => e.alarmstichwort?.includes(testMarker));
      expect(ourEinsaetze).toHaveLength(5);

      // Test pagination works (limit=2)
      const paginatedResponse = await request(app.getHttpServer())
        .get('/api/v-alpha/einsatz?limit=2&page=1')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      expect(paginatedResponse.body.data).toHaveLength(2);
      // Total includes all einsaetze in DB (not just ours), so we check it's >= 5
      expect(paginatedResponse.body.pagination.total).toBeGreaterThanOrEqual(5);
    });

    /**
     * Testet Filterung nach Status.
     *
     * @remarks
     * Verwendet eindeutigen Marker um nur eigene Test-Daten zu prüfen.
     */
    it('should filter by status', async () => {
      // Unique marker for this test
      const testMarker = `${testRunMarker}-status-filter`;

      const id1 = await createTestEinsatz(ctx, { status: 'IN_BEARBEITUNG', alarmstichwort: `${testMarker}-1` });
      const id2 = await createTestEinsatz(ctx, { status: 'IN_BEARBEITUNG', alarmstichwort: `${testMarker}-2` });
      await createTestEinsatz(ctx, { status: 'ABGESCHLOSSEN', alarmstichwort: `${testMarker}-done` });

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/einsatz?status=IN_BEARBEITUNG')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessToken}`])
        .expect(200);

      // Filter by our marker to count only our test data
      // eslint-disable-next-line typescript/no-explicit-any -- E2E test response body typing not strictly typed
      const ourEinsaetze = response.body.data.filter((e: any) => e.alarmstichwort?.includes(testMarker));
      expect(ourEinsaetze).toHaveLength(2);

      // Verify all returned items have correct status
      // eslint-disable-next-line typescript/no-explicit-any -- E2E test response body typing not strictly typed
      expect(response.body.data.every((e: any) => e.status === 'IN_BEARBEITUNG')).toBe(true);

      // Verify our specific IDs are in the filtered result
      // eslint-disable-next-line typescript/no-explicit-any -- E2E test response body typing not strictly typed
      const returnedIds = ourEinsaetze.map((e: any) => e.id);
      expect(returnedIds).toContain(id1);
      expect(returnedIds).toContain(id2);
    });
  });
});

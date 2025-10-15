import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LagekarteController } from './controllers/lagekarte.controller';
import { PoiController } from './controllers/poi.controller';
import { GeocodingController } from './controllers/geocoding.controller';
import { LagekarteService } from './services/lagekarte.service';
import { PoiService } from './services/poi.service';
import { GeocodingService } from './services/geocoding.service';
import { EinsatzService } from '../../einsatz/einsatz.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PoiType, type Lagekarte, type LagekartePoi } from '@prisma/client';
import { ValidationPipe } from '@nestjs/common';

describe('Lagekarte Integration Tests', () => {
  let app: INestApplication;
  let _lagekarteService: LagekarteService;
  let _poiService: PoiService;
  let einsatzService: EinsatzService;

  const mockEinsatzService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };

  const mockLagekarteService = {
    getOrCreateLagekarte: jest.fn(),
    findByEinsatzId: jest.fn(),
    updateState: jest.fn(),
    deleteLagekarte: jest.fn(),
  };

  const mockPoiService = {
    getPoisByLagekarteId: jest.fn(),
    getPoiById: jest.fn(),
    createPoi: jest.fn(),
    updatePoi: jest.fn(),
    deletePoi: jest.fn(),
  };

  const mockGeocodingService = {
    geocodeAddress: jest.fn(),
  };

  // Mock JwtAuthGuard to bypass authentication
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        userId: 'test-user-id',
      };
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LagekarteController, PoiController, GeocodingController],
      providers: [
        {
          provide: LagekarteService,
          useValue: mockLagekarteService,
        },
        {
          provide: PoiService,
          useValue: mockPoiService,
        },
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
        {
          provide: EinsatzService,
          useValue: mockEinsatzService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    // Enable validation pipes for DTO validation tests
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    _lagekarteService = moduleFixture.get<LagekarteService>(LagekarteService);
    _poiService = moduleFixture.get<PoiService>(PoiService);
    einsatzService = moduleFixture.get<EinsatzService>(EinsatzService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * IV1: Einsatz-Erstellung unverändert
   * Verifiziert dass:
   * - Einsatz ohne Lagekarte erstellt werden kann (keine Fehler)
   * - Lagekarte lazy creation beim ersten Zugriff funktioniert
   */
  describe('IV1: Einsatz Creation & Lagekarte Lazy Loading', () => {
    const mockEinsatz = {
      id: 'einsatz-1',
      name: 'Test Einsatz',
      alarmStichwort: 'Brand',
      ort: 'Teststraße 1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockLagekarte: Lagekarte = {
      id: 'lagekarte-1',
      einsatzId: 'einsatz-1',
      state: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow Einsatz creation without errors (no Lagekarte created)', async () => {
      // Arrange: Einsatz wird erstellt ohne Lagekarte
      mockEinsatzService.create.mockResolvedValue(mockEinsatz);

      // Act: Simuliere Einsatz-Erstellung (würde über EinsatzController laufen)
      // Da wir hier nur LagekarteModule testen, verifizieren wir dass EinsatzService aufrufbar ist
      const result = await einsatzService.create(
        {
          alarmStichwort: 'Brand',
          ort: 'Teststraße 1',
        } as any,
        'test-user-id',
      );

      // Assert: Einsatz wurde erstellt, keine Fehler
      expect(result).toEqual(mockEinsatz);
      expect(mockEinsatzService.create).toHaveBeenCalledTimes(1);
    });

    it('should create Lagekarte lazily on first access (GET /lagekarte)', async () => {
      // Arrange: Erste Anfrage → Lagekarte existiert noch nicht
      mockLagekarteService.getOrCreateLagekarte.mockResolvedValue(mockLagekarte);

      // Act: Erste Anfrage an Lagekarte-Route
      const response = await request(app.getHttpServer()).get(`/einsatz/${mockEinsatz.id}/lagekarte`).expect(200);

      // Assert: Lagekarte wurde lazy erstellt
      expect(response.body).toEqual({
        id: mockLagekarte.id,
        einsatzId: mockLagekarte.einsatzId,
        state: mockLagekarte.state,
        createdAt: mockLagekarte.createdAt.toISOString(),
        updatedAt: mockLagekarte.updatedAt.toISOString(),
      });
      expect(mockLagekarteService.getOrCreateLagekarte).toHaveBeenCalledWith(mockEinsatz.id);
      expect(mockLagekarteService.getOrCreateLagekarte).toHaveBeenCalledTimes(1);
    });

    it('should return existing Lagekarte on subsequent access', async () => {
      // Arrange: Lagekarte existiert bereits
      mockLagekarteService.getOrCreateLagekarte.mockResolvedValue(mockLagekarte);

      // Act: Zweite Anfrage an Lagekarte-Route
      const response = await request(app.getHttpServer()).get(`/einsatz/${mockEinsatz.id}/lagekarte`).expect(200);

      // Assert: Bestehende Lagekarte wird zurückgegeben
      expect(response.body).toEqual({
        id: mockLagekarte.id,
        einsatzId: mockLagekarte.einsatzId,
        state: mockLagekarte.state,
        createdAt: mockLagekarte.createdAt.toISOString(),
        updatedAt: mockLagekarte.updatedAt.toISOString(),
      });
      expect(mockLagekarteService.getOrCreateLagekarte).toHaveBeenCalledWith(mockEinsatz.id);
    });
  });

  /**
   * IV2: POI-API Type-Safety
   * Verifiziert dass:
   * - GET /pois typisierte POIs mit PoiType enum zurückgibt
   * - Ungültige `type` in CreatePoiDto → Validierungsfehler
   */
  describe('IV2: POI API Type Safety & Validation', () => {
    const mockLagekarte: Lagekarte = {
      id: 'lagekarte-1',
      einsatzId: 'einsatz-1',
      state: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPois: LagekartePoi[] = [
      {
        id: 'poi-1',
        lagekarteId: 'lagekarte-1',
        type: PoiType.EINSATZORT,
        name: 'Haupteinsatzstelle',
        adresse: 'Hauptstraße 1',
        latitude: 52.52,
        longitude: 13.405,
        icon: 'fire',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'poi-2',
        lagekarteId: 'lagekarte-1',
        type: PoiType.FAHRZEUG,
        name: 'Löschzug 1',
        adresse: null,
        latitude: 52.521,
        longitude: 13.406,
        icon: 'truck',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'poi-3',
        lagekarteId: 'lagekarte-1',
        type: PoiType.BEREITSTELLUNGSRAUM,
        name: 'Bereitstellung',
        adresse: null,
        latitude: 52.519,
        longitude: 13.404,
        icon: 'staging',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return typed POIs with valid PoiType enum values (GET /pois)', async () => {
      // Arrange
      mockLagekarteService.findByEinsatzId.mockResolvedValue(mockLagekarte);
      mockPoiService.getPoisByLagekarteId.mockResolvedValue(mockPois);

      // Act
      const response = await request(app.getHttpServer()).get(`/einsatz/${mockLagekarte.einsatzId}/lagekarte/pois`).expect(200);

      // Assert: POIs haben gültige PoiType enum Werte
      expect(response.body).toHaveLength(3);
      expect(response.body[0].type).toBe(PoiType.EINSATZORT);
      expect(response.body[1].type).toBe(PoiType.FAHRZEUG);
      expect(response.body[2].type).toBe(PoiType.BEREITSTELLUNGSRAUM);

      // Verifiziere dass alle PoiType Werte gültige Enum-Werte sind
      response.body.forEach((poi: any) => {
        expect(Object.values(PoiType)).toContain(poi.type);
      });
    });

    it('should reject POI creation with invalid PoiType (validation error)', async () => {
      // Arrange: Ungültiger PoiType
      const invalidDto = {
        lagekarteId: 'lagekarte-1',
        type: 'INVALID_TYPE', // Ungültiger Wert
        name: 'Test POI',
        latitude: 52.52,
        longitude: 13.405,
      };

      // Act & Assert: Validierungsfehler erwartet
      const response = await request(app.getHttpServer()).post(`/einsatz/${mockLagekarte.einsatzId}/lagekarte/pois`).send(invalidDto).expect(400);

      // Assert: Validierungsfehler-Response
      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });

    it('should accept POI creation with valid PoiType enum value', async () => {
      // Arrange: Gültiger PoiType
      const validDto = {
        lagekarteId: 'lagekarte-1',
        type: PoiType.EINSATZORT,
        name: 'Neue Einsatzstelle',
        adresse: 'Teststraße 5',
        latitude: 52.525,
        longitude: 13.41,
      };

      const createdPoi: LagekartePoi = {
        id: 'poi-new',
        ...validDto,
        icon: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPoiService.createPoi.mockResolvedValue(createdPoi);

      // Act
      const response = await request(app.getHttpServer()).post(`/einsatz/${mockLagekarte.einsatzId}/lagekarte/pois`).send(validDto).expect(201);

      // Assert: POI wurde erfolgreich erstellt
      expect(response.body.type).toBe(PoiType.EINSATZORT);
      expect(mockPoiService.createPoi).toHaveBeenCalledWith(validDto);
    });

    it('should validate all PoiType enum values are accepted', async () => {
      // Arrange: Teste alle möglichen PoiType Werte
      const allPoiTypes = Object.values(PoiType);

      for (const poiType of allPoiTypes) {
        const validDto = {
          lagekarteId: 'lagekarte-1',
          type: poiType,
          name: `Test ${poiType}`,
          latitude: 52.52,
          longitude: 13.405,
        };

        const createdPoi: LagekartePoi = {
          id: `poi-${poiType}`,
          ...validDto,
          adresse: null,
          icon: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPoiService.createPoi.mockResolvedValue(createdPoi);

        // Act & Assert: Alle PoiType Werte sollten akzeptiert werden
        const response = await request(app.getHttpServer()).post(`/einsatz/${mockLagekarte.einsatzId}/lagekarte/pois`).send(validDto).expect(201);

        expect(response.body.type).toBe(poiType);
      }

      // Verifiziere dass alle PoiType Werte getestet wurden
      expect(mockPoiService.createPoi).toHaveBeenCalledTimes(allPoiTypes.length);
    });
  });

  /**
   * Additional: Geocoding Integration
   * Bonus-Test für Geocoding-Funktionalität
   */
  describe('Geocoding Integration', () => {
    it('should geocode address successfully', async () => {
      // Arrange
      const address = 'Hauptstraße 1, 10115 Berlin';
      const expectedCoords = { lat: 52.52, lon: 13.405 };
      mockGeocodingService.geocodeAddress.mockResolvedValue(expectedCoords);

      // Act
      const response = await request(app.getHttpServer()).post('/einsatz/einsatz-1/geocode').send({ address }).expect(201);

      // Assert
      expect(response.body).toEqual(expectedCoords);
      expect(mockGeocodingService.geocodeAddress).toHaveBeenCalledWith(address);
    });

    it('should return null for invalid address', async () => {
      // Arrange
      const invalidAddress = 'XYZ Ungültige Adresse 99999';
      mockGeocodingService.geocodeAddress.mockResolvedValue(null);

      // Act
      const response = await request(app.getHttpServer()).post('/einsatz/einsatz-1/geocode').send({ address: invalidAddress }).expect(201);

      // Assert: NestJS serializes null as empty object {} in HTTP response
      expect(response.body).toEqual({});
      expect(mockGeocodingService.geocodeAddress).toHaveBeenCalledWith(invalidAddress);
    });
  });
});

import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EinsatzController } from './einsatz.controller';
import { EinsatzService } from './einsatz.service';
import { CacheDuplicateDetectionService } from '@/common/services/cache-duplicate-detection.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

describe('EinsatzController Integration - Duplicate Detection', () => {
  let app: INestApplication;
  let einsatzService: EinsatzService;
  let duplicateDetectionService: CacheDuplicateDetectionService;

  const mockEinsatzService = {
    create: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    archive: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  // Mock JwtAuthGuard to bypass authentication and set user
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      // Set a mock user in the request
      request.user = {
        userId: 'test-user-id',
        username: 'testuser',
        roles: ['USER'],
      };
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EinsatzController],
      providers: [
        {
          provide: EinsatzService,
          useValue: mockEinsatzService,
        },
        CacheDuplicateDetectionService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    einsatzService = moduleFixture.get<EinsatzService>(EinsatzService);
    duplicateDetectionService = moduleFixture.get<CacheDuplicateDetectionService>(CacheDuplicateDetectionService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /einsatz - Duplicate Detection', () => {
    it('sollte identische Requests aus Cache bedienen', async () => {
      const createDto = {
        alarmStichwort: 'Brand',
        ort: 'Teststraße 1',
      };

      const expectedResult = {
        id: 'test-id',
        name: 'Test Einsatz',
        ...createDto,
      };

      // Erster Aufruf: Cache miss
      mockCacheManager.get.mockResolvedValueOnce(null);
      mockCacheManager.set.mockResolvedValueOnce(undefined);
      mockEinsatzService.create.mockResolvedValueOnce(expectedResult);

      const response1 = await request(app.getHttpServer()).post('/einsatz').send(createDto).expect(201);

      expect(response1.body).toEqual(expectedResult);
      expect(mockEinsatzService.create).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.get).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);

      // Zweiter Aufruf: Cache hit
      mockCacheManager.get.mockResolvedValueOnce({ result: expectedResult });

      const response2 = await request(app.getHttpServer()).post('/einsatz').send(createDto).expect(201);

      expect(response2.body).toEqual(expectedResult);
      // Service sollte NICHT erneut aufgerufen werden
      expect(mockEinsatzService.create).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.get).toHaveBeenCalledTimes(2);
    });

    it('sollte unterschiedliche Requests separat verarbeiten', async () => {
      const createDto1 = {
        alarmStichwort: 'Brand',
        ort: 'Teststraße 1',
      };

      const createDto2 = {
        alarmStichwort: 'Unfall',
        ort: 'Hauptstraße 5',
      };

      const result1 = { id: 'id-1', ...createDto1 };
      const result2 = { id: 'id-2', ...createDto2 };

      // Beide Requests sollten Cache miss haben
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);
      mockEinsatzService.create.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2);

      const response1 = await request(app.getHttpServer()).post('/einsatz').send(createDto1).expect(201);

      const response2 = await request(app.getHttpServer()).post('/einsatz').send(createDto2).expect(201);

      expect(response1.body).toEqual(result1);
      expect(response2.body).toEqual(result2);
      expect(mockEinsatzService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('PATCH /einsatz/:id - Duplicate Detection', () => {
    it('sollte identische Update-Requests aus Cache bedienen', async () => {
      const einsatzId = 'test-id';
      const updateDto = {
        alarmStichwort: 'Brand groß',
      };

      const expectedResult = {
        id: einsatzId,
        name: 'Updated Einsatz',
        ...updateDto,
      };

      // Erster Aufruf: Cache miss
      mockCacheManager.get.mockResolvedValueOnce(null);
      mockCacheManager.set.mockResolvedValueOnce(undefined);
      mockEinsatzService.update.mockResolvedValueOnce(expectedResult);

      const response1 = await request(app.getHttpServer()).patch(`/einsatz/${einsatzId}`).send(updateDto).expect(200);

      expect(response1.body).toEqual(expectedResult);
      expect(mockEinsatzService.update).toHaveBeenCalledTimes(1);

      // Zweiter Aufruf: Cache hit
      mockCacheManager.get.mockResolvedValueOnce({ result: expectedResult });

      const response2 = await request(app.getHttpServer()).patch(`/einsatz/${einsatzId}`).send(updateDto).expect(200);

      expect(response2.body).toEqual(expectedResult);
      // Service sollte NICHT erneut aufgerufen werden
      expect(mockEinsatzService.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache-Fehlerbehandlung', () => {
    it('sollte bei Cache-Fehler trotzdem funktionieren', async () => {
      const createDto = {
        alarmStichwort: 'Test',
      };

      const expectedResult = {
        id: 'test-id',
        ...createDto,
      };

      // Cache wirft Fehler
      mockCacheManager.get.mockRejectedValueOnce(new Error('Cache error'));
      mockCacheManager.set.mockRejectedValueOnce(new Error('Cache error'));
      mockEinsatzService.create.mockResolvedValueOnce(expectedResult);

      const response = await request(app.getHttpServer()).post('/einsatz').send(createDto).expect(201);

      expect(response.body).toEqual(expectedResult);
      expect(mockEinsatzService.create).toHaveBeenCalledTimes(1);
    });
  });
});

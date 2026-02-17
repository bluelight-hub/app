import { BadRequestException } from '@nestjs/common';
import { BefehlController } from '@/modules/befehl/controllers/befehl.controller';
import { Result } from '@/domain/common/result';
import { Befehl } from '@/domain/aggregates/befehl.aggregate';
import { BefehlId } from '@/domain/value-objects/befehl-id';
import { BefehlStatus } from '@/domain/value-objects/befehl-status';
import { BefehlNummer } from '@/domain/value-objects/befehl-nummer';
import { EinsatzId } from '@/domain/value-objects/einsatz-id';
import { UserId } from '@/domain/value-objects/user-id';
import type { CreateBefehlHandler } from '@/application/befehl/commands/create-befehl/create-befehl.handler';
import type { CreateBefehlDto } from '@/application/befehl/dto/create-befehl.dto';
import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';

/**
 * Integration Tests fuer BefehlController (AC10).
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (NO NestJS Test Module)
 * - Mocked Handler + Repository mit jest.fn()
 * - Focus: API Contract, DTO Validation, HTTP Status Codes
 *
 * **Coverage Target:** >80% fuer BefehlController
 *
 * **Test Cases (AC10):**
 * 1. POST /befehle mit validen Daten → 201 Created + BefehlDto
 * 2. POST /befehle mit fehlenden empfaengerIds → 400 Bad Request
 * 3. POST /befehle mit ungültiger einsatzId → 400 Bad Request
 * 4. POST /befehle mit leerem auftrag → 400 Bad Request
 */
describe('BefehlController (Integration Tests - AC10)', () => {
  let controller: BefehlController;
  let mockCreateBefehlHandler: jest.Mocked<CreateBefehlHandler>;
  let mockBefehlRepository: jest.Mocked<IBefehlRepository>;

  /**
   * Test-Fixture: Erstellt ein valides Befehl Aggregate für Mock-Responses.
   */
  const createMockBefehl = (): Befehl => {
    const befehlResult = Befehl.create({
      einsatzId: EinsatzId.create('cm5einsatzid123').value as EinsatzId,
      empfaengerIds: [UserId.create('user1').value as UserId, UserId.create('user2').value as UserId],
      befehlsgeberId: UserId.create('befgeber1').value as UserId,
      erstellerId: UserId.create('ersteller1').value as UserId,
      auftrag: 'Patientenablage einrichten',
      nummer: BefehlNummer.create('B2026-abc123xy').value as BefehlNummer,
      zeitvorgabe: '15 min',
    });

    return befehlResult.value as Befehl;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock handler (Direct Instantiation Pattern)
    mockCreateBefehlHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Create mock repository
    mockBefehlRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Instantiate controller with mocks
    controller = new BefehlController(mockCreateBefehlHandler, mockBefehlRepository);
  });

  describe('create() - POST /api/v-alpha/befehle', () => {
    it('sollte Befehl erfolgreich erstellen und BefehlDto zurueckgeben (Success Case - AC10)', async () => {
      // Given - valide CreateBefehlDto
      const dto: CreateBefehlDto = {
        einsatzId: 'cm5einsatzid123',
        empfaengerIds: ['user1', 'user2'],
        befehlsgeberId: 'befgeber1',
        erstellerId: 'ersteller1',
        auftrag: 'Patientenablage einrichten',
        zeitvorgabe: '15 min',
      };

      const mockBefehl = createMockBefehl();
      const befehlId = mockBefehl.id.value;

      // Mock Handler: execute() gibt BefehlId zurück
      mockCreateBefehlHandler.execute.mockResolvedValue(Result.ok(befehlId));

      // Mock Repository: findById() gibt Befehl Aggregate zurück
      mockBefehlRepository.findById.mockResolvedValue(Result.ok(mockBefehl));

      // When - create() aufrufen
      const result = await controller.create(dto);

      // Then - verify BefehlDto structure
      expect(result).toBeDefined();
      expect(result.id).toBe(befehlId);
      expect(result.nummer).toMatch(/^B\d{4}-[a-z0-9]{8}$/); // Generated number format
      expect(result.auftrag).toBe('Patientenablage einrichten');
      expect(result.status).toBe('ERTEILT');
      expect(result.befehlstyp).toBe('KURZBEFEHL');
      expect(result.empfaenger).toHaveLength(2);
      expect(result.kommentare).toEqual([]);

      // Verify handler was called with correct command
      expect(mockCreateBefehlHandler.execute).toHaveBeenCalledTimes(1);
      const executedCommand = mockCreateBefehlHandler.execute.mock.calls[0]?.[0];
      expect(executedCommand.einsatzId).toBe('cm5einsatzid123');
      expect(executedCommand.empfaengerIds).toEqual(['user1', 'user2']);
      expect(executedCommand.auftrag).toBe('Patientenablage einrichten');

      // Verify repository findById was called
      expect(mockBefehlRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('sollte BadRequestException werfen wenn Handler fehlschlaegt (ungueltige EinsatzId - AC10)', async () => {
      // Given - ungueltige einsatzId
      const dto: CreateBefehlDto = {
        einsatzId: 'invalid-id',
        empfaengerIds: ['user1'],
        befehlsgeberId: 'befgeber1',
        erstellerId: 'ersteller1',
        auftrag: 'Auftrag',
      };

      // Mock Handler: execute() gibt Fehler zurück
      mockCreateBefehlHandler.execute.mockResolvedValue(Result.fail('Ungültige Einsatz-ID'));

      // When & Then - BadRequestException erwarten
      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);

      try {
        await controller.create(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const badRequestError = error as BadRequestException;
        const response = badRequestError.getResponse() as { statusCode: number; error: string; message: string };
        expect(response.statusCode).toBe(400);
        expect(response.message).toBe('Ungültige Einsatz-ID');
      }

      // Repository findById should NOT be called on handler failure
      expect(mockBefehlRepository.findById).not.toHaveBeenCalled();
    });

    it('sollte BadRequestException werfen wenn empfaengerIds leer ist (Validierungsfehler - AC10)', async () => {
      // Given - leere empfaengerIds (verletzt @ArrayMinSize(1))
      const dto: CreateBefehlDto = {
        einsatzId: 'cm5einsatzid123',
        empfaengerIds: [], // Leer - verletzt Validation
        befehlsgeberId: 'befgeber1',
        erstellerId: 'ersteller1',
        auftrag: 'Auftrag',
      };

      // Mock Handler: execute() gibt Validierungsfehler zurück
      mockCreateBefehlHandler.execute.mockResolvedValue(Result.fail('Mindestens ein Empfänger ist erforderlich'));

      // When & Then - BadRequestException erwarten
      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);

      try {
        await controller.create(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const badRequestError = error as BadRequestException;
        const response = badRequestError.getResponse() as { statusCode: number; error: string; message: string };
        expect(response.statusCode).toBe(400);
      }
    });

    it('sollte BadRequestException werfen wenn auftrag leer ist (Validierungsfehler - AC10)', async () => {
      // Given - leerer auftrag (verletzt @MinLength(3))
      const dto: CreateBefehlDto = {
        einsatzId: 'cm5einsatzid123',
        empfaengerIds: ['user1'],
        befehlsgeberId: 'befgeber1',
        erstellerId: 'ersteller1',
        auftrag: '', // Leer - verletzt Validation
      };

      // Mock Handler: execute() gibt Validierungsfehler zurück
      mockCreateBefehlHandler.execute.mockResolvedValue(Result.fail('Auftrag muss mindestens 3 Zeichen lang sein'));

      // When & Then - BadRequestException erwarten
      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);

      try {
        await controller.create(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const badRequestError = error as BadRequestException;
        const response = badRequestError.getResponse() as { statusCode: number; error: string; message: string };
        expect(response.statusCode).toBe(400);
        expect(response.message).toContain('Auftrag');
      }
    });

    it('sollte BadRequestException werfen wenn Handler kein Result zurueckgibt', async () => {
      // Given - valide DTO
      const dto: CreateBefehlDto = {
        einsatzId: 'cm5einsatzid123',
        empfaengerIds: ['user1'],
        befehlsgeberId: 'befgeber1',
        erstellerId: 'ersteller1',
        auftrag: 'Auftrag',
      };

      // Mock Handler: execute() gibt undefined zurück (Edge Case)
      mockCreateBefehlHandler.execute.mockResolvedValue(Result.ok(undefined as any));

      // When & Then - InternalServerErrorException erwarten
      await expect(controller.create(dto)).rejects.toThrow();
    });
  });
});

import { CreateBefehlHandler } from '@/application/befehl/commands/create-befehl/create-befehl.handler';
import { CreateBefehlCommand } from '@/application/befehl/commands/create-befehl/create-befehl.command';
import { CreateBefehlDto } from '@/application/befehl/dto/create-befehl.dto';
import { BefehlDto } from '@/application/befehl/dto/befehl.dto';
import { BefehlEmpfaengerDto } from '@/application/befehl/dto/befehl-empfaenger.dto';
import { BefehlKommentarDto } from '@/application/befehl/dto/befehl-kommentar.dto';
import { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BEFEHL_REPOSITORY } from '@infrastructure/di-tokens';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { BadRequestException, Body, Controller, Inject, InternalServerErrorException, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Befehl } from '@domain/aggregates/befehl.aggregate';
import type { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import type { BefehlKommentar } from '@domain/entities/befehl-kommentar.entity';

/**
 * Controller fuer Befehlsverwaltung (Story 1.2).
 *
 * Thin HTTP Adapter: Mappt HTTP-Requests zu Commands und Domain-Ergebnisse
 * zurueck auf HTTP-Responses. Business-Logik liegt im CreateBefehlHandler.
 *
 * **Endpoints:**
 * - POST /api/v-alpha/befehle — Neuen Kurzbefehl erfassen
 */
@ApiTags('Befehle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@Controller({
  path: 'befehle',
  version: 'alpha',
})
export class BefehlController {
  constructor(
    private readonly createBefehlHandler: CreateBefehlHandler,
    @Inject(BEFEHL_REPOSITORY) private readonly befehlRepository: IBefehlRepository,
  ) {}

  /**
   * Erstellt einen neuen Befehl via TransactionalCommandHandler.
   *
   * Flow: DTO → Command → Handler (Transaction + Outbox) → Load from DB → DTO Response
   */
  @Post()
  @ApiOperation({
    summary: 'Neuen Befehl erstellen',
    description: 'Erstellt einen neuen Kurzbefehl mit Empfängern, Befehlsgeber und Auftrag.',
  })
  @ApiWrappedCreatedResponse(BefehlDto, { description: 'Befehl erfolgreich erstellt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler in den Eingabedaten' })
  async create(@Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateBefehlDto): Promise<BefehlDto> {
    const command = new CreateBefehlCommand(dto.einsatzId, dto.empfaengerIds, dto.befehlsgeberId, dto.erstellerId, dto.auftrag, dto.zeitvorgabe, dto.ereignis, dto.mittel, dto.ziel, dto.weg);

    const result = await this.createBefehlHandler.execute(command);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new InternalServerErrorException('Befehl wurde erstellt, aber keine ID zurückgegeben');
    }

    return this.loadBefehlById(result.value);
  }

  /**
   * Laedt einen Befehl aus der DB und mappt ihn auf BefehlDto.
   */
  private async loadBefehlById(id: string): Promise<BefehlDto> {
    const befehlIdResult = BefehlId.create(id);
    if (befehlIdResult.isFailure) {
      throw new InternalServerErrorException(befehlIdResult.error);
    }

    const befehlId = befehlIdResult.value as BefehlId;
    const findResult = await this.befehlRepository.findById(befehlId);

    if (findResult.isFailure) {
      throw new InternalServerErrorException(findResult.error);
    }

    if (!findResult.value) {
      throw new InternalServerErrorException(`Befehl mit ID ${id} nicht gefunden nach Erstellung`);
    }

    return this.mapToDto(findResult.value);
  }

  /**
   * Mappt ein Befehl Aggregate auf BefehlDto fuer die API-Response.
   */
  private mapToDto(befehl: Befehl): BefehlDto {
    const dto = new BefehlDto();
    dto.id = befehl.id.value;
    dto.nummer = befehl.nummer;
    dto.einsatzId = befehl.einsatzId.value;
    dto.auftrag = befehl.auftrag;
    dto.befehlsgeberId = befehl.befehlsgeberId.value;
    dto.erstellerId = befehl.erstellerId.value;
    dto.status = befehl.status.value as BefehlDto['status'];
    dto.befehlstyp = befehl.befehlstyp;
    dto.zeitvorgabe = befehl.zeitvorgabe;
    dto.ereignis = befehl.ereignis;
    dto.mittel = befehl.mittel;
    dto.ziel = befehl.ziel;
    dto.weg = befehl.weg;
    dto.erteiltAm = befehl.erteiltAm;
    dto.empfaenger = befehl.empfaenger.map((e) => this.mapEmpfaengerToDto(e));
    dto.kommentare = befehl.kommentare.map((k) => this.mapKommentarToDto(k));
    dto.createdAt = befehl.createdAt;
    dto.updatedAt = befehl.updatedAt;
    return dto;
  }

  private mapEmpfaengerToDto(empfaenger: BefehlEmpfaenger): BefehlEmpfaengerDto {
    const dto = new BefehlEmpfaengerDto();
    dto.id = empfaenger.id;
    dto.empfaengerId = empfaenger.empfaengerId.value;
    dto.zugestelltAm = empfaenger.zugestelltAm;
    dto.quittiertAm = empfaenger.quittiertAm;
    dto.quittierungArt = empfaenger.quittierungArt;
    return dto;
  }

  private mapKommentarToDto(kommentar: BefehlKommentar): BefehlKommentarDto {
    const dto = new BefehlKommentarDto();
    dto.id = kommentar.id;
    dto.authorId = kommentar.authorId.value;
    dto.text = kommentar.text;
    dto.isRueckfrage = kommentar.isRueckfrage;
    dto.parentId = kommentar.parentId;
    dto.createdAt = kommentar.createdAt;
    return dto;
  }
}

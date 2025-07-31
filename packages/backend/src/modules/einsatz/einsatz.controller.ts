import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorHandlingService } from '../../common/services/error-handling.service';
import { CreateEinsatzDto } from './dto/create-einsatz.dto';
import { EinsatzService } from './einsatz.service';
import { Einsatz } from './entities/einsatz.entity';

/**
 * Controller für die Verwaltung von Einsätzen
 *
 * Bietet RESTful API-Endpunkte für CRUD-Operationen
 * auf Einsatz-Entitäten.
 */
@ApiTags('Einsatz')
@Controller('einsatz')
export class EinsatzController {
  private readonly logger = new Logger(EinsatzController.name);

  constructor(
    private readonly einsatzService: EinsatzService,
    private readonly configService: ConfigService,
    private readonly errorHandlingService: ErrorHandlingService,
  ) {}

  /**
   * Ruft alle Einsätze ab.
   *
   * @returns Eine Liste aller Einsätze
   */
  @Get()
  @ApiOperation({ summary: 'Alle Einsätze abrufen' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Die Liste aller Einsätze wurde erfolgreich abgerufen',
    type: [Einsatz],
  })
  async findAll(): Promise<Einsatz[]> {
    return this.einsatzService.findAll();
  }

  /**
   * Ruft einen Einsatz anhand seiner ID ab.
   *
   * @param id Die ID des Einsatzes
   * @returns Der Einsatz mit der angegebenen ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Einen Einsatz anhand der ID abrufen' })
  @ApiParam({ name: 'id', description: 'Die ID des Einsatzes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Der Einsatz wurde erfolgreich abgerufen',
    type: Einsatz,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Der Einsatz wurde nicht gefunden',
  })
  async findById(@Param('id') id: string): Promise<Einsatz> {
    return this.einsatzService.findById(id);
  }

  /**
   * Erstellt einen neuen Einsatz mit umgebungsspezifischen Sicherheitsmaßnahmen.
   *
   * @param createEinsatzDto Die Daten für den zu erstellenden Einsatz
   * @returns Der erstellte Einsatz
   */
  @Post()
  @ApiOperation({ summary: 'Einen neuen Einsatz erstellen' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Der Einsatz wurde erfolgreich erstellt',
    type: Einsatz,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ungültige Anfragedaten',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Einsatzerstellung ist in dieser Umgebung nicht erlaubt',
  })
  async create(@Body() createEinsatzDto: CreateEinsatzDto): Promise<Einsatz> {
    // Umgebungsspezifische Sicherheitsprüfungen
    const environment = this.configService.get('NODE_ENV', 'development');

    // Production-spezifische Einschränkungen
    if (environment === 'production') {
      // Prüfe, ob Einsatzerstellung in Production erlaubt ist
      const enableEinsatzCreation = this.configService.get('ENABLE_EINSATZ_CREATION', 'false');

      if (enableEinsatzCreation !== 'true') {
        this.logger.warn(
          `Einsatzerstellung in Production verweigert für: ${createEinsatzDto.name}`,
        );
        throw new ForbiddenException(
          'Einsatzerstellung ist in der Produktionsumgebung nicht aktiviert',
        );
      }

      // Zusätzliche Production-Validierung
      if (
        createEinsatzDto.name?.toLowerCase().includes('test') ||
        createEinsatzDto.name?.toLowerCase().includes('dev')
      ) {
        this.logger.warn(
          `Production-Einsatz mit Test/Dev Namen verweigert: ${createEinsatzDto.name}`,
        );
        throw new ForbiddenException(
          'Test- oder Entwicklungsnamen sind in der Produktionsumgebung nicht erlaubt',
        );
      }
    }

    // Verwende Error Handling Service für robuste Erstellung
    return await this.errorHandlingService.executeWithErrorHandling(
      async () => {
        this.logger.log(`Erstelle Einsatz: ${createEinsatzDto.name} in ${environment} Umgebung`);
        return await this.einsatzService.create(createEinsatzDto);
      },
      `create-einsatz-controller-${createEinsatzDto.name}`,
      createEinsatzDto,
    );
  }
}

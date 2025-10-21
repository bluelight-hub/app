import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/common/decorators/api-wrapped-response.decorator';
import { BadRequestException, Body, Controller, Delete, Get, Logger, Param, Post, UploadedFile, UseGuards, UseInterceptors, ValidationPipe, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConsumes, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { LagekarteService } from '../services/lagekarte.service';
import { SaveLagekarteStateDto } from '../dto/save-lagekarte-state.dto';
import { Lagekarte } from '@prisma/client';

/**
 * Controller für Lagekarten-Management
 *
 * **Lazy Creation Pattern:**
 * - Lagekarten werden erst beim ersten GET-Request erstellt, nicht bei Einsatz-Erstellung
 * - Bei Erstellung wird automatisch ein initialer POI (Typ: EINSATZORT) aus `einsatz.einsatzort` geocoded
 *
 * **Route Structure:**
 * - Base: `/einsatz/:einsatzId/lagekarte`
 * - Alle Routes sind JWT-geschützt via `JwtAuthGuard`
 *
 * @security Alle Endpunkte erfordern valides JWT Token
 */
@ApiTags('Lagekarte')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({
  path: 'einsatz/:einsatzId/lagekarte',
  version: 'alpha',
})
export class LagekarteController {
  private readonly logger = new Logger(LagekarteController.name);
  private readonly uploadsPath: string;
  private readonly uploadDir: string;

  constructor(
    private readonly lagekarteService: LagekarteService,
    private readonly configService: ConfigService,
  ) {
    // Get uploads path from ENV or use default (relative to project root)
    const uploadsBase = this.configService.get<string>('UPLOADS_PATH') || 'uploads';
    this.uploadsPath = join(process.cwd(), uploadsBase);
    this.uploadDir = join(this.uploadsPath, 'lagekarte');

    // Ensure uploads directory exists
    try {
      mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Uploads directory ready: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create uploads directory: ${this.uploadDir}`, error);
    }
  }

  /**
   * Lagekarte abrufen oder lazy erstellen
   *
   * **Lazy Creation:**
   * - Wenn keine Lagekarte existiert, wird sie automatisch erstellt
   * - Bei Neuerstellung wird initialer POI (Typ: EINSATZORT) aus `einsatz.einsatzort` geocoded
   *
   * @param einsatzId - ID des Einsatzes
   * @returns Lagekarte mit allen POIs
   */
  @Get()
  @ApiOperation({
    summary: 'Lagekarte abrufen',
    description:
      'Gibt die Lagekarte für einen Einsatz zurück. Lazy Creation: Wenn keine Lagekarte existiert, wird sie automatisch erstellt mit initialem POI (Typ: EINSATZORT) aus einsatz.einsatzort.',
  })
  @ApiWrappedResponse(Object, { description: 'Lagekarte erfolgreich abgerufen oder erstellt' })
  @ApiNotFoundResponse({ description: 'Einsatz nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async getLagekarte(@Param('einsatzId') einsatzId: string): Promise<Lagekarte> {
    this.logger.log(`Getting Lagekarte for Einsatz ${einsatzId}`);
    const lagekarte = await this.lagekarteService.getOrCreateLagekarte(einsatzId);
    this.logger.log(`Lagekarte ${lagekarte.id} returned for Einsatz ${einsatzId}`);
    return lagekarte;
  }

  /**
   * Lagekarte-State speichern (GeoJSON Zeichnungen)
   *
   * @param einsatzId - ID des Einsatzes
   * @param dto - SaveLagekarteStateDto mit state (GeoJSON FeatureCollection)
   * @param user - Authentifizierter User
   * @returns Aktualisierte Lagekarte
   */
  @Post()
  @ApiOperation({
    summary: 'Lagekarte-State speichern',
    description: 'Speichert den GeoJSON State (Zeichnungen) einer Lagekarte. Der State enthält Polygone, Linien und Marker im GeoJSON FeatureCollection Format.',
  })
  @ApiWrappedResponse(Object, { description: 'Lagekarte-State erfolgreich gespeichert' })
  @ApiNotFoundResponse({ description: 'Lagekarte nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler in den Eingabedaten' })
  async saveLagekarteState(
    @Param('einsatzId') einsatzId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SaveLagekarteStateDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<Lagekarte> {
    this.logger.log(`Saving Lagekarte state for Einsatz ${einsatzId} by user ${user.userId}`);

    // Get existing Lagekarte
    const lagekarte = await this.lagekarteService.findByEinsatzId(einsatzId);
    if (!lagekarte) {
      this.logger.error(`Lagekarte not found for Einsatz ${einsatzId}`);
      throw new NotFoundException(`Lagekarte for Einsatz ${einsatzId} not found`);
    }

    // Update state
    const updated = await this.lagekarteService.updateState(lagekarte.id, dto.state);
    this.logger.log(`Lagekarte ${lagekarte.id} state updated for Einsatz ${einsatzId}`);
    return updated;
  }

  /**
   * Screenshot der Lagekarte hochladen (für ETB-Integration)
   *
   * **Security:**
   * - Nur PNG-Files erlaubt (MIME-Type Validierung)
   * - Filename Sanitization (verhindert Path Traversal)
   * - Max. File-Size: 10MB
   *
   * **Storage:**
   * - Ziel: `/uploads/lagekarte/{einsatzId}_{timestamp}.png`
   * - Persistierung via Docker Volume
   *
   * @param einsatzId - ID des Einsatzes
   * @param file - Hochgeladenes Screenshot-File (PNG)
   * @param user - Authentifizierter User
   * @returns File URL für ETB-Integration
   */
  @Post('screenshot')
  @ApiOperation({
    summary: 'Screenshot der Lagekarte hochladen',
    description: 'Upload eines Screenshots der Lagekarte für ETB-Integration. Nur PNG-Files bis 10MB. Rückgabe: File-URL für Verwendung in ETB-Einträgen.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiWrappedResponse(Object, { description: 'Screenshot erfolgreich hochgeladen' })
  @ApiBadRequestResponse({ description: 'Ungültiges File-Format oder zu groß' })
  @ApiNotFoundResponse({ description: 'Einsatz nicht gefunden' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          // Use project root for uploads (consistent with ServeStaticModule)
          const uploadsBase = process.env.UPLOADS_PATH || 'uploads';
          const uploadsPath = join(process.cwd(), uploadsBase);
          const uploadDir = join(uploadsPath, 'lagekarte');

          // Ensure directory exists
          try {
            mkdirSync(uploadDir, { recursive: true });
          } catch {
            // Ignore errors - directory likely exists
          }

          cb(null, uploadDir);
        },
        filename: (req, _file, cb) => {
          const einsatzId = req.params.einsatzId || 'unknown';
          const timestamp = Date.now();
          // Sanitize: Only allow .png extension, prevent path traversal
          const sanitizedEinsatzId = einsatzId.replace(/[^a-zA-Z0-9_-]/g, '');
          cb(null, `${sanitizedEinsatzId}_${timestamp}.png`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max (Lagekarten-Screenshots mit scale:2 können groß sein)
      },
      fileFilter: (_req, file, cb) => {
        // Validate MIME type: Only accept image/png
        if (file.mimetype !== 'image/png') {
          return cb(new BadRequestException('Only PNG files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadScreenshot(@Param('einsatzId') einsatzId: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: ValidatedUser): Promise<{ url: string }> {
    this.logger.log(`Uploading screenshot for Einsatz ${einsatzId} by user ${user.userId}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileUrl = `/uploads/lagekarte/${file.filename}`;
    this.logger.log(`Screenshot uploaded: ${fileUrl}`);

    return { url: fileUrl };
  }

  /**
   * Lagekarte löschen (CASCADE: POIs werden automatisch mitgelöscht)
   *
   * @param einsatzId - ID des Einsatzes
   * @param user - Authentifizierter User
   */
  @Delete()
  @ApiOperation({
    summary: 'Lagekarte löschen',
    description: 'Löscht die Lagekarte eines Einsatzes. CASCADE: Alle zugehörigen POIs werden automatisch mitgelöscht.',
  })
  @ApiWrappedResponse(Object, { description: 'Lagekarte erfolgreich gelöscht' })
  @ApiNotFoundResponse({ description: 'Lagekarte nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async deleteLagekarte(@Param('einsatzId') einsatzId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    this.logger.warn(`Deleting Lagekarte for Einsatz ${einsatzId} by user ${user.userId}`);

    // Get existing Lagekarte
    const lagekarte = await this.lagekarteService.findByEinsatzId(einsatzId);
    if (!lagekarte) {
      this.logger.error(`Lagekarte not found for Einsatz ${einsatzId}`);
      throw new NotFoundException(`Lagekarte for Einsatz ${einsatzId} not found`);
    }

    // Delete (cascade to POIs)
    await this.lagekarteService.deleteLagekarte(lagekarte.id);
    this.logger.warn(`Lagekarte ${lagekarte.id} deleted for Einsatz ${einsatzId} (CASCADE to POIs)`);
  }
}

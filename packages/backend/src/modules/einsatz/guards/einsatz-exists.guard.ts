import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { EinsatzService } from '../einsatz.service';

/**
 * Guard zur Überprüfung der Existenz eines Einsatzes
 *
 * Dieser Guard prüft, ob ein Einsatz mit der angegebenen ID existiert,
 * bevor der Zugriff auf die geschützte Route gewährt wird.
 * Er wird typischerweise bei PUT-, PATCH- und DELETE-Operationen verwendet,
 * um sicherzustellen, dass die Ressource vor der Manipulation existiert.
 *
 * **Funktionsweise:**
 * 1. Extrahiert die 'einsatzId' aus den Route-Parametern
 * 2. Validiert, dass die ID vorhanden ist
 * 3. Überprüft die Existenz über den EinsatzService
 * 4. Wirft NotFoundException bei fehlender ID oder nicht existierendem Einsatz
 * 5. Gibt true zurück, wenn der Einsatz existiert
 *
 * **Verwendung:**
 * ```typescript
 * @UseGuards(EinsatzExistsGuard)
 * @Patch(':einsatzId')
 * async updateEinsatz(@Param('einsatzId') id: string) {
 *   // Guard stellt sicher, dass Einsatz existiert
 * }
 * ```
 *
 * @class EinsatzExistsGuard
 * @implements {CanActivate}
 * @throws {NotFoundException} Wenn keine einsatzId in den Parametern gefunden wird
 * @throws {NotFoundException} Wenn der Einsatz mit der angegebenen ID nicht existiert
 *
 * @example
 * ```typescript
 * // Route: PATCH /einsatz/123/status
 * // Guard prüft automatisch, ob Einsatz mit ID "123" existiert
 *
 * // Bei nicht existierender ID:
 * // HTTP 404 - "EinsatzId missing" oder "Einsatz not found"
 * ```
 */
@Injectable()
export class EinsatzExistsGuard implements CanActivate {
  /**
   * Konstruktor des EinsatzExistsGuard
   *
   * @param {EinsatzService} einsatzService - Service für Einsatz-Operationen
   */
  constructor(private readonly einsatzService: EinsatzService) {}

  /**
   * Überprüft, ob der Zugriff auf die Route erlaubt werden soll
   *
   * Diese Methode implementiert die CanActivate-Schnittstelle und führt
   * die eigentliche Existenzprüfung durch. Sie extrahiert die einsatzId
   * aus den Route-Parametern und delegiert die Existenzprüfung an den
   * EinsatzService.
   *
   * @param {ExecutionContext} context - Der Ausführungskontext der NestJS-Route
   * @returns {Promise<boolean>} True, wenn der Einsatz existiert und Zugriff gewährt wird
   * @throws {NotFoundException} Bei fehlender ID oder nicht existierendem Einsatz
   *
   * @example
   * ```typescript
   * // Automatischer Aufruf durch NestJS bei geschützten Routen:
   * // GET /einsatz/abc123 -> canActivate wird mit abc123 aufgerufen
   * // Wenn Einsatz existiert: Route wird ausgeführt
   * // Wenn nicht: HTTP 404 Exception
   * ```
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const einsatzId = request.params['einsatzId'];

    if (!einsatzId) {
      throw new NotFoundException('EinsatzId missing');
    }

    // Delegiert an EinsatzService - wirft NotFoundException wenn nicht gefunden
    await this.einsatzService.findById(einsatzId);

    return true;
  }
}

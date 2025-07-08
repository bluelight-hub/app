import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { EinsatzService } from '../einsatz.service';

/**
 * Guard zur Überprüfung der Existenz eines Einsatzes
 *
 * Dieser Guard prüft, ob ein Einsatz mit der angegebenen ID existiert,
 * bevor der Zugriff auf die geschützte Route gewährt wird.
 * Wirft eine NotFoundException, wenn der Einsatz nicht gefunden wird.
 *
 * @class EinsatzExistsGuard
 */
@Injectable()
export class EinsatzExistsGuard implements CanActivate {
  constructor(private readonly einsatzService: EinsatzService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const einsatzId = request.params['einsatzId'];
    if (!einsatzId) {
      throw new NotFoundException('EinsatzId missing');
    }
    await this.einsatzService.findById(einsatzId);
    return true;
  }
}

import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Guard zur Pruefung befehlsspezifischer Rollen im Einsatz-Kontext.
 *
 * Aktuell: Passthrough - alle Anfragen werden erlaubt.
 * Wird mit dem Einsatzrollen-System spaeter re-aktiviert.
 *
 * @RequiresBefehlRolle() Decorators am Controller bleiben als Dokumentation bestehen.
 */
@Injectable()
export class BefehlRollenGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

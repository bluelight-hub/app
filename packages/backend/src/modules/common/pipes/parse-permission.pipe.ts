import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

/**
 * NestJS Pipe zur Validierung von Permission-Parametern in Controller-Routen.
 *
 * Validiert das Format `domain:action` (lowercase, underscore erlaubt).
 * Wildcards (`*`) sind NICHT erlaubt - diese duerfen nur als Rollen-Defaults existieren,
 * nicht manuell vergeben werden.
 *
 * @example
 * ```typescript
 * @Delete(':id/permissions/:permission')
 * revokePermission(@Param('permission', ParsePermissionPipe) permission: string) {
 *   // permission ist garantiert im Format domain:action
 * }
 * ```
 */
@Injectable()
export class ParsePermissionPipe implements PipeTransform<string, string> {
  private static readonly PERMISSION_PATTERN = /^[a-z_]+:[a-z_]+$/;

  transform(value: string): string {
    if (!ParsePermissionPipe.PERMISSION_PATTERN.test(value)) {
      throw new BadRequestException('Validation failed (invalid permission format, expected domain:action with lowercase letters and underscores)');
    }

    return value;
  }
}

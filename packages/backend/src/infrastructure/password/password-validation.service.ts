import { BadRequestException, Injectable } from '@nestjs/common';
import { HibpService } from './hibp.service';
import { isPasswordBlocked } from './password-blocklist.const';

/**
 * Zentraler Passwort-Validierungsservice gemäß NIST SP 800-63B-4
 *
 * Kombiniert alle Passwort-Validierungen an einem Ort:
 * - Längenprüfung (8-128 Zeichen)
 * - Blocklist-Prüfung (~193 häufige Passwörter)
 * - HIBP-Prüfung (bekannte Datenlecks)
 *
 * KEINE Composition Rules (Groß/Klein/Zahlen/Sonderzeichen) gemäß NIST.
 */
@Injectable()
export class PasswordValidationService {
  constructor(private readonly hibpService: HibpService) {}

  /**
   * Validiert ein Passwort vollständig gemäß NIST SP 800-63B-4
   *
   * @param password - Das zu prüfende Passwort
   * @param context - Kontext für Logging (z.B. 'admin-setup', 'server-setup')
   * @throws BadRequestException bei Validierungsfehlern
   */
  async validatePassword(password: string, context: string): Promise<void> {
    // 1. Längenprüfung
    if (password.length < 8) {
      throw new BadRequestException('Passwort muss mindestens 8 Zeichen lang sein');
    }
    if (password.length > 128) {
      throw new BadRequestException('Passwort darf maximal 128 Zeichen lang sein');
    }

    // 2. Blocklist-Prüfung
    if (isPasswordBlocked(password)) {
      throw new BadRequestException('Dieses Passwort ist zu häufig und nicht erlaubt');
    }

    // 3. HIBP-Prüfung (async)
    const hibpResult = await this.hibpService.checkPassword(password);
    if (hibpResult.isCompromised) {
      throw new BadRequestException({
        message: 'PASSWORD_COMPROMISED',
        statusCode: 400,
        occurrences: hibpResult.occurrences,
        context,
      });
    }
  }
}

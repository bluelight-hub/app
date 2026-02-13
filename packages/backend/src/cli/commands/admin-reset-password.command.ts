import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { isAdmin } from '@/modules/auth/utils/auth.utils';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { validateBcryptCostFactor } from '@/infrastructure/config/security.constants';

@Injectable()
export class AdminResetPasswordCommand {
  private readonly logger = new Logger(AdminResetPasswordCommand.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async run(args: string[]): Promise<void> {
    const [username, newPassword] = args;

    if (!username || !newPassword) {
      throw new Error('Benutzername und neues Passwort müssen angegeben werden');
    }

    try {
      // Will be implemented in subtask 31.2 and 31.3
      // For now, just basic structure
      this.logger.log(`Resetting password for user: ${username}`);

      await this.resetAdminPassword(username, newPassword);

      this.logger.log(`✅ Passwort erfolgreich zurückgesetzt für Admin: ${username}`);
      this.logger.log(`📅 Zeitstempel: ${new Date().toISOString()}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to reset password for ${username}`, error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  private async resetAdminPassword(username: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.isDeleted) {
      this.logger.error(`❌ Fehler: Benutzer "${username}" wurde nicht gefunden oder ist gelöscht.`);
      throw new Error(`Benutzer "${username}" wurde nicht gefunden oder ist gelöscht.`);
    }

    if (!isAdmin(user.role)) {
      this.logger.error(`❌ Fehler: Benutzer "${username}" ist kein Administrator (Rolle: ${user.role}).`);
      throw new Error(`Benutzer "${username}" ist kein Administrator (Rolle: ${user.role}).`);
    }

    // Get salt rounds from ConfigService with type-safe validation (NFR-S1 compliant)
    const configuredSaltRounds = this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10');
    const validation = validateBcryptCostFactor(configuredSaltRounds);

    if (!validation.isValid) {
      this.logger.warn(`Invalid BCRYPT_SALT_ROUNDS value: ${configuredSaltRounds}. ${validation.error}. Using fallback: ${validation.value}`);
    }

    const hash = await bcrypt.hash(newPassword, validation.value);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    // TODO: Implement session invalidation when sessions are added to the schema
    // This will ensure all active sessions are terminated after password reset
    // await this.prisma.session.deleteMany({
    //   where: { userId: user.id },
    // });

    this.logger.log(`Successfully reset password for admin: ${username}`);
  }
}

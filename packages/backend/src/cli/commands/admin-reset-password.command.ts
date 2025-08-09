import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { isAdmin } from '@/auth/utils/auth.utils';

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
    } catch (error) {
      this.logger.error(`Failed to reset password for ${username}`, error.stack);
      throw error;
    }
  }

  private async resetAdminPassword(username: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      this.logger.error(`User not found: ${username}`);
      this.logger.error(`❌ Fehler: Benutzer "${username}" wurde nicht gefunden.`);
      throw new Error(`Benutzer "${username}" wurde nicht gefunden.`);
    }

    if (!isAdmin(user.role)) {
      this.logger.error(`User is not an admin: ${username} (role: ${user.role})`);
      this.logger.error(
        `❌ Fehler: Benutzer "${username}" ist kein Administrator (Rolle: ${user.role}).`,
      );
      throw new Error(`Benutzer "${username}" ist kein Administrator (Rolle: ${user.role}).`);
    }

    // Get salt rounds from ConfigService with validation
    const configuredSaltRounds = this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10');
    const saltRounds = parseInt(configuredSaltRounds, 10);

    // Validate salt rounds and provide fallback
    const validSaltRounds =
      !isNaN(saltRounds) && saltRounds > 0 && saltRounds <= 31 ? saltRounds : 10;

    if (saltRounds !== validSaltRounds) {
      this.logger.warn(
        `Invalid BCRYPT_SALT_ROUNDS value: ${configuredSaltRounds}. Using default: ${validSaltRounds}`,
      );
    }

    const hash = await bcrypt.hash(newPassword, validSaltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    // Optional: Alle aktiven Sessions/Tokens des Users invalidieren
    // Sessions are currently not implemented in the schema
    // await this.prisma.session.deleteMany({
    //   where: { userId: user.id },
    // });

    this.logger.log(`Successfully reset password for admin: ${username}`);
  }
}

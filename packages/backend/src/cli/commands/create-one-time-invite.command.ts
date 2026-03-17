import { Injectable, Logger } from '@nestjs/common';
import { CreateInviteCommand, CreateInviteHandler } from '@/application/admin/commands';
import { INVITE_ERROR_CODES } from '@/application/admin/errors/invite-error.codes';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { UserRole } from '@/generated/prisma/client';
import { isAdmin } from '@/modules/auth/utils/auth.utils';

interface CreateOneTimeInviteCliOptions {
  username?: string;
  userId?: string;
  label?: string;
  expiresAt?: string;
  days?: number;
}

interface InviteCreator {
  id: string;
  username: string;
  role: UserRole;
  isDeleted: boolean;
}

@Injectable()
export class CreateOneTimeInviteCliCommand {
  private static readonly DEFAULT_EXPIRY_DAYS = 7;
  private readonly logger = new Logger(CreateOneTimeInviteCliCommand.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly createInviteHandler: CreateInviteHandler,
  ) {}

  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);
    const creator = await this.resolveCreator(options);
    const expiresAt = this.resolveExpiryDate(options);

    this.logger.log(`Erzeuge Einmal-Einladungscode für ${creator.username} (${creator.id})`);

    const commandResult = CreateInviteCommand.create({
      createdById: creator.id,
      expiresAt,
      maxUses: 1,
      label: options.label,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new Error(this.mapInviteErrorCodeToMessage(commandResult.error ?? INVITE_ERROR_CODES.CREATION_FAILED));
    }

    const result = await this.createInviteHandler.execute(commandResult.value);
    if (result.isFailure || !result.value) {
      throw new Error(this.mapInviteErrorCodeToMessage(result.error ?? INVITE_ERROR_CODES.CREATION_FAILED));
    }

    this.printSuccess(result.value, creator);
  }

  private parseArgs(args: string[]): CreateOneTimeInviteCliOptions {
    const options: CreateOneTimeInviteCliOptions = {};

    for (let index = 0; index < args.length; index++) {
      const arg = args[index];

      switch (arg) {
        case '--username':
          options.username = this.readRequiredValue(args, index, '--username');
          index++;
          break;
        case '--user-id':
          options.userId = this.readRequiredValue(args, index, '--user-id');
          index++;
          break;
        case '--label':
          options.label = this.readRequiredValue(args, index, '--label');
          index++;
          break;
        case '--expires-at':
          options.expiresAt = this.readRequiredValue(args, index, '--expires-at');
          index++;
          break;
        case '--days': {
          const rawDays = this.readRequiredValue(args, index, '--days');
          const parsedDays = Number.parseInt(rawDays, 10);
          if (Number.isNaN(parsedDays) || parsedDays < 1) {
            throw new Error('--days muss eine Ganzzahl >= 1 sein');
          }
          options.days = parsedDays;
          index++;
          break;
        }
        default:
          throw new Error(`Unbekannter Parameter: ${arg}`);
      }
    }

    if (!options.username && !options.userId) {
      throw new Error('Fehlendes Required Argument: --username <name> oder --user-id <id>');
    }

    if (options.username && options.userId) {
      throw new Error('Bitte entweder --username oder --user-id angeben, nicht beides');
    }

    if (options.expiresAt && options.days !== undefined) {
      throw new Error('--expires-at und --days dürfen nicht gleichzeitig gesetzt werden');
    }

    return options;
  }

  private readRequiredValue(args: string[], index: number, flag: string): string {
    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Fehlender Wert für ${flag}`);
    }

    return value;
  }

  private async resolveCreator(options: CreateOneTimeInviteCliOptions): Promise<InviteCreator> {
    const user = options.username
      ? await this.prisma.user.findUnique({
          where: { username: options.username },
          select: {
            id: true,
            username: true,
            role: true,
            isDeleted: true,
          },
        })
      : await this.prisma.user.findUnique({
          where: { id: options.userId },
          select: {
            id: true,
            username: true,
            role: true,
            isDeleted: true,
          },
        });

    if (!user || user.isDeleted) {
      throw new Error('Angegebener Benutzer wurde nicht gefunden oder ist gelöscht');
    }

    if (!isAdmin(user.role)) {
      throw new Error(`Benutzer "${user.username}" ist kein Administrator (Rolle: ${user.role})`);
    }

    return user;
  }

  private resolveExpiryDate(options: CreateOneTimeInviteCliOptions): Date {
    if (options.expiresAt) {
      const parsedDate = new Date(options.expiresAt);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('--expires-at muss ein gültiges ISO-8601 Datum sein');
      }

      return parsedDate;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options.days ?? CreateOneTimeInviteCliCommand.DEFAULT_EXPIRY_DAYS));
    return expiresAt;
  }

  private mapInviteErrorCodeToMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      [INVITE_ERROR_CODES.EXPIRY_PAST]: 'Das Ablaufdatum muss in der Zukunft liegen',
      [INVITE_ERROR_CODES.EXPIRY_TOO_SOON]: 'Das Ablaufdatum muss mindestens 1 Minute in der Zukunft liegen',
      [INVITE_ERROR_CODES.MAX_USES_INVALID]: 'maxUses muss zwischen 1 und 100 liegen',
      [INVITE_ERROR_CODES.LABEL_TOO_LONG]: 'Label darf maximal 100 Zeichen haben',
      [INVITE_ERROR_CODES.CREATION_FAILED]: 'Invite-Code konnte nicht erstellt werden',
      [INVITE_ERROR_CODES.SAVE_FAILED]: 'Invite-Code konnte nicht gespeichert werden',
    };

    return errorMessages[errorCode] ?? `Ein Fehler ist aufgetreten: ${errorCode}`;
  }

  private printSuccess(
    invite: {
      id: string;
      code: string;
      expiresAt: string;
      maxUses: number;
      createdAt: string;
      label?: string;
      deepLink: string;
      webLink: string;
    },
    creator: InviteCreator,
  ): void {
    console.log('\n========================================');
    console.log('ONE-TIME INVITE CODE');
    console.log('========================================');
    console.log(`Code:       ${invite.code}`);
    console.log(`Invite ID:  ${invite.id}`);
    console.log(`Ersteller:  ${creator.username} (${creator.id})`);
    console.log(`Max Uses:   ${invite.maxUses}`);
    console.log(`Expires:    ${invite.expiresAt}`);
    console.log(`Created:    ${invite.createdAt}`);

    if (invite.label) {
      console.log(`Label:      ${invite.label}`);
    }

    console.log(`Deep Link:  ${invite.deepLink}`);
    console.log(`Web Link:   ${invite.webLink}`);
    console.log('========================================');
    console.log('WICHTIG: Der Klartext-Code ist nur in dieser Ausgabe sichtbar.\n');
  }
}

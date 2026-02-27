import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { DeleteBefehlsgeberVorschlagCommand } from './deactivate-befehlsgeber-vorschlag.command';

/** Handler fuer DeleteBefehlsgeberVorschlagCommand. Loescht einen Vorschlag permanent. */
@Injectable()
export class DeleteBefehlsgeberVorschlagHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteBefehlsgeberVorschlagCommand): Promise<void> {
    const existing = await this.prisma.befehlsgeberVorschlag.findUnique({
      where: { id: command.id },
    });

    if (!existing) {
      throw new NotFoundException(`BefehlsgeberVorschlag mit ID "${command.id}" nicht gefunden`);
    }

    await this.prisma.befehlsgeberVorschlag.delete({
      where: { id: command.id },
    });
  }
}

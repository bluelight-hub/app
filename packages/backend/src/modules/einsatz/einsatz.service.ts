import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEinsatzDto } from './dto/create-einsatz.dto';
import { Einsatz } from './entities/einsatz.entity';

@Injectable()
export class EinsatzService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Erstellt einen neuen Einsatz mit den angegebenen Daten.
   *
   * @param createEinsatzDto Die Daten für den zu erstellenden Einsatz
   * @returns Der erstellte Einsatz
   */
  async create(createEinsatzDto: CreateEinsatzDto): Promise<Einsatz> {
    return this.prisma.einsatz.create({
      data: createEinsatzDto,
    });
  }

  async findAll(): Promise<Einsatz[]> {
    return this.prisma.einsatz.findMany();
  }

  async findById(id: string): Promise<Einsatz> {
    const einsatz = await this.prisma.einsatz.findUnique({ where: { id } });
    if (!einsatz) {
      throw new NotFoundException(`Einsatz ${id} not found`);
    }
    return einsatz;
  }
}

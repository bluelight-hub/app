import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Einsatz } from './entities/einsatz.entity';
import { CreateEinsatzDto } from './dto/create-einsatz.dto';

@Injectable()
export class EinsatzService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<Einsatz[]> {
        return this.prisma.einsatz.findMany();
    }

    async count(): Promise<number> {
        return this.prisma.einsatz.count();
    }

    async create(data: CreateEinsatzDto): Promise<Einsatz> {
        return this.prisma.einsatz.create({ data });
    }

    async findById(id: string): Promise<Einsatz> {
        const einsatz = await this.prisma.einsatz.findUnique({ where: { id } });
        if (!einsatz) {
            throw new NotFoundException(`Einsatz ${id} not found`);
        }
        return einsatz;
    }
}

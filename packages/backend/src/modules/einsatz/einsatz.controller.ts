import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EinsatzService } from './einsatz.service';
import { Einsatz } from './entities/einsatz.entity';
import { CreateEinsatzDto } from './dto/create-einsatz.dto';

@ApiTags('Einsatz')
@Controller('einsatz')
export class EinsatzController {
    constructor(private readonly einsatzService: EinsatzService) {}

    @Get()
    async findAll(): Promise<Einsatz[]> {
        return this.einsatzService.findAll();
    }

    @Post()
    async create(@Body() dto: CreateEinsatzDto): Promise<Einsatz> {
        return this.einsatzService.create(dto);
    }
}

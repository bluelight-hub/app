import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EinsatzService } from './einsatz.service';
import { Einsatz } from './entities/einsatz.entity';

@ApiTags('Einsatz')
@Controller('einsatz')
export class EinsatzController {
    constructor(private readonly einsatzService: EinsatzService) {}

    @Get()
    async findAll(): Promise<Einsatz[]> {
        return this.einsatzService.findAll();
    }
}

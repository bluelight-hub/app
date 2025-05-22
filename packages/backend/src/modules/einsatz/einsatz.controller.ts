import { Body, Controller, Get, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateEinsatzDto } from './dto/create-einsatz.dto';
import { EinsatzService } from './einsatz.service';
import { Einsatz } from './entities/einsatz.entity';

@ApiTags('Einsatz')
@Controller('einsatz')
export class EinsatzController {
    constructor(private readonly einsatzService: EinsatzService) {}

    /**
     * Ruft alle Einsätze ab.
     * 
     * @returns Eine Liste aller Einsätze
     */
    @Get()
    @ApiOperation({ summary: 'Alle Einsätze abrufen' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Die Liste aller Einsätze wurde erfolgreich abgerufen',
        type: [Einsatz]
    })
    async findAll(): Promise<Einsatz[]> {
        return this.einsatzService.findAll();
    }

    /**
     * Ruft einen Einsatz anhand seiner ID ab.
     * 
     * @param id Die ID des Einsatzes
     * @returns Der Einsatz mit der angegebenen ID
     */
    @Get(':id')
    @ApiOperation({ summary: 'Einen Einsatz anhand der ID abrufen' })
    @ApiParam({ name: 'id', description: 'Die ID des Einsatzes' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Der Einsatz wurde erfolgreich abgerufen',
        type: Einsatz
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Der Einsatz wurde nicht gefunden'
    })
    async findById(@Param('id') id: string): Promise<Einsatz> {
        return this.einsatzService.findById(id);
    }

    /**
     * Erstellt einen neuen Einsatz.
     * 
     * @param createEinsatzDto Die Daten für den zu erstellenden Einsatz
     * @returns Der erstellte Einsatz
     */
    @Post()
    @ApiOperation({ summary: 'Einen neuen Einsatz erstellen' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Der Einsatz wurde erfolgreich erstellt',
        type: Einsatz
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Ungültige Anfragedaten'
    })
    async create(@Body() createEinsatzDto: CreateEinsatzDto): Promise<Einsatz> {
        return this.einsatzService.create(createEinsatzDto);
    }
}

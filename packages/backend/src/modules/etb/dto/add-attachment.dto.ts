import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO für das Hinzufügen einer Anlage zu einem ETB-Eintrag.
 */
export class AddAttachmentDto {
    /**
     * Optionale Beschreibung der Anlage
     */
    @ApiPropertyOptional({ description: 'Optionale Beschreibung der Anlage' })
    @IsString()
    @IsOptional()
    beschreibung?: string;

    /**
     * Datei wird als Multer-File über den Request hochgeladen
     * und nicht direkt in diesem DTO repräsentiert.
     * Diese Eigenschaft ist im DTO optional, da die Datei über den
     * @UploadedFile() Decorator bereitgestellt wird.
     */
    @ApiProperty({ description: 'Hochgeladene Datei', type: 'string', format: 'binary' })
    @IsOptional()
    file?: any;
} 
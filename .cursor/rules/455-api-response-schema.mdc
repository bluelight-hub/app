---
description: 
globs: **.controller.ts
alwaysApply: false
---
# Standardisierte API-Antwortstruktur

## Context
- Gilt für alle API-Endpunkte in der Backend-Anwendung
- Stellt einheitliches Antwortformat sicher
- Verbessert Kompatibilität mit Swagger
- Erleichtert Frontend-Integration

## Requirements

1. **Standardisiertes Antwortformat**
   - Alle API-Antworten müssen dem Format `{ data, meta, message? }` folgen
   - `data` enthält die eigentlichen Antwortdaten
   - `meta` enthält Metadaten wie Zeitstempel und Paginierung
   - `message` optional für zusätzliche Informationen

2. **Response-DTOs verwenden**
   - Für jeden Rückgabetyp eine eigene Response-DTO-Klasse erstellen
   - Klassen von `ApiResponse<T>` aus `@/common/interfaces/api-response.interface.ts` ableiten
   - `@ApiProperty()` Dekorator für Swagger-Dokumentation verwenden
   - Für komplexe Datenstrukturen eigene DTOs definieren und diese referenzieren

3. **Array-Definitionen**
   - Bevorzugtes Format für Arrays: `type: Entity, isArray: true` statt `type: [Entity]`
   - Für komplexe Array-Inhalte eigenständige DTOs verwenden
   - Bei komplexen Objekten ggf. einen expliziten Mapper im Controller verwenden

4. **TransformInterceptor verwenden**
   - Controller mit `@UseInterceptors(TransformInterceptor)` dekorieren (Controller- oder Routenebene)
   - Wandelt automatisch alle Antworten in das Format { data, meta, message? } um

5. **Swagger-Dokumentation**
   - `@ApiOkResponse({ type: XyzResponse })` für 200 OK Antworten verwenden
   - `@ApiResponse({ status: xxx, type: XyzResponse })` für andere Statuscodes
   - Spezifische Response-Klassen für jeden Endpunkt definieren

6. **Paginierungsinformationen**
   - Bei paginierten Ergebnissen `ApiPagination` aus `@/common/interfaces/api-response.interface.ts` verwenden
   - Format: `{ page, limit, total, totalPages }`
   - Bei einfacher Paginierung (nur total) eigenes DTO mit Gesamtzahl erstellen

## Examples

```typescript
// Response-DTOs definieren
import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '@/common/interfaces/api-response.interface';
import { Entity } from './entity';

// DTO für einzelne Entity
export class EntityDto {
  @ApiProperty({ description: 'Eindeutige ID', type: 'string' })
  id: string;
  
  @ApiProperty({ description: 'Name der Entity', type: 'string' })
  name: string;
  
  @ApiProperty({ description: 'Typ der Entity', type: 'string' })
  type: string;
}

// Response für eine einzelne Entity
export class EntityResponse extends ApiResponse<EntityDto> {
  @ApiProperty({ type: EntityDto })
  data: EntityDto;
}

// DTO für paginierte Entity-Liste
export class EntitiesData {
  @ApiProperty({
    description: 'Liste von Entities',
    type: EntityDto,
    isArray: true
  })
  items: EntityDto[];
  
  @ApiProperty({
    description: 'Gesamtzahl der verfügbaren Entities',
    type: 'number'
  })
  total: number;
}

// Response für paginierte Entity-Liste
export class EntitiesResponse extends ApiResponse<EntitiesData> {
  @ApiProperty({ type: EntitiesData })
  data: EntitiesData;
}

// Controller mit TransformInterceptor und Response-DTOs
@Controller('beispiel')
@UseInterceptors(TransformInterceptor)
export class BeispielController {
  @Get()
  @ApiOkResponse({
    description: 'Liste erfolgreich abgerufen',
    type: EntitiesResponse
  })
  async findAll(): Promise<EntitiesData> {
    const [items, total] = await this.service.findAll();
    
    // Ggf. Mapping zu DTOs
    const mappedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.entityType
    }));
    
    return { items: mappedItems, total };
  }
  
  @Get(':id')
  @ApiOkResponse({
    description: 'Entity gefunden',
    type: EntityResponse
  })
  async findOne(@Param('id') id: string): Promise<EntityDto> {
    const entity = await this.service.findOne(id);
    return {
      id: entity.id,
      name: entity.name,
      type: entity.entityType
    };
  }
} 
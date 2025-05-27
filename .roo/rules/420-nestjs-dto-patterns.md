---
description: 
globs: packages/backend/**/*.dto.ts
alwaysApply: false
---
# NestJS DTO-Patterns

## Context
- Gilt für Data Transfer Objects im Backend (`**/*.dto.ts`)
- Standardisiert die Definition und Verwendung von DTOs
- Verbessert API-Konsistenz, Validierung und Dokumentation

## Requirements

1. **Struktur und Benennung**
   - DTOs als Klassen implementieren (nicht als Interfaces oder Types)
   - Suffix `Dto` im Klassennamen verwenden
   - DTOs in eigenen Dateien mit Namensschema `*.dto.ts` definieren
   - Verwendungszweck im Namen verdeutlichen (z.B. `CreateUserDto`, `UpdateUserDto`)

2. **Organisation**
   - DTOs in einem `dto`-Verzeichnis je nach Domäne gruppieren
   - Barrel-Exporte (index.ts) für vereinfachten Import
   - Nach Entitäten oder Funktionen organisieren
   - Zusammengehörige DTOs in thematischen Unterverzeichnissen

3. **Validierung**
   - class-validator Dekoratoren für Validierungsregeln
   - class-transformer für Transformationen
   - ValidationPipe globalen für automatische Validierung
   - Aussagekräftige Fehlermeldungen in Validierungsdekoratoren

4. **Dokumentation**
   - Swagger/OpenAPI-Dekoratoren für API-Dokumentation
   - JSDoc-Kommentare für Felder und Klassen
   - Beispielwerte für API-Dokumentation
   - Beschreibungen für alle Felder und Validierungen

5. **Typverwendung**
   - Explizite Typen für alle Eigenschaften
   - Vermeidung von `any`, stattdessen spezifische Typen
   - Enum-Typen für Felder mit festgelegten Werten
   - Konsistente Verwendung von optionalen Eigenschaften

6. **Typkonvertierung**
   - `@Transform`-Dekorator für Eingabetransformation
   - Queryparameter in korrekten Datentyp konvertieren
   - Konsistente Behandlung von URL-Query-Parametern (immer Strings)
   - Standardwerte für optionale Parameter festlegen
   - Robuste Konvertierungsfunktionen für unterschiedliche Eingabewerte
   - Strikte Typprüfung nach Konvertierung
   - Boolean-Werte aus Strings wie 'true'/'false', '1'/'0' korrekt extrahieren
   - Datum-Strings in Date-Objekte konvertieren

7. **Vererbung und Wiederverwendung**
   - Basis-DTOs für gemeinsame Eigenschaften
   - Vererbung für verwandte DTOs (z.B. Create/Update)
   - Partielle Typen für verwandte DTOs
   - OmitType, PickType und PartialType für abgeleitete DTOs

8. **Versionierung**
   - Separate DTOs für verschiedene API-Versionen
   - Abwärtskompatibilität bei Änderungen
   - Migration-Strategien für Breaking Changes
   - Versionspräfixe in Verzeichnisstrukturen

9. **Sicherheit**
   - Keine sensiblen Daten in Response-DTOs
   - ExcludeProperty für sensible Felder
   - Strikte Validierung von Benutzerinput
   - Request/Response-Trennung bei DTOs

## Examples

```typescript
// Gutes Beispiel: CreateUserDto
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  MinLength, 
  MaxLength, 
  Matches,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO für die Erstellung eines neuen Benutzers.
 * Wird bei POST /users Anfragen verwendet.
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'Die E-Mail-Adresse des Benutzers',
    example: 'benutzer@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' })
  @IsNotEmpty({ message: 'E-Mail-Adresse darf nicht leer sein' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Der Anzeigename des Benutzers',
    example: 'Max Mustermann',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: 'Name muss ein Text sein' })
  @IsNotEmpty({ message: 'Name darf nicht leer sein' })
  @MinLength(3, { message: 'Name muss mindestens 3 Zeichen lang sein' })
  @MaxLength(50, { message: 'Name darf maximal 50 Zeichen lang sein' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Das Passwort des Benutzers',
    example: 'Sicheres_Passwort123!',
    format: 'password',
    minLength: 8,
  })
  @IsString({ message: 'Passwort muss ein Text sein' })
  @MinLength(8, { message: 'Passwort muss mindestens 8 Zeichen lang sein' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    {
      message: 'Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Die Telefonnummer des Benutzers (optional)',
    example: '+49123456789',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Telefonnummer muss ein Text sein' })
  @Matches(/^\+?[0-9\s]+$/, {
    message: 'Telefonnummer darf nur Ziffern, Leerzeichen und ein führendes Plus-Zeichen enthalten',
  })
  phone?: string;
}
```

```typescript
// Gutes Beispiel: Typkonvertierung von Query-Parametern in DTOs
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO für das Filtern von Datensätzen mit Typkonvertierung.
 */
export class FilterDto {
  /**
   * Gibt an, ob archivierte Einträge eingeschlossen werden sollen
   */
  @ApiPropertyOptional({
    description: 'Gibt an, ob archivierte Einträge eingeschlossen werden sollen',
    default: false,
    type: Boolean
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) {
      return true;
    }
    return false;
  })
  includeArchived?: boolean = false;

  /**
   * Maximales Alter der Einträge in Tagen
   */
  @ApiPropertyOptional({
    description: 'Maximales Alter der Einträge in Tagen',
    default: 30,
    type: Number
  })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 30 : parsed;
  })
  maxAge?: number = 30;

  /**
   * Datumsbereich für die Suche
   */
  @ApiPropertyOptional({
    description: 'Startdatum für die Suche (ISO 8601)',
    type: Date
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  startDate?: Date;
}
```

```typescript
// Gutes Beispiel: UpdateUserDto (abgeleitet von CreateUserDto)
import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UserStatus } from '../enums/user-status.enum';

/**
 * DTO für das Aktualisieren eines Benutzers.
 * Alle Felder sind optional und Password wird ausgeschlossen.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiProperty({
    description: 'Der Status des Benutzers',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus, {
    message: `Status muss einer der folgenden Werte sein: ${Object.values(UserStatus).join(', ')}`,
  })
  status?: UserStatus;
}
```

```typescript
// Gutes Beispiel: UserResponseDto
import { Exclude, Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../enums/user-status.enum';

/**
 * DTO für die Rückgabe von Benutzerinformationen an Clients.
 * Sensible Daten wie Passwort werden ausgeschlossen.
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'Die eindeutige ID des Benutzers',
    example: '5f8d0c1f8e6d4b0007b7d1e5',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Die E-Mail-Adresse des Benutzers',
    example: 'benutzer@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'Der Anzeigename des Benutzers',
    example: 'Max Mustermann',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Der Status des Benutzers',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @Expose()
  status: UserStatus;

  @ApiProperty({
    description: 'Datum der Erstellung des Benutzers',
    example: '2023-01-01T12:00:00Z',
    format: 'date-time',
  })
  @Expose()
  @Transform(({ value }) => value.toISOString())
  createdAt: Date;

  // Sensible Daten explizit ausschließen
  @Exclude()
  password: string;

  @Exclude()
  passwordResetToken: string;

  @Exclude()
  passwordResetExpires: Date;

  /**
   * Konstruktor zum Zuweisen von Entity-Daten zum DTO
   */
  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
```

```typescript
// Beispiel für komplexe Nested DTOs
import { Type } from 'class-transformer';
import { ValidateNested, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AddressDto } from './address.dto';
import { OrderItemDto } from './order-item.dto';

/**
 * DTO für die Erstellung einer Bestellung.
 */
export class CreateOrderDto {
  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Bestellung muss mindestens einen Artikel enthalten' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

```typescript
// Schlechtes Beispiel
interface UserDto {
  email: string;
  name: string;
  password: string; // Unsicher in Response-DTOs
  admin: boolean; // Keine Validierung
  createdDate?: any; // Unspezifischer Typ
}

// Probleme:
// - Kein Suffix 'Dto' in der Klasse
// - Interface statt Klasse (keine Validierungsdekoratoren möglich)
// - Keine Validierungen
// - Kein Trennung zwischen Input und Output DTOs
// - Unsichere Typisierung (any)
// - Keine Dokumentation
``` 
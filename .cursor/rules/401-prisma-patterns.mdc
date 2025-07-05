---
description: 
globs: 
alwaysApply: false
---
# Prisma ORM-Muster

## Context
- Diese Regel gilt für alle Backend-Komponenten, die mit der Prisma-Datenbank interagieren
- Betrifft sowohl Services als auch Abfragen, Transaktionen und Datenbankoperationen
- Die Implementierung folgt dem NestJS-Modul-Muster mit PrismaService

## Requirements

1. **PrismaService als Singleton**
   - Zugriff auf den Prisma-Client ausschließlich über PrismaService
   - Globale Registrierung im AppModule
   - Injection in Service-Klassen über Constructor-Dependency-Injection

2. **Schemadefinition**
   - Alle Modelle in `prisma/schema.prisma` definieren
   - Klare Beziehungen mit Relationen ausdrücken
   - Konsistente Benennung von Modellen (PascalCase) und Feldern (camelCase)
   - Default-Werte und Validierungen im Schema definieren

3. **Typsicherheit**
   - Prisma-generierte Typen für Entitäten verwenden
   - DTOs an die Prisma-Typen anpassen
   - Keine redundanten Entity-Klassen erstellen

4. **Transaktionen**
   - `prisma.$transaction` für atomare Operationen verwenden
   - Komplexe Prozesse mit mehreren Schritten in Transaktionen kapseln
   - Korrekte Fehlerbehandlung mit try/catch

5. **Abfragen und Filterung**
   - Effiziente Abfragen mit `select`, `include` und `where`
   - Paginierung mit `skip` und `take` implementieren
   - Sortierung über `orderBy` steuern
   - Alle Filter-Parameter validieren

6. **Hooks und Middleware**
   - `beforeEach` und `afterEach` Middleware für globale Logik
   - Prisma Soft-Delete über Middleware implementieren

7. **Migrations**
   - `prisma migrate dev` für Entwicklungsumgebungen
   - `prisma migrate deploy` für Produktionsumgebungen
   - Migrationen immer testen und überprüfen
   - Beschreibende Migration-Namen verwenden

8. **Testing**
   - PrismaService mocken in Unit-Tests
   - Mock-Factory für Prisma-Abfragen erstellen
   - Integrationstests mit Test-Datenbank
   - `TransactionScope` für isolierte Test-Ausführung

## Examples

### PrismaService einrichten
```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### PrismaModule
```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Service-Implementierung
```typescript
// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, where, orderBy } = params || {};
    return this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  // Beispiel für eine Transaktion
  async createUserWithProfile(
    userData: Prisma.UserCreateInput,
    profileData: Prisma.ProfileCreateInput
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userData });
      
      await tx.profile.create({
        data: {
          ...profileData,
          userId: user.id,
        },
      });
      
      return user;
    });
  }
}
```

### Pagination-Implementierung
```typescript
// src/common/services/pagination.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';

@Injectable()
export class PaginationService {
  constructor(private prisma: PrismaService) {}

  async paginatePrisma<T, K extends keyof any>(
    model: K,
    options: {
      where?: any;
      orderBy?: any;
      include?: any;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<T>> {
    const totalItems = await this.prisma[model].count({
      where: options.where
    });

    const items = await this.prisma[model].findMany({
      where: options.where,
      include: options.include,
      orderBy: options.orderBy,
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
      }
    };
  }
}
```

### Mocking für Tests
```typescript
// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

const prismaServiceMock = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(prismaServiceMock)),
};

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should find all users', async () => {
    const expectedUsers = [{ id: '1', name: 'Test User' }];
    prismaService.user.findMany.mockResolvedValue(expectedUsers);
    
    const result = await service.findAll();
    
    expect(result).toEqual(expectedUsers);
    expect(prismaService.user.findMany).toHaveBeenCalled();
  });
});
```

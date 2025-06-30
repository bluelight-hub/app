import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Globales Prisma-Modul, das den PrismaService für die gesamte Anwendung bereitstellt.
 * Da Datenbankzugriffe in der gesamten Anwendung benötigt werden,
 * ist dieses Modul als global deklariert.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

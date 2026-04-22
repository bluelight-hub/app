import { Module } from '@nestjs/common';

/**
 * Placeholder-Modul für den Eigenschutz-Infrastructure-Layer (Story 1.6).
 *
 * Dieses Modul ist bewusst leer: Story 1.6 legt nur das Feature-Slice-Gerüst
 * gemäß Architecture §B an. Story 2.1+ füllt es schrittweise mit Prisma-
 * Repositories, Projections und DI-Tokens, wenn die ersten fachlichen
 * Konsumenten (z. B. Gefährdungsbeurteilung) entstehen.
 *
 * Bis dahin wird das Modul **nicht** in `AppModule` importiert — es hat keine
 * Konsumenten und sein Import würde einen toten Knoten im DI-Graph erzeugen.
 */
@Module({})
export class EigenschutzInfrastructureModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';

import { CreateBefehlsgeberVorschlagHandler } from './commands/create-befehlsgeber-vorschlag/create-befehlsgeber-vorschlag.handler';
import { UpdateBefehlsgeberVorschlagHandler } from './commands/update-befehlsgeber-vorschlag/update-befehlsgeber-vorschlag.handler';
import { DeleteBefehlsgeberVorschlagHandler } from './commands/deactivate-befehlsgeber-vorschlag/deactivate-befehlsgeber-vorschlag.handler';
import { GetAllBefehlsgeberVorschlaegeHandler } from './queries/get-all-befehlsgeber-vorschlaege/get-all-befehlsgeber-vorschlaege.handler';

@Module({
  imports: [PrismaModule],
  providers: [CreateBefehlsgeberVorschlagHandler, UpdateBefehlsgeberVorschlagHandler, DeleteBefehlsgeberVorschlagHandler, GetAllBefehlsgeberVorschlaegeHandler],
  exports: [CreateBefehlsgeberVorschlagHandler, UpdateBefehlsgeberVorschlagHandler, DeleteBefehlsgeberVorschlagHandler, GetAllBefehlsgeberVorschlaegeHandler],
})
export class BefehlsgeberVorschlagApplicationModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserController } from './user.controller';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { UserRepository } from './user.repository';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [UserManagementController, UserController],
  providers: [UserManagementService, UserRepository],
  exports: [UserManagementService],
})
export class UserManagementModule {}

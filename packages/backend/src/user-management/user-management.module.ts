import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { UserRepository } from './user.repository';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [UserManagementController],
  providers: [UserManagementService, UserRepository],
})
export class UserManagementModule {}

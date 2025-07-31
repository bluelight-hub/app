import { Module } from '@nestjs/common';
import { SecurityLogService } from '@/security/services/security-log.service';
import { createMockSecurityLogService } from '@/test/mocks/security-log.service.mock';

/**
 * Test module that provides a mock SecurityLogService
 * Use this in tests instead of the real SecurityLogModule to avoid Redis/BullMQ dependencies
 */
@Module({
  providers: [
    {
      provide: SecurityLogService,
      useValue: createMockSecurityLogService(),
    },
  ],
  exports: [SecurityLogService],
})
export class SecurityLogTestModule {}

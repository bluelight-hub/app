import { SecurityLogService } from '@/security/services/security-log.service';
import { createMockSecurityLogService } from '@/test/mocks/security-log.service.mock';

/**
 * Provides common test providers for auth-related tests
 */
export const getAuthTestProviders = () => [
  {
    provide: SecurityLogService,
    useValue: createMockSecurityLogService(),
  },
];

/**
 * Get a provider configuration for SecurityLogService
 */
export const getSecurityLogServiceProvider = () => ({
  provide: SecurityLogService,
  useValue: createMockSecurityLogService(),
});

import {
  defaultAuditInterceptorConfig,
  createAuditInterceptorConfig,
  AuditInterceptorConfig,
} from '../audit-interceptor.config';
import { AuditAction, AuditSeverityExtended as AuditSeverity } from '../../types/audit.types';

describe('Audit Interceptor Config', () => {
  describe('defaultAuditInterceptorConfig', () => {
    it('should have all required properties', () => {
      expect(defaultAuditInterceptorConfig).toHaveProperty('excludePaths');
      expect(defaultAuditInterceptorConfig).toHaveProperty('includePaths');
      expect(defaultAuditInterceptorConfig).toHaveProperty('sensitiveFields');
      expect(defaultAuditInterceptorConfig).toHaveProperty('resourceMapping');
      expect(defaultAuditInterceptorConfig).toHaveProperty('actionMapping');
      expect(defaultAuditInterceptorConfig).toHaveProperty('severityMapping');
      expect(defaultAuditInterceptorConfig).toHaveProperty('maxBodySize');
      expect(defaultAuditInterceptorConfig).toHaveProperty('logStackTraces');
    });

    it('should have correct exclude paths', () => {
      const { excludePaths } = defaultAuditInterceptorConfig;
      expect(excludePaths).toContain('/health');
      expect(excludePaths).toContain('/metrics');
      expect(excludePaths).toContain('/api-docs');
      expect(excludePaths).toContain('/swagger');
      expect(excludePaths).toContain('/favicon.ico');
      expect(excludePaths).toContain('/public');
    });

    it('should have correct include paths', () => {
      const { includePaths } = defaultAuditInterceptorConfig;
      expect(includePaths).toContain('/admin');
      expect(includePaths).toContain('/api/admin');
    });

    it('should have comprehensive sensitive fields list', () => {
      const { sensitiveFields } = defaultAuditInterceptorConfig;

      // Authentication related
      expect(sensitiveFields).toContain('password');
      expect(sensitiveFields).toContain('token');
      expect(sensitiveFields).toContain('authorization');
      expect(sensitiveFields).toContain('refresh_token');
      expect(sensitiveFields).toContain('refreshToken');
      expect(sensitiveFields).toContain('access_token');
      expect(sensitiveFields).toContain('accessToken');

      // Security related
      expect(sensitiveFields).toContain('secret');
      expect(sensitiveFields).toContain('apiKey');
      expect(sensitiveFields).toContain('api_key');
      expect(sensitiveFields).toContain('private_key');
      expect(sensitiveFields).toContain('privateKey');

      // Financial related
      expect(sensitiveFields).toContain('creditCard');
      expect(sensitiveFields).toContain('credit_card');
      expect(sensitiveFields).toContain('bank_account');
      expect(sensitiveFields).toContain('cvv');
      expect(sensitiveFields).toContain('pin');

      // Personal data
      expect(sensitiveFields).toContain('ssn');
      expect(sensitiveFields).toContain('social_security_number');

      // Other
      expect(sensitiveFields).toContain('cookie');
    });

    it('should have correct resource mappings', () => {
      const { resourceMapping } = defaultAuditInterceptorConfig;

      expect(resourceMapping['/admin/users']).toBe('user');
      expect(resourceMapping['/admin/groups']).toBe('group');
      expect(resourceMapping['/admin/roles']).toBe('role');
      expect(resourceMapping['/admin/permissions']).toBe('permission');
      expect(resourceMapping['/admin/audit-logs']).toBe('audit_log');
      expect(resourceMapping['/admin/settings']).toBe('settings');
      expect(resourceMapping['/admin/templates']).toBe('template');
      expect(resourceMapping['/admin/organizations']).toBe('organization');
      expect(resourceMapping['/admin/sessions']).toBe('session');
      expect(resourceMapping['/admin/backups']).toBe('backup');
      expect(resourceMapping['/admin/reports']).toBe('report');
      expect(resourceMapping['/admin/system']).toBe('system');
      expect(resourceMapping['/admin/database']).toBe('database');
      expect(resourceMapping['/admin/monitoring']).toBe('monitoring');
    });

    it('should have correct action mappings', () => {
      const { actionMapping } = defaultAuditInterceptorConfig;

      expect(actionMapping['POST /admin/users/login']).toBe(AuditAction.LOGIN);
      expect(actionMapping['POST /admin/users/logout']).toBe(AuditAction.LOGOUT);
      expect(actionMapping['POST /admin/users/*/block']).toBe(AuditAction.BLOCK);
      expect(actionMapping['POST /admin/users/*/unblock']).toBe(AuditAction.UNBLOCK);
      expect(actionMapping['POST /admin/*/approve']).toBe(AuditAction.APPROVE);
      expect(actionMapping['POST /admin/*/reject']).toBe(AuditAction.REJECT);
      expect(actionMapping['POST /admin/*/export']).toBe(AuditAction.EXPORT);
      expect(actionMapping['POST /admin/*/import']).toBe(AuditAction.IMPORT);
      expect(actionMapping['POST /admin/backups/restore']).toBe(AuditAction.RESTORE);
    });

    it('should have correct severity mappings for all actions', () => {
      const { severityMapping } = defaultAuditInterceptorConfig;

      // Low severity
      expect(severityMapping[AuditAction.VIEW]).toBe(AuditSeverity.LOW);
      expect(severityMapping[AuditAction.LOGIN]).toBe(AuditSeverity.LOW);
      expect(severityMapping[AuditAction.LOGOUT]).toBe(AuditSeverity.LOW);
      expect(severityMapping[AuditAction.OTHER]).toBe(AuditSeverity.LOW);

      // Medium severity
      expect(severityMapping[AuditAction.CREATE]).toBe(AuditSeverity.MEDIUM);
      expect(severityMapping[AuditAction.UPDATE]).toBe(AuditSeverity.MEDIUM);
      expect(severityMapping[AuditAction.EXPORT]).toBe(AuditSeverity.MEDIUM);
      expect(severityMapping[AuditAction.UNBLOCK]).toBe(AuditSeverity.MEDIUM);
      expect(severityMapping[AuditAction.BACKUP]).toBe(AuditSeverity.MEDIUM);
      expect(severityMapping[AuditAction.BULK_OPERATION]).toBe(AuditSeverity.MEDIUM);

      // High severity
      expect(severityMapping[AuditAction.DELETE]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.FAILED_LOGIN]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.IMPORT]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.APPROVE]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.REJECT]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.BLOCK]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.GRANT_PERMISSION]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.REVOKE_PERMISSION]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.CHANGE_ROLE]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.RESTORE]).toBe(AuditSeverity.HIGH);
      expect(severityMapping[AuditAction.CONFIG_CHANGE]).toBe(AuditSeverity.HIGH);
    });

    it('should have correct maxBodySize', () => {
      expect(defaultAuditInterceptorConfig.maxBodySize).toBe(10 * 1024); // 10KB
    });

    it('should set logStackTraces based on NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;

      // Test development environment
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const devConfig = require('../audit-interceptor.config').defaultAuditInterceptorConfig;
      expect(devConfig.logStackTraces).toBe(true);

      // Test production environment
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const prodConfig = require('../audit-interceptor.config').defaultAuditInterceptorConfig;
      expect(prodConfig.logStackTraces).toBe(false);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createAuditInterceptorConfig', () => {
    it('should return default config when no custom config provided', () => {
      const config = createAuditInterceptorConfig();
      expect(config).toEqual(defaultAuditInterceptorConfig);
    });

    it('should merge exclude paths', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        excludePaths: ['/custom-exclude'],
      };

      const config = createAuditInterceptorConfig(customConfig);

      expect(config.excludePaths).toContain('/health'); // Default
      expect(config.excludePaths).toContain('/custom-exclude'); // Custom
      expect(config.excludePaths.length).toBe(
        defaultAuditInterceptorConfig.excludePaths.length + 1,
      );
    });

    it('should merge include paths', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        includePaths: ['/custom-include'],
      };

      const config = createAuditInterceptorConfig(customConfig);

      expect(config.includePaths).toContain('/admin'); // Default
      expect(config.includePaths).toContain('/custom-include'); // Custom
      expect(config.includePaths.length).toBe(
        defaultAuditInterceptorConfig.includePaths.length + 1,
      );
    });

    it('should merge sensitive fields', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        sensitiveFields: ['custom_secret', 'my_private_data'],
      };

      const config = createAuditInterceptorConfig(customConfig);

      expect(config.sensitiveFields).toContain('password'); // Default
      expect(config.sensitiveFields).toContain('custom_secret'); // Custom
      expect(config.sensitiveFields).toContain('my_private_data'); // Custom
      expect(config.sensitiveFields.length).toBe(
        defaultAuditInterceptorConfig.sensitiveFields.length + 2,
      );
    });

    it('should merge resource mappings', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        resourceMapping: {
          '/custom/endpoint': 'custom_resource',
          '/admin/users': 'custom_user', // Override existing
        },
      };

      const config = createAuditInterceptorConfig(customConfig);

      expect(config.resourceMapping['/custom/endpoint']).toBe('custom_resource');
      expect(config.resourceMapping['/admin/users']).toBe('custom_user'); // Overridden
      expect(config.resourceMapping['/admin/groups']).toBe('group'); // Default preserved
    });

    it('should merge action mappings', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        actionMapping: {
          'POST /custom/action': AuditAction.OTHER,
          'POST /admin/users/login': AuditAction.OTHER, // Override existing
        },
      };

      const config = createAuditInterceptorConfig(customConfig);

      expect(config.actionMapping['POST /custom/action']).toBe(AuditAction.OTHER);
      expect(config.actionMapping['POST /admin/users/login']).toBe(AuditAction.OTHER); // Overridden
      expect(config.actionMapping['POST /admin/users/logout']).toBe(AuditAction.LOGOUT); // Default preserved
    });

    it('should merge severity mappings', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        severityMapping: {
          [AuditAction.VIEW]: AuditSeverity.HIGH, // Override
          [AuditAction.OTHER]: AuditSeverity.MEDIUM, // Override
        } as Record<AuditAction, AuditSeverity>,
      };

      const config = createAuditInterceptorConfig(customConfig);

      expect(config.severityMapping[AuditAction.VIEW]).toBe(AuditSeverity.HIGH); // Overridden
      expect(config.severityMapping[AuditAction.OTHER]).toBe(AuditSeverity.MEDIUM); // Overridden
      expect(config.severityMapping[AuditAction.CREATE]).toBe(AuditSeverity.MEDIUM); // Default preserved
    });

    it('should override scalar properties', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        maxBodySize: 20 * 1024, // 20KB
        logStackTraces: true,
      };

      const config = createAuditInterceptorConfig(customConfig);

      expect(config.maxBodySize).toBe(20 * 1024);
      expect(config.logStackTraces).toBe(true);
    });

    it('should handle empty arrays in custom config', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        excludePaths: [],
        includePaths: [],
        sensitiveFields: [],
      };

      const config = createAuditInterceptorConfig(customConfig);

      // Should still have default values
      expect(config.excludePaths).toEqual(defaultAuditInterceptorConfig.excludePaths);
      expect(config.includePaths).toEqual(defaultAuditInterceptorConfig.includePaths);
      expect(config.sensitiveFields).toEqual(defaultAuditInterceptorConfig.sensitiveFields);
    });

    it('should handle undefined values in custom config', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        excludePaths: undefined,
        resourceMapping: undefined,
        maxBodySize: undefined,
      };

      const config = createAuditInterceptorConfig(customConfig);

      // Arrays are handled separately, so they keep defaults
      expect(config.excludePaths).toEqual(defaultAuditInterceptorConfig.excludePaths);
      expect(config.resourceMapping).toEqual(defaultAuditInterceptorConfig.resourceMapping);
      // Scalar values with undefined will override the default due to spread operator
      expect(config.maxBodySize).toBeUndefined();
    });

    it('should create complete config with all custom values', () => {
      const customConfig: Partial<AuditInterceptorConfig> = {
        excludePaths: ['/test'],
        includePaths: ['/api/v2'],
        sensitiveFields: ['test_field'],
        resourceMapping: { '/test': 'test_resource' },
        actionMapping: { 'GET /test': AuditAction.VIEW },
        severityMapping: { [AuditAction.OTHER]: AuditSeverity.HIGH } as Record<
          AuditAction,
          AuditSeverity
        >,
        maxBodySize: 5 * 1024,
        logStackTraces: false,
      };

      const config = createAuditInterceptorConfig(customConfig);

      // Arrays should be merged
      expect(config.excludePaths).toContain('/health');
      expect(config.excludePaths).toContain('/test');

      expect(config.includePaths).toContain('/admin');
      expect(config.includePaths).toContain('/api/v2');

      expect(config.sensitiveFields).toContain('password');
      expect(config.sensitiveFields).toContain('test_field');

      // Objects should be merged
      expect(config.resourceMapping['/admin/users']).toBe('user');
      expect(config.resourceMapping['/test']).toBe('test_resource');

      expect(config.actionMapping['POST /admin/users/login']).toBe(AuditAction.LOGIN);
      expect(config.actionMapping['GET /test']).toBe(AuditAction.VIEW);

      expect(config.severityMapping[AuditAction.CREATE]).toBe(AuditSeverity.MEDIUM);
      expect(config.severityMapping[AuditAction.OTHER]).toBe(AuditSeverity.HIGH);

      // Scalar values should be overridden
      expect(config.maxBodySize).toBe(5 * 1024);
      expect(config.logStackTraces).toBe(false);
    });
  });

  describe('Config Validation', () => {
    it('should have all audit actions mapped to severity', () => {
      const allActions = Object.values(AuditAction);
      const { severityMapping } = defaultAuditInterceptorConfig;

      allActions.forEach((action) => {
        expect(severityMapping).toHaveProperty(action);
        expect(Object.values(AuditSeverity)).toContain(severityMapping[action]);
      });
    });

    it('should have valid severity values', () => {
      const { severityMapping } = defaultAuditInterceptorConfig;
      const validSeverities = Object.values(AuditSeverity);

      Object.values(severityMapping).forEach((severity) => {
        expect(validSeverities).toContain(severity);
      });
    });

    it('should have unique sensitive field entries', () => {
      const { sensitiveFields } = defaultAuditInterceptorConfig;
      const uniqueFields = [...new Set(sensitiveFields)];

      expect(sensitiveFields.length).toBe(uniqueFields.length);
    });

    it('should have positive maxBodySize', () => {
      expect(defaultAuditInterceptorConfig.maxBodySize).toBeGreaterThan(0);
    });

    it('should handle REVOKE_PERMISSION action correctly', () => {
      const { severityMapping } = defaultAuditInterceptorConfig;

      // REVOKE_PERMISSION should have the same severity as GRANT_PERMISSION
      expect(severityMapping[AuditAction.REVOKE_PERMISSION]).toBe(
        severityMapping[AuditAction.GRANT_PERMISSION],
      );
      expect(severityMapping[AuditAction.REVOKE_PERMISSION]).toBe(AuditSeverity.HIGH);
    });
  });
});

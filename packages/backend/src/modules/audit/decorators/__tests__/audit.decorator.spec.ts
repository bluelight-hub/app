import 'reflect-metadata';
import {
  Audit,
  NoAudit,
  AuditLogin,
  AuditLogout,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditView,
  AuditExport,
  AuditImport,
  AuditCritical,
  AUDIT_ACTION_KEY,
  AUDIT_SEVERITY_KEY,
  AUDIT_RESOURCE_TYPE_KEY,
  AUDIT_CONTEXT_KEY,
  SKIP_AUDIT_KEY,
} from '../audit.decorator';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

describe('Audit Decorators', () => {
  describe('Audit', () => {
    it('should set action metadata when action is provided', () => {
      class TestClass {
        @Audit({ action: AuditActionType.CREATE })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod);
      expect(metadata).toBe(AuditActionType.CREATE);
    });

    it('should set severity metadata when severity is provided', () => {
      class TestClass {
        @Audit({ severity: AuditSeverity.HIGH })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod);
      expect(metadata).toBe(AuditSeverity.HIGH);
    });

    it('should set resource type metadata when resourceType is provided', () => {
      class TestClass {
        @Audit({ resourceType: 'user' })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod);
      expect(metadata).toBe('user');
    });

    it('should set context metadata when context is provided', () => {
      const context = { foo: 'bar', baz: 123 };

      class TestClass {
        @Audit({ context })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(AUDIT_CONTEXT_KEY, TestClass.prototype.testMethod);
      expect(metadata).toEqual(context);
    });

    it('should include description in context when provided', () => {
      const description = 'Test description';

      class TestClass {
        @Audit({ description })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(AUDIT_CONTEXT_KEY, TestClass.prototype.testMethod);
      expect(metadata).toEqual({ description });
    });

    it('should merge context and description when both are provided', () => {
      const context = { foo: 'bar' };
      const description = 'Test description';

      class TestClass {
        @Audit({ context, description })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(AUDIT_CONTEXT_KEY, TestClass.prototype.testMethod);
      expect(metadata).toEqual({ foo: 'bar', description });
    });

    it('should set multiple metadata values when multiple options are provided', () => {
      const options = {
        action: AuditActionType.UPDATE,
        severity: AuditSeverity.MEDIUM,
        resourceType: 'post',
        context: { version: 2 },
      };

      class TestClass {
        @Audit(options)
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.UPDATE,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.MEDIUM,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'post',
      );
      expect(Reflect.getMetadata(AUDIT_CONTEXT_KEY, TestClass.prototype.testMethod)).toEqual({
        version: 2,
      });
    });

    it('should work with empty options', () => {
      class TestClass {
        @Audit()
        testMethod() {
          return 'test';
        }
      }

      // Should not throw and should not set any metadata
      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBeUndefined();
      expect(
        Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod),
      ).toBeUndefined();
    });

    it('should work on class level', () => {
      @Audit({ action: AuditActionType.READ })
      class TestClass {
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass);
      expect(metadata).toBe(AuditActionType.READ);
    });
  });

  describe('NoAudit', () => {
    it('should set skip audit metadata to true', () => {
      class TestClass {
        @NoAudit()
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(SKIP_AUDIT_KEY, TestClass.prototype.testMethod);
      expect(metadata).toBe(true);
    });
  });

  describe('AuditLogin', () => {
    it('should set correct metadata for login action', () => {
      class TestClass {
        @AuditLogin()
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.LOGIN,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.LOW,
      );
    });

    it('should include context when provided', () => {
      const context = { ip: '192.168.1.1' };

      class TestClass {
        @AuditLogin(context)
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_CONTEXT_KEY, TestClass.prototype.testMethod)).toEqual(
        context,
      );
    });
  });

  describe('AuditLogout', () => {
    it('should set correct metadata for logout action', () => {
      class TestClass {
        @AuditLogout()
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.LOGOUT,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.LOW,
      );
    });
  });

  describe('AuditCreate', () => {
    it('should set correct metadata for create action', () => {
      class TestClass {
        @AuditCreate('user')
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.CREATE,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.MEDIUM,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'user',
      );
    });

    it('should include context when provided', () => {
      const context = { bulk: true };

      class TestClass {
        @AuditCreate('user', context)
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_CONTEXT_KEY, TestClass.prototype.testMethod)).toEqual(
        context,
      );
    });
  });

  describe('AuditUpdate', () => {
    it('should set correct metadata for update action', () => {
      class TestClass {
        @AuditUpdate('post')
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.UPDATE,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.MEDIUM,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'post',
      );
    });
  });

  describe('AuditDelete', () => {
    it('should set correct metadata for delete action', () => {
      class TestClass {
        @AuditDelete('comment')
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.DELETE,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.HIGH,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'comment',
      );
    });
  });

  describe('AuditView', () => {
    it('should set correct metadata for view action', () => {
      class TestClass {
        @AuditView('profile')
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.READ,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.LOW,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'profile',
      );
    });
  });

  describe('AuditExport', () => {
    it('should set correct metadata for export action', () => {
      class TestClass {
        @AuditExport('report')
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.EXPORT,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.MEDIUM,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'report',
      );
    });
  });

  describe('AuditImport', () => {
    it('should set correct metadata for import action', () => {
      class TestClass {
        @AuditImport('data')
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.IMPORT,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.HIGH,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'data',
      );
    });
  });

  describe('AuditCritical', () => {
    it('should set correct metadata for critical action', () => {
      const description = 'Deleting all user data';

      class TestClass {
        @AuditCritical(AuditActionType.DELETE, 'system', description)
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.DELETE,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.HIGH,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'system',
      );
      expect(Reflect.getMetadata(AUDIT_CONTEXT_KEY, TestClass.prototype.testMethod)).toEqual({
        description,
      });
    });
  });

  describe('Integration with controller methods', () => {
    it('should work with multiple decorators on the same method', () => {
      class TestClass {
        @Audit({ action: AuditActionType.UPDATE })
        @Audit({ severity: AuditSeverity.HIGH })
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.UPDATE,
      );
      expect(Reflect.getMetadata(AUDIT_SEVERITY_KEY, TestClass.prototype.testMethod)).toBe(
        AuditSeverity.HIGH,
      );
    });

    it('should handle stacked decorators', () => {
      class TestClass {
        @AuditUpdate('user')
        @Audit({ context: { important: true } })
        testMethod() {
          return 'test';
        }
      }

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, TestClass.prototype.testMethod)).toBe(
        AuditActionType.UPDATE,
      );
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, TestClass.prototype.testMethod)).toBe(
        'user',
      );
      expect(Reflect.getMetadata(AUDIT_CONTEXT_KEY, TestClass.prototype.testMethod)).toEqual({
        important: true,
      });
    });
  });

  describe('Real-world usage patterns', () => {
    it('should work with controller class and methods', () => {
      @Audit({ resourceType: 'system' })
      class AdminController {
        @AuditView('users')
        listUsers() {
          return [];
        }

        @AuditCreate('user')
        createUser() {
          return { id: 1 };
        }

        @AuditDelete('user')
        @Audit({ context: { reason: 'account violation' } })
        deleteUser() {
          return true;
        }

        @NoAudit()
        healthCheck() {
          return { status: 'ok' };
        }
      }

      // Class-level metadata
      expect(Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, AdminController)).toBe('system');

      // Method-level metadata
      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, AdminController.prototype.listUsers)).toBe(
        AuditActionType.READ,
      );
      expect(
        Reflect.getMetadata(AUDIT_RESOURCE_TYPE_KEY, AdminController.prototype.listUsers),
      ).toBe('users');

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, AdminController.prototype.createUser)).toBe(
        AuditActionType.CREATE,
      );

      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, AdminController.prototype.deleteUser)).toBe(
        AuditActionType.DELETE,
      );
      expect(Reflect.getMetadata(AUDIT_CONTEXT_KEY, AdminController.prototype.deleteUser)).toEqual({
        reason: 'account violation',
      });

      expect(Reflect.getMetadata(SKIP_AUDIT_KEY, AdminController.prototype.healthCheck)).toBe(true);
    });
  });
});

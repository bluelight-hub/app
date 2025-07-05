import * as decorators from './index';

describe('Decorators Index', () => {
  it('should export all decorators', () => {
    // Check that all decorators are exported
    expect(decorators.Public).toBeDefined();
    expect(decorators.IS_PUBLIC_KEY).toBeDefined();
    expect(decorators.Roles).toBeDefined();
    expect(decorators.ROLES_KEY).toBeDefined();
    expect(decorators.RequirePermissions).toBeDefined();
    expect(decorators.PERMISSIONS_KEY).toBeDefined();
    expect(decorators.CurrentUser).toBeDefined();
  });

  it('should export functions for decorators', () => {
    // Check that decorators are functions
    expect(typeof decorators.Public).toBe('function');
    expect(typeof decorators.Roles).toBe('function');
    expect(typeof decorators.RequirePermissions).toBe('function');
    expect(typeof decorators.CurrentUser).toBe('function');
  });

  it('should export string constants', () => {
    // Check that constants are strings
    expect(typeof decorators.IS_PUBLIC_KEY).toBe('string');
    expect(typeof decorators.ROLES_KEY).toBe('string');
    expect(typeof decorators.PERMISSIONS_KEY).toBe('string');
  });
});

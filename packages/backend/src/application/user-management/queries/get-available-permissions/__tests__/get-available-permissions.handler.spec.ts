import { GetAvailablePermissionsQueryHandler } from '../get-available-permissions.handler';
import { GetAvailablePermissionsQuery } from '../get-available-permissions.query';

describe('GetAvailablePermissionsQueryHandler', () => {
  let handler: GetAvailablePermissionsQueryHandler;

  beforeEach(() => {
    handler = new GetAvailablePermissionsQueryHandler();
  });

  it('sollte alle verfuegbaren Permission-Domains zurueckgeben', async () => {
    const result = await handler.execute(new GetAvailablePermissionsQuery());

    expect(result.isSuccess).toBe(true);
    const permissions = result.value!;
    expect(permissions.length).toBeGreaterThanOrEqual(6);

    const domains = permissions.map((p) => p.domain);
    expect(domains).toContain('nav');
    expect(domains).toContain('einsatz');
    expect(domains).toContain('user');
    expect(domains).toContain('fahrzeug');
    expect(domains).toContain('dienst');
    expect(domains).toContain('etb');
  });

  it('sollte fuer jede Domain Actions und Beschreibung enthalten', async () => {
    const result = await handler.execute(new GetAvailablePermissionsQuery());
    const permissions = result.value!;

    for (const perm of permissions) {
      expect(perm.domain).toBeDefined();
      expect(perm.actions.length).toBeGreaterThan(0);
      expect(perm.description).toBeDefined();
      expect(perm.description.length).toBeGreaterThan(0);
    }
  });

  it('sollte nav-Domain mit allen Navigationsbereichen enthalten', async () => {
    const result = await handler.execute(new GetAvailablePermissionsQuery());
    const navDomain = result.value!.find((p) => p.domain === 'nav');

    expect(navDomain).toBeDefined();
    expect(navDomain!.actions).toContain('ueberblick');
    expect(navDomain!.actions).toContain('stammdaten');
    expect(navDomain!.actions).toContain('berechtigungen');
    expect(navDomain!.actions).toContain('integrationen');
  });
});

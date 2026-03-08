// @ts-nocheck
import { BefehlRollenGuard } from '../befehl-rollen.guard';

describe('BefehlRollenGuard', () => {
  let guard: BefehlRollenGuard;

  beforeEach(() => {
    guard = new BefehlRollenGuard();
  });

  it('canActivate gibt immer true zurück (Passthrough)', () => {
    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: { userId: 'user-1' } }),
      }),
    };

    const result = guard.canActivate(mockContext as Parameters<BefehlRollenGuard['canActivate']>[0]);

    expect(result).toBe(true);
  });
});

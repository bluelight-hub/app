import type { CanActivate } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { EigenschutzHealthController } from '../eigenschutz-health.controller';

describe('EigenschutzHealthController', () => {
  interface TestSetup {
    controller: EigenschutzHealthController;
    jwtCanActivate: jest.Mock;
  }

  async function createSetup(options: { jwtResult?: boolean } = {}): Promise<TestSetup> {
    const jwtCanActivate = jest.fn().mockReturnValue(options.jwtResult ?? true);

    const mockJwtGuard: CanActivate = { canActivate: jwtCanActivate };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EigenschutzHealthController],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    return {
      controller: module.get(EigenschutzHealthController),
      jwtCanActivate,
    };
  }

  it('liefert { status: "ready" } ohne Einsatz-Rollenprüfung', async () => {
    const { controller } = await createSetup();

    await expect(controller.getHealth()).resolves.toEqual({ status: 'ready' });
  });

  it('trägt nur JwtAuthGuard auf dem Controller', () => {
    const guards = Reflect.getMetadata('__guards__', EigenschutzHealthController) as unknown[];

    expect(guards).toBeDefined();
    expect(guards).toHaveLength(1);
    expect(guards[0]).toBe(JwtAuthGuard);
  });
});

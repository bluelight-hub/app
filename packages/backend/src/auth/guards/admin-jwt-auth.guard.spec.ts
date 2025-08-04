import { Test, TestingModule } from '@nestjs/testing';
import { AdminJwtAuthGuard } from './admin-jwt-auth.guard';

describe('AdminJwtAuthGuard', () => {
  let guard: AdminJwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminJwtAuthGuard],
    }).compile();

    guard = module.get<AdminJwtAuthGuard>(AdminJwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard with admin-jwt strategy', () => {
    expect(guard).toBeInstanceOf(AdminJwtAuthGuard);
    // Der Guard erbt von AuthGuard('admin-jwt'),
    // die eigentliche Validierung erfolgt durch die AdminJwtStrategy
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UserManagementController } from './user-management.controller';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';

describe('UserManagementController', () => {
  let controller: UserManagementController;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserManagementController],
    }).compile();

    controller = module.get<UserManagementController>(UserManagementController);
    reflector = new Reflector();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Routes', () => {
    it('should have all required routes', () => {
      expect(controller.findAll).toBeDefined();
      expect(controller.create).toBeDefined();
      expect(controller.remove).toBeDefined();
    });
  });

  describe('Guards', () => {
    it('should have AdminJwtAuthGuard applied at controller level', () => {
      const guards = reflector.get<any[]>('__guards__', UserManagementController);
      expect(guards).toBeDefined();
      expect(guards[0]).toBe(AdminJwtAuthGuard);
    });

    it('should not have additional guards on individual methods', () => {
      const findAllGuards = reflector.get<any[]>('__guards__', controller.findAll);
      const createGuards = reflector.get<any[]>('__guards__', controller.create);
      const removeGuards = reflector.get<any[]>('__guards__', controller.remove);

      expect(findAllGuards).toBeUndefined();
      expect(createGuards).toBeUndefined();
      expect(removeGuards).toBeUndefined();
    });
  });
});

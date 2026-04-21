import 'reflect-metadata';
import { AuthModule } from '@/modules/auth/auth.module';
import { PushNotificationsModule as PushNotificationsInfrastructureModule } from '@infrastructure/push-notifications/push-notifications.module';
import { PushNotificationsModule } from '../push-notifications.module';
import { PushSubscriptionController } from '../push-subscription.controller';

describe('PushNotificationsModule (HTTP wiring)', () => {
  it('declares PushSubscriptionController', () => {
    const controllers = Reflect.getMetadata('controllers', PushNotificationsModule);
    expect(controllers).toContain(PushSubscriptionController);
  });

  it('imports AuthModule and the infrastructure PushNotifications module', () => {
    const imports = Reflect.getMetadata('imports', PushNotificationsModule);
    expect(imports).toEqual(expect.arrayContaining([AuthModule, PushNotificationsInfrastructureModule]));
  });
});

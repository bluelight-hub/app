import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { TestAppFactory } from '../utils/test-app.factory';
import { TestDbUtils } from '../utils/test-db.utils';

describe('Auth Register Validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await TestAppFactory.create();
  });

  afterAll(async () => {
    await TestAppFactory.close();
  });

  beforeEach(async () => {
    await TestDbUtils.cleanDatabase();
  });

  describe('POST /api/auth/register - Validation Errors', () => {
    it('should return 400 for missing username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('username must be a string');
    });

    it('should return 400 for empty username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: '' })
        .expect(400);

      expect(response.body.message).toContain('Benutzername muss mindestens 3 Zeichen lang sein');
    });

    it('should return 400 for username too short (< 3 chars)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: 'ab' })
        .expect(400);

      expect(response.body.message).toContain('Benutzername muss mindestens 3 Zeichen lang sein');
    });

    it('should return 400 for username too long (> 30 chars)', async () => {
      const username = 'a'.repeat(31);

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username })
        .expect(400);

      expect(response.body.message).toContain('Benutzername darf maximal 30 Zeichen lang sein');
    });

    it('should return 400 for invalid username characters', async () => {
      const invalidUsernames = [
        'user@name',
        'user name',
        'user!name',
        'user#name',
        'user$name',
        'üser',
        '用户',
      ];

      for (const username of invalidUsernames) {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ username })
          .expect(400);

        expect(response.body.message).toContain(
          'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten',
        );
      }
    });

    it('should accept valid username formats', async () => {
      const validUsernames = ['user123', 'user_name', 'user-name', 'User_Name-123', 'ABC', '123'];

      for (const username of validUsernames) {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ username })
          .expect(201);

        expect(response.body.user.username).toBe(username);
        await TestDbUtils.cleanDatabase(); // Cleanup for next test
      }
    });

    it('should return 400 for additional non-whitelisted fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'valid_user',
          password: 'should_not_be_here',
          role: 'ADMIN',
        })
        .expect(400);

      expect(response.body.message).toContain('property password should not exist');
    });
  });
});

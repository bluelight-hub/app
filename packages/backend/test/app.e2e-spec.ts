import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { TestAppFactory } from './utils/test-app.factory';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Erstelle Test-App (Datenbank wird automatisch im globalen Setup gestartet)
    app = await TestAppFactory.create();
  });

  afterAll(async () => {
    await TestAppFactory.close();
  });

  describe('Root', () => {
    it('/ (GET) should return API info', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Bluelight Hub API');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('endpoints');
        });
    });
  });
});

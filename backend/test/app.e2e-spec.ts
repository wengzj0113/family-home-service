import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as supertest from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import { TestAppModule } from './test-app.module';

process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqljs';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '7d';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return supertest(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('name');
        expect(res.body.name).toBe('Family Home Service');
      });
  });

  it('/health (GET)', () => {
    return supertest(app.getHttpServer()).get('/health').expect(200);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    notification_config: { create: jest.fn() },
  };
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    jest.clearAllMocks();
    // AppController usa Prisma para init-demo-data: sin este doble el módulo no se puede crear.
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('GET / responde (comprobación de que el servidor está vivo)', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });

  it('init-demo-data no crea nada en producción', async () => {
    process.env.NODE_ENV = 'production';

    await expect(appController.initDemoData()).resolves.toEqual({
      message: 'Not available in production',
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

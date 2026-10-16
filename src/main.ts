import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { HttpAdapterHost } from '@nestjs/core';
import { requestLog, SafeExceptionFilter } from './common/safe-logging';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Demo web (carpeta public/ en la raíz del proyecto, tanto en local como en Render)
  app.useStaticAssets(join(process.cwd(), 'public'));

  // La app móvil no necesita CORS; esto es solo para webs en otros dominios.
  // Orígenes extra separados por comas en la variable CORS_ORIGINS.
  const extraOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: [
      'http://radiant-bunny-ee1134.netlify.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      ...extraOrigins,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Logs sin datos personales (ver common/safe-logging.ts)
  app.use(requestLog);
  app.useGlobalFilters(new SafeExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  // Swagger configuration
  const swaggerPath = 'api';
  app.use(`/${swaggerPath}`, (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('Supplement Tracking API')
    .setDescription('API completa para gestión de suplementos y seguimiento de tomas')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerPath, app, document, {
    customCss: '.swagger-ui .topbar { display: none } .swagger-ui { font-family: system-ui, -apple-system, sans-serif }',
    customSiteTitle: 'Supplement API Documentation',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/${swaggerPath}`);
}
bootstrap();

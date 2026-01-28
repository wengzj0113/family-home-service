import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  const defaultPort = process.env.PORT || 3005;
  
  try {
    await app.listen(defaultPort);
    Logger.log(`Application is running on: http://localhost:${defaultPort}`, 'Bootstrap');
  } catch (err: any) {
    console.error(`Failed to start on port ${defaultPort}:`, err.message);
    process.exit(1);
  }
}
bootstrap();

import 'reflect-metadata';
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(__dirname, '../../../.env') });
import {
  Module,
  ValidationPipe,
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { PublicController, RentalController } from './controllers';
import { Database } from './prisma';
import { AuthService, AuthGuard } from './auth';
import { RentalService } from './service';
import { Storage } from './storage';
@Catch()
class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (error instanceof HttpException)
      return res.status(error.getStatus()).json(error.getResponse());
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const status = error.code === 'P2025' ? 404 : 409;
      return res
        .status(status)
        .json({
          message:
            status === 404
              ? 'Data tidak ditemukan'
              : 'Data sudah ada atau berubah. Muat ulang lalu coba lagi.',
        });
    }
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server. Silakan coba kembali.' });
  }
}
@Module({
  controllers: [PublicController, RentalController],
  providers: [Database, AuthService, AuthGuard, RentalService, Storage],
})
export class AppModule {}
export async function createApp(logger: boolean = true) {
  const app = await NestFactory.create(AppModule, {
    logger: logger ? ['error', 'warn', 'log'] : false,
  });
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new ErrorFilter());
  const attempts = new Map<string, { count: number; until: number }>();
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/v1/auth/') && req.method === 'POST') {
      const key = req.ip;
      const now = Date.now();
      let entry = attempts.get(key);
      if (!entry || entry.until < now) {
        entry = { count: 0, until: now + 60000 };
        attempts.set(key, entry);
      }
      if (++entry.count > 30)
        return res
          .status(429)
          .json({ message: 'Terlalu banyak percobaan. Coba lagi dalam satu menit.' });
      if (attempts.size > 10000)
        for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    }
    next();
  });
  const config = new DocumentBuilder()
    .setTitle('RumahKita.id API')
    .setDescription('Manajemen kontrakan, pembayaran manual, dan demo terpisah.')
    .setVersion('1.0')
    .addCookieAuth('rk_session')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  app.enableShutdownHooks();
  await app.init();
  return { app, document };
}

import {
  ArgumentsHost,
  Catch,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * Logs sin datos personales: solo método, ruta (sin query string), código de
 * respuesta, duración e id numérico del usuario (o "-" si no hay sesión).
 * Nunca email, IP, tokens, cuerpos de petición ni nombres de suplementos.
 */
const http = new Logger('HTTP');

export function requestLog(req: any, res: any, next: () => void) {
  const start = Date.now();
  res.on('finish', () => {
    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
    http.log(`${req.method} ${path} ${res.statusCode} ${Date.now() - start}ms user=${req.user?.id ?? '-'}`);
  });
  next();
}

/**
 * Errores inesperados (500): se registra el tipo de error y dónde ocurrió,
 * pero no su mensaje (un error de Prisma puede incluir los valores de la consulta,
 * p. ej. un email). Los HttpException (400, 404...) siguen igual que siempre.
 */
@Catch()
export class SafeExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) return super.catch(exception, host);

    const req = host.switchToHttp().getRequest();
    const err = exception as { name?: string; code?: string; stack?: string };
    const where = err.stack?.split('\n').find((l) => /[/\\]src[/\\]/.test(l))?.trim();
    this.logger.error(
      `${req?.method} ${String(req?.originalUrl ?? '').split('?')[0]} user=${req?.user?.id ?? '-'}: ` +
        `${err.name ?? 'Error'}${err.code ? ` ${err.code}` : ''}${where ? ` ${where}` : ''}`,
    );
    return super.catch(new InternalServerErrorException(), host);
  }
}

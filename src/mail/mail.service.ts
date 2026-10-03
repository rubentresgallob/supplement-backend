import {
  Global,
  Injectable,
  Logger,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Envío de emails con Brevo (gratis hasta 300/día, sin dominio propio:
 * basta con verificar el email remitente en Brevo).
 *
 * Variables de entorno:
 *   BREVO_API_KEY   clave de API de Brevo
 *   MAIL_FROM       email remitente verificado en Brevo
 *   MAIL_FROM_NAME  nombre que verá el usuario (por defecto "Suplementos Tracker")
 *   MAIL_DAILY_LIMIT  máximo de emails al día (por defecto 250, por debajo de los 300 de Brevo).
 *                     Si alguien abusa del registro, se corta aquí y no nos quedamos sin cuota.
 *
 * Sin BREVO_API_KEY no se envía nada: el email se escribe en el log (útil para probar).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private day = '';
  private sentToday = 0;

  get isConfigured() {
    return !!process.env.BREVO_API_KEY && !!process.env.MAIL_FROM;
  }

  async send(to: string, subject: string, html: string, text: string) {
    this.countOrRefuse();
    if (!this.isConfigured) {
      this.logger.warn(`[SIN BREVO] Email a ${to} | ${subject} | ${text}`);
      return;
    }
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY as string,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.MAIL_FROM,
          name: process.env.MAIL_FROM_NAME ?? 'Suplementos Tracker',
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!response.ok) {
      this.logger.error(`Brevo respondió ${response.status}: ${await response.text()}`);
      throw new Error('No se pudo enviar el email');
    }
  }

  /** Cuenta el envío del día (se reinicia a medianoche o al reiniciar el servidor). */
  private countOrRefuse() {
    const today = new Date().toDateString();
    if (today !== this.day) {
      this.day = today;
      this.sentToday = 0;
    }
    const limit = Number(process.env.MAIL_DAILY_LIMIT ?? 250);
    if (this.sentToday >= limit) {
      this.logger.error(`Límite diario de emails alcanzado (${limit}): ¿abuso del registro?`);
      throw new ServiceUnavailableException('Ahora mismo no podemos enviar emails. Inténtalo más tarde');
    }
    this.sentToday++;
  }
}

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomInt } from 'crypto';
import { addMinutes, subHours, subSeconds } from 'date-fns';
import { MailService } from '../mail/mail.service';

/** Recuperar contraseña: validez del código y máximo de intentos. */
export const RESET_CODE_MINUTES = 15;
export const RESET_MAX_ATTEMPTS = 5;

/** Verificar email al registrarse. */
export const VERIFY_CODE_MINUTES = 30;
export const VERIFY_MAX_ATTEMPTS = 5;
export const VERIFY_RESEND_SECONDS = 60; // no se envía otro código antes de esto
export const UNVERIFIED_TTL_HOURS = 24; // las cuentas sin verificar se borran pasado este tiempo

/** ¿Se puede enviar ya otro código de verificación? */
export function canResendVerification(sentAt: Date | null, now = new Date()) {
  return !sentAt || sentAt <= subSeconds(now, VERIFY_RESEND_SECONDS);
}

/** ¿Sigue vigente el código enviado en sentAt? */
export function isVerifyCodeValid(sentAt: Date | null, now = new Date()) {
  return !!sentAt && addMinutes(sentAt, VERIFY_CODE_MINUTES) > now;
}

type SessionUser = { id: number; email: string; username: string; created_at: Date };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  /**
   * Crea la cuenta SIN sesión: primero hay que verificar el email con el
   * código que se envía. Si el email ya estaba registrado pero sin verificar,
   * se reutiliza la cuenta (p. ej. se equivocó al escribir la contraseña).
   */
  async register(registerDto: RegisterDto) {
    const { email, password, username } = registerDto;

    await this.purgeUnverified();

    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail?.email_verified) {
      this.logger.warn(`Registration failed: Email already exists - ${email}`);
      throw new ConflictException('Email already exists');
    }
    const byUsername = await this.prisma.user.findUnique({ where: { username } });
    if (byUsername && byUsername.id !== byEmail?.id) {
      this.logger.warn(`Registration failed: Username already exists - ${username}`);
      throw new ConflictException('Username already exists');
    }

    const data = {
      email,
      password: await bcrypt.hash(password, 10),
      username,
      consent_at: registerDto.acceptTerms ? new Date() : null,
    };
    const user = byEmail
      ? await this.prisma.user.update({ where: { id: byEmail.id }, data })
      : await this.prisma.user.create({
          data: {
            ...data,
            notification_config: {
              create: { global_enabled: true, supplement_configs: '[]' },
            },
          },
        });

    await this.sendVerificationCode(user);
    this.logger.log(`Cuenta pendiente de verificar: usuario ${user.id}`);
    return this.pendingVerification(email);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`Login failed: User not found - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.email_verified) {
      // Contraseña correcta pero falta verificar: (re)envía el código y la app pide meterlo
      await this.sendVerificationCode(user);
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verifica tu email con el código que te hemos enviado',
      });
    }

    return this.session(user);
  }

  /** Marca el email como verificado con el código y devuelve la sesión iniciada. */
  async verifyEmail(email: string, code: string) {
    const invalid = new BadRequestException('Código no válido o caducado');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw invalid;
    if (user.email_verified) {
      throw new BadRequestException('Este email ya está verificado. Inicia sesión');
    }
    if (!user.verify_code_hash || !isVerifyCodeValid(user.verify_sent_at)) throw invalid;
    if (user.verify_attempts >= VERIFY_MAX_ATTEMPTS) {
      throw new BadRequestException('Demasiados intentos. Pide un código nuevo');
    }
    if (!(await bcrypt.compare(code, user.verify_code_hash))) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { verify_attempts: { increment: 1 } },
      });
      throw invalid;
    }

    const verified = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        verify_code_hash: null,
        verify_sent_at: null,
        verify_attempts: 0,
      },
    });
    this.logger.log(`Email verificado: usuario ${user.id}`);
    return this.session(verified);
  }

  /** Reenvía el código. Respuesta genérica para no revelar qué emails existen. */
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.email_verified) await this.sendVerificationCode(user);
    return this.pendingVerification(email);
  }

  private pendingVerification(email: string) {
    return {
      needsVerification: true,
      email,
      message: 'Te hemos enviado un código de 6 cifras para verificar tu email',
    };
  }

  /**
   * Envía un código nuevo, salvo que se haya enviado otro hace menos de
   * VERIFY_RESEND_SECONDS (así nadie puede usar la app para bombardear un email).
   */
  private async sendVerificationCode(user: {
    id: number;
    email: string;
    username: string;
    verify_sent_at: Date | null;
  }) {
    if (!canResendVerification(user.verify_sent_at)) return;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.mailService.send(
      user.email,
      `Tu código: ${code}`,
      `<div style="font-family:system-ui,sans-serif;max-width:420px">
        <h2 style="color:#FF6B35">Verifica tu email</h2>
        <p>Hola ${user.username}, este es tu código para activar tu cuenta:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:6px">${code}</p>
        <p>Caduca en ${VERIFY_CODE_MINUTES} minutos. Si no te has registrado tú, ignora este email.</p>
        <p style="color:#888">Suplementos Tracker</p>
      </div>`,
      `Tu código para verificar tu email es ${code}. Caduca en ${VERIFY_CODE_MINUTES} minutos.`,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verify_code_hash: await bcrypt.hash(code, 10),
        verify_sent_at: new Date(),
        verify_attempts: 0,
      },
    });
  }

  /** Borra las cuentas que nadie verificó a tiempo (y libera su email y nombre). */
  private async purgeUnverified() {
    const { count } = await this.prisma.user.deleteMany({
      where: {
        email_verified: false,
        created_at: { lt: subHours(new Date(), UNVERIFIED_TTL_HOURS) },
      },
    });
    if (count) this.logger.log(`Borradas ${count} cuentas sin verificar`);
  }

  private session(user: SessionUser) {
    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at,
      },
    };
  }

  /**
   * Borra el usuario. Todo lo demás (suplementos, tomas, amigos, puntos,
   * objetos...) se borra en cascada desde la base de datos.
   */
  async deleteAccount(userId: number, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // 400 y no 401: la app trata los 401 como "sesión caducada"
      throw new BadRequestException('Contraseña incorrecta');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.log(`Cuenta eliminada: usuario ${userId}`);
    return { message: 'Cuenta eliminada' };
  }

  /**
   * Envía un código de 6 cifras al email. Responde lo mismo exista o no
   * la cuenta, para no revelar qué emails están registrados.
   */
  async forgotPassword(email: string) {
    const generic = { message: 'Si el email está registrado, te hemos enviado un código' };
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return generic;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        reset_code_hash: await bcrypt.hash(code, 10),
        reset_expires: addMinutes(new Date(), RESET_CODE_MINUTES),
        reset_attempts: 0,
      },
    });

    await this.mailService.send(
      email,
      `Tu código: ${code}`,
      `<div style="font-family:system-ui,sans-serif;max-width:420px">
        <h2 style="color:#FF6B35">Recupera tu contraseña</h2>
        <p>Hola ${user.username}, este es tu código para crear una contraseña nueva:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:6px">${code}</p>
        <p>Caduca en ${RESET_CODE_MINUTES} minutos. Si no lo has pedido tú, ignora este email.</p>
        <p style="color:#888">Suplementos Tracker</p>
      </div>`,
      `Tu código para recuperar la contraseña es ${code}. Caduca en ${RESET_CODE_MINUTES} minutos.`,
    );
    this.logger.log(`Código de recuperación enviado al usuario ${user.id}`);
    return generic;
  }

  /** Cambia la contraseña con el código y devuelve la sesión iniciada. */
  async resetPassword(email: string, code: string, newPassword: string) {
    const invalid = new BadRequestException('Código no válido o caducado');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.reset_code_hash || !user.reset_expires || user.reset_expires < new Date()) {
      throw invalid;
    }
    if (user.reset_attempts >= RESET_MAX_ATTEMPTS) {
      throw new BadRequestException('Demasiados intentos. Pide un código nuevo');
    }
    if (!(await bcrypt.compare(code, user.reset_code_hash))) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { reset_attempts: { increment: 1 } },
      });
      throw invalid;
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        reset_code_hash: null,
        reset_expires: null,
        reset_attempts: 0,
        email_verified: true, // ha recibido el código en su email: queda verificado
      },
    });
    this.logger.log(`Contraseña restablecida: usuario ${user.id}`);
    return this.session(updated);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        updated_at: true,
      },
    });

    return user;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}

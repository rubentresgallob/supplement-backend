import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomInt } from 'crypto';
import { addMinutes } from 'date-fns';
import { MailService } from '../mail/mail.service';

/** Recuperar contraseña: validez del código y máximo de intentos. */
export const RESET_CODE_MINUTES = 15;
export const RESET_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, username } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        this.logger.warn(`Registration failed: Email already exists - ${email}`);
        throw new ConflictException('Email already exists');
      }
      if (existingUser.username === username) {
        this.logger.warn(
          `Registration failed: Username already exists - ${username}`,
        );
        throw new ConflictException('Username already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
    });

    // Create default notification config
    await this.prisma.notification_config.create({
      data: {
        user_id: user.id,
        global_enabled: true,
        supplement_configs: '[]',
      },
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    this.logger.log(`User created successfully: ${email}`);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at,
      },
    };
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

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
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
      },
    });
    this.logger.log(`Contraseña restablecida: usuario ${user.id}`);
    return {
      access_token: this.jwtService.sign({ sub: updated.id, email: updated.email }),
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        created_at: updated.created_at,
      },
    };
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

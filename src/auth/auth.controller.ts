import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/password-reset.dto';
import { Throttle } from '@nestjs/throttler';
import { clientIp } from '../common/client-ip';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  // Máx. 5 cuentas por hora desde la misma IP (frena la creación masiva de cuentas falsas)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Cuenta creada; falta verificar el email (no devuelve sesión)' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto, @Req() req) {
    this.logger.log(`Registration attempt for email: ${registerDto.email} (IP ${clientIp(req)})`);
    const result = await this.authService.register(registerDto);
    this.logger.log(`User registered successfully: ${registerDto.email}`);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'EMAIL_NOT_VERIFIED: se reenvía el código' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    const result = await this.authService.login(loginDto);
    this.logger.log(`User logged in successfully: ${loginDto.email}`);
    return result;
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verificar el email con el código de 6 cifras (devuelve la sesión iniciada)' })
  @ApiResponse({ status: 400, description: 'Código no válido, caducado o demasiados intentos' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email.trim(), dto.code);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reenviar el código de verificación (máx. 1 por minuto)' })
  @ApiResponse({ status: 200, description: 'Respuesta genérica (no revela si el email existe)' })
  async resendVerification(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerification(dto.email.trim());
  }

  // TEMPORAL: ver qué cabeceras de IP manda Render (borrar tras comprobarlo)
  @Get('ip-debug')
  ipDebug(@Req() req) {
    const h = req.headers;
    return {
      socket: req.socket?.remoteAddress,
      ip: req.ip,
      tracker: clientIp(req),
      headers: Object.fromEntries(
        Object.entries(h).filter(([k]) => /ip|forwarded|cf-|client|real/i.test(k)),
      ),
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    this.logger.log(`Profile request for user ID: ${req.user.id}`);
    return this.authService.getProfile(req.user.id);
  }

  @Post('delete-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar la cuenta y TODOS sus datos (exigido por Apple y Google)',
  })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada' })
  @ApiResponse({ status: 400, description: 'Contraseña incorrecta' })
  async deleteAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    return this.authService.deleteAccount(req.user.id, dto.password);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Enviar un código de 6 cifras para recuperar la contraseña' })
  @ApiResponse({ status: 200, description: 'Respuesta genérica (no revela si el email existe)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email.trim());
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cambiar la contraseña con el código (devuelve la sesión iniciada)' })
  @ApiResponse({ status: 400, description: 'Código no válido, caducado o demasiados intentos' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.email.trim(),
      dto.code,
      dto.newPassword,
    );
  }
}

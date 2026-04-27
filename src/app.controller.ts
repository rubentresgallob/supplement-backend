import { Controller, Get, Post, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('init-demo-data')
  @ApiOperation({ summary: 'Initialize demo data (disabled in production)' })
  async initDemoData() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Not available in production' };
    }

    this.logger.log('Initializing demo data...');

    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      if (existingUser) {
        return { message: 'Demo data already initialized' };
      }

      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await this.prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          username: 'testuser',
        },
      });

      await this.prisma.notification_config.create({
        data: {
          user_id: user.id,
          global_enabled: true,
          supplement_configs: '[]',
        },
      });

      return { message: 'Demo data initialized successfully' };
    } catch (error) {
      this.logger.error('Error initializing demo data:', error);
      throw error;
    }
  }
}

import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto, LoginDto, AuthTokenDto } from './dto/auth.dto';
import { JwtPayload } from './jwt.strategy';
import { AppConfig } from '../config/configuration';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokenDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Provision the full identity aggregate: preferences + motivation baseline.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        preferences: { create: {} },
        motivation: { create: {} },
      },
    });

    return this.buildToken(user.id, user.email, user.displayName);
  }

  async login(dto: LoginDto): Promise<AuthTokenDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildToken(user.id, user.email, user.displayName);
  }

  private buildToken(id: string, email: string, displayName: string): AuthTokenDto {
    const payload: JwtPayload = { sub: id, email };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get('jwt', { infer: true }).expiresIn,
      user: { id, email, displayName },
    };
  }
}

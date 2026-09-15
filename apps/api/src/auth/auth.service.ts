import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Inject,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimiterService } from './rate-limiter.service';
import {
  AuthResponse,
  AuthTokens,
  AuthUser,
  GuestAuthDto,
  SignupDto,
  UpgradeGuestDto,
  LoginDto,
  RefreshTokenDto,
} from '@repo/shared-types';
import { JwtPayload } from './jwt.strategy';

import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(RateLimiterService) private readonly rateLimiter: RateLimiterService,
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService,
    @Optional() @Inject(EmailService) private readonly emailService?: EmailService,
  ) {
    this.accessSecret =
      this.configService?.get<string>('JWT_ACCESS_SECRET') ||
      process.env.JWT_ACCESS_SECRET ||
      'ledger-super-secret-jwt-access-key-32-chars-min';
    this.refreshSecret =
      this.configService?.get<string>('JWT_REFRESH_SECRET') ||
      process.env.JWT_REFRESH_SECRET ||
      'ledger-super-secret-jwt-refresh-key-32-chars-min';
    this.accessExpiresIn =
      this.configService?.get<string>('JWT_ACCESS_EXPIRES') ||
      process.env.JWT_ACCESS_EXPIRES ||
      '15m';
    this.refreshExpiresIn =
      this.configService?.get<string>('JWT_REFRESH_EXPIRES') ||
      process.env.JWT_REFRESH_EXPIRES ||
      '30d';
  }

  /**
   * Generates paired access (15m) and refresh (30d) JWT tokens.
   */
  async generateTokens(user: { id: string; email: string | null; isGuest: boolean }): Promise<AuthTokens> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isGuest: user.isGuest,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isGuest: user.isGuest,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private mapUser(user: { id: string; email: string | null; isGuest: boolean }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      isGuest: user.isGuest,
    };
  }

  /**
   * Guest Authentication: creates or resumes a guest account.
   */
  async guestAuth(dto?: GuestAuthDto): Promise<AuthResponse> {
    if (dto?.guestId) {
      const existingGuest = await this.prisma.user.findUnique({
        where: { id: dto.guestId },
      });

      if (existingGuest && existingGuest.isGuest) {
        const tokens = await this.generateTokens(existingGuest);
        return {
          user: this.mapUser(existingGuest),
          tokens,
        };
      }
    }

    const newGuest = await this.prisma.user.create({
      data: {
        ...(dto?.guestId ? { id: dto.guestId } : {}),
        isGuest: true,
        email: null,
        passwordHash: null,
      },
    });

    const tokens = await this.generateTokens(newGuest);
    return {
      user: this.mapUser(newGuest),
      tokens,
    };
  }

  /**
   * Standard Signup: Fresh account creation with email and password.
   */
  async signup(dto: SignupDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        isGuest: false,
      },
    });

    const tokens = await this.generateTokens(user);
    return {
      user: this.mapUser(user),
      tokens,
    };
  }

  /**
   * Guest to Account Upgrade: Updates the same User.id in place (Spec A.7, A.13).
   */
  async upgradeGuest(currentUserId: string, dto: UpgradeGuestDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isGuest) {
      throw new BadRequestException('User is already a registered account');
    }

    const email = dto.email.toLowerCase().trim();

    const existingEmailOwner = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailOwner && existingEmailOwner.id !== currentUserId) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: currentUserId },
      data: {
        email,
        passwordHash,
        isGuest: false,
      },
    });

    // Trigger 3: Guest -> Account conversion confirmation (Spec A.11)
    if (this.emailService && updatedUser.email) {
      this.emailService.sendAccountUpgradeConfirmation(updatedUser.email).catch(() => {});
    }

    const tokens = await this.generateTokens(updatedUser);
    return {
      user: this.mapUser(updatedUser),
      tokens,
    };
  }

  /**
   * Login: Email and password authentication with rate limiting (5 attempts / 15 min).
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    // Rate limiting check
    this.rateLimiter.checkLimit(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.isGuest || !user.passwordHash) {
      this.rateLimiter.recordFailure(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      this.rateLimiter.recordFailure(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset rate limiter on successful authentication
    this.rateLimiter.reset(email);

    const tokens = await this.generateTokens(user);
    return {
      user: this.mapUser(user),
      tokens,
    };
  }

  /**
   * Refresh Token: Rotates token pair using a valid refresh token.
   */
  async refresh(dto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.refreshSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type for refresh');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      const tokens = await this.generateTokens(user);
      return {
        user: this.mapUser(user),
        tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}

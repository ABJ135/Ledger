import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  guestAuthSchema,
  signupSchema,
  upgradeGuestSchema,
  loginSchema,
  refreshTokenSchema,
  GuestAuthInput,
  SignupInput,
  UpgradeGuestInput,
  LoginInput,
  RefreshTokenInput,
} from '@repo/validation';
import { AuthResponse, AuthUser } from '@repo/shared-types';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  private setCookies(res: Response, authResponse: AuthResponse): void {
    const isProd = process.env.NODE_ENV === 'production';

    // 30 days in ms
    const maxAge = 30 * 24 * 60 * 60 * 1000;

    res.cookie('refreshToken', authResponse.tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
  }

  private clearCookies(res: Response): void {
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('accessToken', { path: '/' });
  }

  @Post('guest')
  @HttpCode(HttpStatus.OK)
  async guestAuth(
    @Body(new ZodValidationPipe(guestAuthSchema)) dto: GuestAuthInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.guestAuth(dto);
    this.setCookies(res, result);
    return result;
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body(new ZodValidationPipe(signupSchema)) dto: SignupInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.signup(dto);
    this.setCookies(res, result);
    return result;
  }

  @Post('upgrade-guest')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeGuest(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(upgradeGuestSchema)) dto: UpgradeGuestInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.upgradeGuest(user.id, dto);
    this.setCookies(res, result);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(dto);
    this.setCookies(res, result);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() body: Partial<RefreshTokenInput>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const token = body?.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const validated = refreshTokenSchema.parse({ refreshToken: token });
    const result = await this.authService.refresh(validated);
    this.setCookies(res, result);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response): Promise<{ success: boolean }> {
    this.clearCookies(res);
    return { success: true };
  }
}

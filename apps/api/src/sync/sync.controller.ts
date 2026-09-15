import { Controller, Post, Get, Body, Query, UseGuards, Inject } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser, SyncPushDto, SyncPullResponse } from '@repo/shared-types';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(
    @Inject(SyncService) private readonly syncService: SyncService,
  ) {}

  @Post('push')
  async push(
    @CurrentUser() user: AuthUser,
    @Body() dto: SyncPushDto,
  ): Promise<{ success: boolean; syncedCount: number }> {
    return this.syncService.push(user.id, dto);
  }

  @Get('pull')
  async pull(
    @CurrentUser() user: AuthUser,
    @Query('since') since?: string,
  ): Promise<SyncPullResponse> {
    return this.syncService.pull(user.id, since);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { MonthsService } from './months.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createMonthSchema,
  updateMonthSchema,
  endCurrentMonthSchema,
  CreateMonthInput,
  UpdateMonthInput,
  EndCurrentMonthInput,
} from '@repo/validation';
import { Month, MonthDetail, AuthUser, MonthSummary } from '@repo/shared-types';

@Controller('months')
@UseGuards(JwtAuthGuard)
export class MonthsController {
  constructor(@Inject(MonthsService) private readonly monthsService: MonthsService) {}

  @Get()
  async listMonths(
    @CurrentUser() user: AuthUser,
    @Query('context') context?: 'personal' | 'shared',
    @Query('sharedExpenseId') sharedExpenseId?: string,
  ): Promise<Month[]> {
    return this.monthsService.listMonths(user.id, context, sharedExpenseId);
  }

  @Post('end-current')
  @HttpCode(HttpStatus.OK)
  async endCurrentMonth(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(endCurrentMonthSchema)) dto: EndCurrentMonthInput,
  ): Promise<MonthSummary> {
    return this.monthsService.endCurrentMonth(user.id, dto);
  }

  @Get(':id')
  async getMonthById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MonthDetail> {
    return this.monthsService.getMonthById(id, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMonth(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createMonthSchema)) dto: CreateMonthInput,
  ): Promise<Month> {
    return this.monthsService.createMonth(user.id, dto);
  }

  @Patch(':id')
  async updateMonth(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateMonthSchema)) dto: UpdateMonthInput,
  ): Promise<Month> {
    return this.monthsService.updateMonth(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMonth(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.monthsService.deleteMonth(id, user.id);
  }

  @Post(':id/set-current')
  async setCurrent(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Month> {
    return this.monthsService.setCurrent(id, user.id);
  }

  @Get(':id/export-csv')
  async exportCsv(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const { csvContent, filename } = await this.monthsService.exportMonthCsv(id, user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  }
}

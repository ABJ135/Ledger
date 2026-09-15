import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { SharedExpensesService } from './shared-expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  AuthUser,
  CreateSharedExpenseDto,
  JoinSharedExpenseDto,
  SharedExpense,
} from '@repo/shared-types';

@Controller('shared-expenses')
@UseGuards(JwtAuthGuard)
export class SharedExpensesController {
  constructor(
    @Inject(SharedExpensesService)
    private readonly sharedExpensesService: SharedExpensesService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSharedExpenseDto,
  ): Promise<SharedExpense> {
    return this.sharedExpensesService.create(user.id, dto);
  }

  @Post('join')
  async join(
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinSharedExpenseDto,
  ): Promise<SharedExpense> {
    return this.sharedExpensesService.join(user.id, dto);
  }

  @Get('mine')
  async getMySharedExpenses(
    @CurrentUser() user: AuthUser,
  ): Promise<SharedExpense[]> {
    return this.sharedExpensesService.getMySharedExpenses(user.id);
  }
}

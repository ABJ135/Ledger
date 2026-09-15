import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createExpenseSchema,
  updateExpenseSchema,
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@repo/validation';
import { Expense, AuthUser } from '@repo/shared-types';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(@Inject(ExpensesService) private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createExpense(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createExpenseSchema)) dto: CreateExpenseInput,
  ): Promise<Expense> {
    return this.expensesService.createExpense(user.id, dto);
  }

  @Patch(':id')
  async updateExpense(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateExpenseSchema)) dto: UpdateExpenseInput,
  ): Promise<Expense> {
    return this.expensesService.updateExpense(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExpense(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.expensesService.deleteExpense(id, user.id);
  }
}

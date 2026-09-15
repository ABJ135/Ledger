import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  AuthUser,
  CreateTodoDto,
  UpdateTodoDto,
  Todo,
  Expense,
} from '@repo/shared-types';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(
    @Inject(TodosService) private readonly todosService: TodosService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser): Promise<Todo[]> {
    return this.todosService.findAll(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTodoDto,
  ): Promise<Todo> {
    return this.todosService.create(user.id, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTodoDto,
  ): Promise<Todo> {
    return this.todosService.update(id, user.id, dto);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.todosService.delete(id, user.id);
  }

  @Delete()
  async deleteAll(@CurrentUser() user: AuthUser): Promise<void> {
    return this.todosService.deleteAll(user.id);
  }

  @Post(':id/promote')
  async promote(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Expense> {
    return this.todosService.promote(id, user.id);
  }

  @Post('promote-all')
  async promoteAll(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return this.todosService.promoteAll(user.id);
  }
}

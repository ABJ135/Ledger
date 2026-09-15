import { Controller, Get, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createCategorySchema, CreateCategoryInput } from '@repo/validation';
import { Category, AuthUser } from '@repo/shared-types';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categoriesService: CategoriesService) {}

  @Get()
  async listCategories(@CurrentUser() user: AuthUser): Promise<Category[]> {
    return this.categoriesService.listCategories(user.id);
  }

  @Post()
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryInput,
  ): Promise<Category> {
    return this.categoriesService.createCategory(user.id, dto);
  }
}

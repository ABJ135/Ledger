import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, CreateCategoryDto } from '@repo/shared-types';

@Injectable()
export class CategoriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCategories(userId: string): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true, ownerId: null }, { ownerId: userId }],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return categories as any;
  }

  async createCategory(userId: string, dto: CreateCategoryDto): Promise<Category> {
    const name = dto.name.trim();

    const existing = await this.prisma.category.findFirst({
      where: {
        name,
        OR: [{ ownerId: userId }, { isDefault: true, ownerId: null }],
      },
    });

    if (existing) {
      throw new ConflictException(`Category "${name}" already exists`);
    }

    const created = await this.prisma.category.create({
      data: {
        name,
        ownerId: userId,
        isDefault: false,
      },
    });
    return created as any;
  }
}

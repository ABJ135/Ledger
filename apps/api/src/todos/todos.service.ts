import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTodoDto,
  UpdateTodoDto,
  Todo,
  Expense,
} from '@repo/shared-types';

@Injectable()
export class TodosService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * List all todos for user, ordered newest first.
   */
  async findAll(userId: string): Promise<Todo[]> {
    const list = await this.prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((t) => ({
      id: t.id,
      userId: t.userId,
      content: t.content,
      price: t.price,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /**
   * Create a new wishlist todo.
   */
  async create(userId: string, dto: CreateTodoDto): Promise<Todo> {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('Content is required');
    }

    const created = await this.prisma.todo.create({
      data: {
        userId,
        content: dto.content.trim(),
        price: dto.price !== undefined ? dto.price : null,
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      content: created.content,
      price: created.price,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Update a todo (inline cell edit or price entry).
   */
  async update(id: string, userId: string, dto: UpdateTodoDto): Promise<Todo> {
    const existing = await this.prisma.todo.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Todo not found');
    }

    const updated = await this.prisma.todo.update({
      where: { id },
      data: {
        content: dto.content !== undefined ? dto.content.trim() : undefined,
        price: dto.price !== undefined ? dto.price : undefined,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      content: updated.content,
      price: updated.price,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete single todo.
   */
  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.todo.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Todo not found');
    }

    await this.prisma.todo.delete({
      where: { id },
    });
  }

  /**
   * Delete all todos for the user.
   */
  async deleteAll(userId: string): Promise<void> {
    await this.prisma.todo.deleteMany({
      where: { userId },
    });
  }

  /**
   * Promote single todo to an expense in the user's active cycle.
   */
  async promote(id: string, userId: string): Promise<Expense> {
    const todo = await this.prisma.todo.findFirst({
      where: { id, userId },
    });

    if (!todo) {
      throw new NotFoundException('Todo not found');
    }

    // Find active current month for user
    let currentMonth = await this.prisma.month.findFirst({
      where: { userId, isCurrent: true, sharedExpenseId: null },
    });

    if (!currentMonth) {
      currentMonth = await this.prisma.month.findFirst({
        where: { userId, sharedExpenseId: null },
        orderBy: { startAt: 'desc' },
      });
    }

    if (!currentMonth) {
      // Auto-create initial cycle if none exists
      currentMonth = await this.prisma.month.create({
        data: {
          userId,
          label: 'Cycle 1',
          budget: 10000000,
          startAt: new Date(),
          isCurrent: true,
        },
      });
    }

    // Create expense from todo (defaults to Rs 0 if no price given)
    const expense = await this.prisma.expense.create({
      data: {
        monthId: currentMonth.id,
        content: todo.content,
        amount: todo.price || 0,
        occurredAt: new Date(),
        createdByUserId: userId,
        syncStatus: 'synced',
      },
      include: {
        category: true,
      },
    });

    // Delete the promoted todo
    await this.prisma.todo.delete({
      where: { id },
    });

    return {
      id: expense.id,
      monthId: expense.monthId,
      categoryId: expense.categoryId,
      content: expense.content,
      amount: expense.amount,
      occurredAt: expense.occurredAt.toISOString(),
      createdByUserId: expense.createdByUserId,
      syncStatus: expense.syncStatus as any,
      clientId: expense.clientId,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
      category: expense.category
        ? {
            id: expense.category.id,
            name: expense.category.name,
            isDefault: expense.category.isDefault,
            ownerId: expense.category.ownerId,
            createdAt: expense.category.createdAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Promote all todos to expenses in the user's active cycle.
   */
  async promoteAll(userId: string): Promise<{ count: number }> {
    const todos = await this.prisma.todo.findMany({
      where: { userId },
    });

    if (todos.length === 0) {
      return { count: 0 };
    }

    let currentMonth = await this.prisma.month.findFirst({
      where: { userId, isCurrent: true, sharedExpenseId: null },
    });

    if (!currentMonth) {
      currentMonth = await this.prisma.month.findFirst({
        where: { userId, sharedExpenseId: null },
        orderBy: { startAt: 'desc' },
      });
    }

    if (!currentMonth) {
      currentMonth = await this.prisma.month.create({
        data: {
          userId,
          label: 'Cycle 1',
          budget: 10000000,
          startAt: new Date(),
          isCurrent: true,
        },
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const t of todos) {
        await tx.expense.create({
          data: {
            monthId: currentMonth.id,
            content: t.content,
            amount: t.price || 0,
            occurredAt: now,
            createdByUserId: userId,
            syncStatus: 'synced',
          },
        });
      }
      await tx.todo.deleteMany({ where: { userId } });
    });

    return { count: todos.length };
  }
}

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncPushDto, SyncPullResponse, Expense, Month } from '@repo/shared-types';

@Injectable()
export class SyncService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async push(userId: string, dto: SyncPushDto): Promise<{ success: boolean; syncedCount: number }> {
    if (!dto.expenses || !Array.isArray(dto.expenses)) {
      throw new BadRequestException('Invalid sync push payload');
    }

    let syncedCount = 0;

    for (const item of dto.expenses) {
      if (!item.clientId || !item.monthId) continue;

      // Verify that the target month exists and belongs to the user or their shared expenses
      const month = await this.prisma.month.findFirst({
        where: {
          id: item.monthId,
          OR: [
            { userId },
            {
              sharedExpense: {
                members: {
                  some: { userId },
                },
              },
            },
          ],
        },
      });

      if (!month) continue;

      const existing = await this.prisma.expense.findUnique({
        where: { clientId: item.clientId },
      });

      // Handle deletion
      if (item.deleted) {
        if (existing) {
          await this.prisma.expense.delete({
            where: { id: existing.id },
          });
          syncedCount++;
        }
        continue;
      }

      const itemUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : new Date();
      const itemOccurredAt = item.occurredAt ? new Date(item.occurredAt) : new Date();

      if (existing) {
        // Spec A.8: Conflict rule: last-write-wins by updatedAt
        if (itemUpdatedAt.getTime() >= existing.updatedAt.getTime()) {
          await this.prisma.expense.update({
            where: { id: existing.id },
            data: {
              content: item.content,
              amount: item.amount,
              categoryId: item.categoryId || null,
              occurredAt: itemOccurredAt,
              syncStatus: 'synced',
              updatedAt: itemUpdatedAt,
            },
          });
          syncedCount++;
        }
      } else {
        // Create new record with clientId idempotency
        await this.prisma.expense.create({
          data: {
            clientId: item.clientId,
            monthId: item.monthId,
            categoryId: item.categoryId || null,
            content: item.content,
            amount: item.amount,
            occurredAt: itemOccurredAt,
            createdByUserId: userId,
            syncStatus: 'synced',
            createdAt: itemUpdatedAt,
            updatedAt: itemUpdatedAt,
          },
        });
        syncedCount++;
      }
    }

    return { success: true, syncedCount };
  }

  async pull(userId: string, sinceStr?: string): Promise<SyncPullResponse> {
    const since = sinceStr ? new Date(sinceStr) : new Date(0);

    // Fetch updated months
    const prismaMonths = await this.prisma.month.findMany({
      where: {
        OR: [
          { userId },
          {
            sharedExpense: {
              members: {
                some: { userId },
              },
            },
          },
        ],
        createdAt: {
          gt: since,
        },
      },
      orderBy: { startAt: 'desc' },
    });

    const months: Month[] = prismaMonths.map((m) => ({
      id: m.id,
      userId: m.userId,
      sharedExpenseId: m.sharedExpenseId,
      label: m.label,
      budget: m.budget,
      startAt: m.startAt.toISOString(),
      endAt: m.endAt ? m.endAt.toISOString() : null,
      isCurrent: m.isCurrent,
      notified80: m.notified80,
      notified100: m.notified100,
      createdAt: m.createdAt.toISOString(),
    }));

    // Fetch updated expenses
    const prismaExpenses = await this.prisma.expense.findMany({
      where: {
        month: {
          OR: [
            { userId },
            {
              sharedExpense: {
                members: {
                  some: { userId },
                },
              },
            },
          ],
        },
        updatedAt: {
          gt: since,
        },
      },
      include: {
        category: true,
      },
      orderBy: { occurredAt: 'desc' },
    });

    const expenses: Expense[] = prismaExpenses.map((e) => ({
      id: e.id,
      monthId: e.monthId,
      categoryId: e.categoryId,
      content: e.content,
      amount: e.amount,
      occurredAt: e.occurredAt.toISOString(),
      createdByUserId: e.createdByUserId,
      syncStatus: (e.syncStatus as any) || 'synced',
      clientId: e.clientId,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      category: e.category
        ? {
            id: e.category.id,
            name: e.category.name,
            isDefault: e.category.isDefault,
            ownerId: e.category.ownerId,
            createdAt: e.category.createdAt.toISOString(),
          }
        : null,
    }));

    return {
      serverTime: new Date().toISOString(),
      expenses,
      months,
    };
  }
}

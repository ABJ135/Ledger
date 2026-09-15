import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Month,
  MonthDetail,
  CreateMonthDto,
  UpdateMonthDto,
  Expense,
  MonthSummary,
  CategorySpend,
  EndCurrentMonthDto,
} from '@repo/shared-types';

import { EmailService } from '../email/email.service';

@Injectable()
export class MonthsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

  /**
   * Helper to compute authoritative financial totals.
   */
  computeTotals(budget: number, expenses: Expense[]) {
    const used = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = budget - used;
    const percentageUsed = budget > 0 ? Math.round((used / budget) * 10000) / 100 : 0;

    return {
      budget,
      used,
      remaining,
      percentageUsed,
    };
  }

  /**
   * List months for a user or shared expense. Auto-creates initial active cycle if none exist.
   */
  async listMonths(
    userId: string,
    context?: 'personal' | 'shared',
    sharedExpenseId?: string,
  ): Promise<Month[]> {
    const whereClause =
      context === 'shared' && sharedExpenseId
        ? { sharedExpenseId }
        : { userId, sharedExpenseId: null };

    const months = await this.prisma.month.findMany({
      where: whereClause,
      orderBy: { startAt: 'desc' },
    });

    if (months.length === 0 && (!context || context === 'personal')) {
      // Auto-create initial personal month cycle: Rs 100,000 (10,000,000 paisa)
      const initialMonth = await this.prisma.month.create({
        data: {
          userId,
          label: 'Cycle 1',
          budget: 10000000, // 100,000 PKR in paisa
          startAt: new Date(),
          isCurrent: true,
        },
      });
      return [initialMonth as any];
    }

    return months as any;
  }

  /**
   * Get single month with its expenses and authoritative server-computed totals.
   */
  async getMonthById(id: string, userId: string): Promise<MonthDetail> {
    const month = await this.prisma.month.findUnique({
      where: { id },
      include: {
        expenses: {
          include: {
            category: true,
          },
          orderBy: { occurredAt: 'desc' },
        },
      },
    });

    if (!month) {
      throw new NotFoundException('Month not found');
    }

    // Access control
    if (month.userId && month.userId !== userId) {
      if (month.sharedExpenseId) {
        const isMember = await this.prisma.sharedExpenseMember.findUnique({
          where: {
            sharedExpenseId_userId: {
              sharedExpenseId: month.sharedExpenseId,
              userId,
            },
          },
        });
        if (!isMember) {
          throw new ForbiddenException('You do not have access to this month');
        }
      } else {
        throw new ForbiddenException('You do not have access to this month');
      }
    }

    const totals = this.computeTotals(month.budget, month.expenses as any);

    return {
      ...(month as any),
      totals,
    };
  }

  /**
   * Create a new month cycle.
   */
  async createMonth(userId: string, dto: CreateMonthDto): Promise<Month> {
    const isFirst =
      (await this.prisma.month.count({
        where: { userId, sharedExpenseId: dto.sharedExpenseId || null },
      })) === 0;

    const month = await this.prisma.month.create({
      data: {
        userId: dto.sharedExpenseId ? null : userId,
        sharedExpenseId: dto.sharedExpenseId || null,
        label: dto.label,
        budget: dto.budget,
        startAt: new Date(),
        isCurrent: isFirst,
      },
    });

    return month as any;
  }

  /**
   * Update month label or budget.
   */
  async updateMonth(id: string, userId: string, dto: UpdateMonthDto): Promise<Month> {
    const existing = await this.prisma.month.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Month not found');
    }
    if (existing.userId && existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to edit this month');
    }

    const updated = await this.prisma.month.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.budget !== undefined ? { budget: dto.budget } : {}),
      },
    });

    return updated as any;
  }

  /**
   * Delete month (cascades expenses).
   */
  async deleteMonth(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.month.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Month not found');
    }
    if (existing.userId && existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this month');
    }

    await this.prisma.$transaction([
      this.prisma.expense.deleteMany({ where: { monthId: id } }),
      this.prisma.month.delete({ where: { id } }),
    ]);
  }

  /**
   * Mark a month as current (isCurrent = true, all other user cycles become false).
   */
  async setCurrent(id: string, userId: string): Promise<Month> {
    const existing = await this.prisma.month.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Month not found');
    }
    if (existing.userId && existing.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const whereScope = existing.sharedExpenseId
      ? { sharedExpenseId: existing.sharedExpenseId }
      : { userId, sharedExpenseId: null };

    const [, updated] = await this.prisma.$transaction([
      this.prisma.month.updateMany({
        where: whereScope,
        data: { isCurrent: false },
      }),
      this.prisma.month.update({
        where: { id },
        data: { isCurrent: true },
      }),
    ]);

    return updated as any;
  }

  /**
   * End current active month and immediately create rollover month (Spec A.6, A.10, A.11).
   * - Sets endAt = now() server-side.
   * - Creates next month with startAt = previous endAt (no gap), isCurrent = true.
   * - Previous month isCurrent becomes false.
   * - Computes and returns MonthSummary.
   */
  async endCurrentMonth(
    userId: string,
    dto: EndCurrentMonthDto,
  ): Promise<MonthSummary> {
    const currentMonth = await this.prisma.month.findFirst({
      where: {
        userId,
        isCurrent: true,
        sharedExpenseId: null,
      },
      include: {
        expenses: {
          include: { category: true },
        },
      },
    });

    if (!currentMonth) {
      throw new NotFoundException('No active billing cycle found to close');
    }

    const totalSpent = currentMonth.expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = currentMonth.budget - totalSpent;

    // Category breakdown
    const catMap = new Map<string | null, { name: string; total: number }>();
    for (const exp of currentMonth.expenses) {
      const catId = exp.categoryId;
      const catName = exp.category?.name || 'General / Other';
      const cur = catMap.get(catId) || { name: catName, total: 0 };
      cur.total += exp.amount;
      catMap.set(catId, cur);
    }

    const categoryBreakdown: CategorySpend[] = Array.from(catMap.entries())
      .map(([catId, data]) => ({
        categoryId: catId,
        categoryName: data.name,
        total: data.total,
        percentage:
          totalSpent > 0
            ? Math.round((data.total / totalSpent) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const now = new Date();

    // Determine next label (e.g. "Cycle 2" from "Cycle 1")
    let nextLabel = 'Next Cycle';
    const cycleMatch = currentMonth.label.match(/(\d+)/);
    if (cycleMatch && cycleMatch[1]) {
      const num = parseInt(cycleMatch[1], 10);
      nextLabel = currentMonth.label.replace(cycleMatch[1], String(num + 1));
    } else {
      const totalCount = await this.prisma.month.count({ where: { userId } });
      nextLabel = `Cycle ${totalCount + 1}`;
    }

    const [closedMonth, nextMonth] = await this.prisma.$transaction([
      this.prisma.month.update({
        where: { id: currentMonth.id },
        data: {
          endAt: now,
          isCurrent: false,
        },
      }),
      this.prisma.month.create({
        data: {
          userId,
          label: nextLabel,
          budget: dto.budget,
          startAt: now, // seamless continuation, no gap
          isCurrent: true,
        },
      }),
    ]);

    const summary: MonthSummary = {
      monthId: closedMonth.id,
      label: closedMonth.label,
      budget: closedMonth.budget,
      totalSpent,
      remaining,
      categoryBreakdown,
      nextMonthId: nextMonth.id,
      nextMonthLabel: nextMonth.label,
    };

    // Trigger 2: Month-end summary email (Spec A.11)
    this.prisma.user
      .findUnique({ where: { id: userId } })
      .then((user) => {
        if (user?.email) {
          this.emailService.sendMonthEndSummary(user.email, summary).catch(() => {});
        }
      })
      .catch(() => {});

    return summary;
  }

  /**
   * Export billing cycle expenses as CSV stream (Spec A.10).
   * - Converts UTC timestamps to PKT (UTC+5 fixed).
   * - Formats integer paisa to PKR currency.
   * - Escapes CSV strings RFC 4180 compliant.
   */
  async exportMonthCsv(
    monthId: string,
    userId: string,
  ): Promise<{ csvContent: string; filename: string }> {
    const month = await this.prisma.month.findUnique({
      where: { id: monthId },
      include: {
        expenses: {
          include: { category: true },
          orderBy: { occurredAt: 'desc' },
        },
      },
    });

    if (!month) {
      throw new NotFoundException('Month not found');
    }

    if (month.userId && month.userId !== userId) {
      if (month.sharedExpenseId) {
        const isMember = await this.prisma.sharedExpenseMember.findUnique({
          where: {
            sharedExpenseId_userId: {
              sharedExpenseId: month.sharedExpenseId,
              userId,
            },
          },
        });
        if (!isMember) throw new ForbiddenException('Access denied');
      } else {
        throw new ForbiddenException('Access denied');
      }
    }

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Format UTC to PKT (+05:00)
    const formatPkt = (utcDate: Date): string => {
      const pktTime = new Date(utcDate.getTime() + 5 * 60 * 60 * 1000);
      const iso = pktTime.toISOString().replace('Z', '+05:00');
      return iso.replace('T', ' ').substring(0, 19);
    };

    const lines: string[] = [];
    // Header comments
    lines.push(`# Cycle: ${escapeCsv(month.label)}`);
    lines.push(`# Budget (PKR): ${(month.budget / 100).toFixed(2)}`);
    lines.push(`# Total Expenses: ${month.expenses.length}`);
    lines.push('');
    // Column header row
    lines.push('Date (PKT),Category,Description,Amount (PKR),Amount (Paisa)');

    for (const exp of month.expenses) {
      const dateStr = formatPkt(exp.occurredAt);
      const catName = exp.category?.name || 'General';
      const desc = exp.content;
      const pkr = (exp.amount / 100).toFixed(2);
      const paisa = exp.amount;

      lines.push(
        [
          escapeCsv(dateStr),
          escapeCsv(catName),
          escapeCsv(desc),
          escapeCsv(pkr),
          escapeCsv(paisa),
        ].join(','),
      );
    }

    const safeLabel =
      month.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'cycle';
    const filename = `ledger-${safeLabel}-${month.id.substring(0, 8)}.csv`;

    return {
      csvContent: lines.join('\r\n'),
      filename,
    };
  }
}

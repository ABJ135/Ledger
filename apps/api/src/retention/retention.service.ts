import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export interface RetentionCleanupResult {
  deletedMonthsCount: number;
  deletedExpensesCount: number;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * Daily NestJS Cron job running at 00:00 UTC.
   * Spec A.9: For each user/shared-expense, keep current active month + 3 most recently ended months.
   * Hard delete (expenses first, then the month row, in a transaction) anything beyond that.
   */
  @Cron('0 0 * * *', { timeZone: 'UTC' })
  async handleCron(): Promise<void> {
    this.logger.log('Starting scheduled daily data retention cleanup (00:00 UTC)...');
    try {
      const result = await this.runRetentionCleanup();
      this.logger.log(
        `Data retention cleanup finished: pruned ${result.deletedMonthsCount} months and ${result.deletedExpensesCount} expenses.`,
      );
    } catch (err: any) {
      this.logger.error(`Error during data retention cleanup: ${err.message}`, err.stack);
    }
  }

  /**
   * Public execution method for retention pruning.
   * Usable both by cron job and direct programmatic/test triggers.
   */
  async runRetentionCleanup(): Promise<RetentionCleanupResult> {
    let deletedMonthsCount = 0;
    let deletedExpensesCount = 0;

    // 1. Process personal months (grouped by userId)
    const personalUsers = await this.prisma.month.findMany({
      where: {
        userId: { not: null },
        sharedExpenseId: null,
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const record of personalUsers) {
      if (!record.userId) continue;
      const res = await this.pruneMonthsForEntity({ userId: record.userId });
      deletedMonthsCount += res.deletedMonths;
      deletedExpensesCount += res.deletedExpenses;
    }

    // 2. Process shared expense months (grouped by sharedExpenseId)
    const sharedExpenses = await this.prisma.month.findMany({
      where: {
        sharedExpenseId: { not: null },
      },
      select: { sharedExpenseId: true },
      distinct: ['sharedExpenseId'],
    });

    for (const record of sharedExpenses) {
      if (!record.sharedExpenseId) continue;
      const res = await this.pruneMonthsForEntity({ sharedExpenseId: record.sharedExpenseId });
      deletedMonthsCount += res.deletedMonths;
      deletedExpensesCount += res.deletedExpenses;
    }

    return { deletedMonthsCount, deletedExpensesCount };
  }

  /**
   * Applies the exact retention algorithm for a specific entity (personal user or shared expense).
   */
  private async pruneMonthsForEntity(filter: {
    userId?: string;
    sharedExpenseId?: string;
  }): Promise<{ deletedMonths: number; deletedExpenses: number }> {
    // Retrieve all months for this entity
    const months = await this.prisma.month.findMany({
      where: filter,
      orderBy: [
        { endAt: 'desc' },
        { startAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Separate active current month(s) from ended months
    // Active month is defined by isCurrent === true (or endAt === null)
    const endedMonths = months.filter((m) => !m.isCurrent);

    // Keep the 3 most recently ended months. Any beyond the 3 must be hard deleted.
    const expiredMonths = endedMonths.slice(3);

    let deletedMonths = 0;
    let deletedExpenses = 0;

    for (const expiredMonth of expiredMonths) {
      await this.prisma.$transaction(async (tx) => {
        // Spec A.9: Hard delete expenses first
        const delExp = await tx.expense.deleteMany({
          where: { monthId: expiredMonth.id },
        });

        // Hard delete the month row
        await tx.month.delete({
          where: { id: expiredMonth.id },
        });

        deletedExpenses += delExp.count;
        deletedMonths += 1;
      });
    }

    return { deletedMonths, deletedExpenses };
  }
}

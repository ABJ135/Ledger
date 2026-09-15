import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Expense,
  CreateExpenseDto,
  UpdateExpenseDto,
} from '@repo/shared-types';

import { EmailService } from '../email/email.service';

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

  /**
   * Check if user has access to a month.
   */
  private async verifyMonthAccess(monthId: string, userId: string): Promise<void> {
    const month = await this.prisma.month.findUnique({
      where: { id: monthId },
    });

    if (!month) {
      throw new NotFoundException('Target month not found');
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
        if (!isMember) {
          throw new ForbiddenException('Access denied to this month');
        }
      } else {
        throw new ForbiddenException('Access denied to this month');
      }
    }
  }

  /**
   * Evaluates if active cycle has crossed 80% or 100% budget threshold.
   * Spec A.11: Sends email once per threshold via Brevo.
   */
  async checkBudgetThresholdAlert(monthId: string): Promise<void> {
    const month = await this.prisma.month.findUnique({
      where: { id: monthId },
      include: {
        user: true,
        expenses: { select: { amount: true } },
        sharedExpense: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!month || month.budget <= 0) return;

    const used = month.expenses.reduce((sum, e) => sum + e.amount, 0);
    const ratio = used / month.budget;

    // Collect recipient emails
    const emails: string[] = [];
    if (month.user?.email) {
      emails.push(month.user.email);
    }
    if (month.sharedExpense?.members) {
      for (const m of month.sharedExpense.members) {
        if (m.user?.email && !emails.includes(m.user.email)) {
          emails.push(m.user.email);
        }
      }
    }

    if (emails.length === 0) return;

    if (ratio >= 1.0 && !month.notified100) {
      await this.prisma.month.update({
        where: { id: month.id },
        data: { notified100: true, notified80: true },
      });

      for (const toEmail of emails) {
        await this.emailService.sendBudgetThresholdAlert({
          toEmail,
          monthLabel: month.label,
          budget: month.budget,
          used,
          threshold: 100,
        });
      }
    } else if (ratio >= 0.8 && !month.notified80) {
      await this.prisma.month.update({
        where: { id: month.id },
        data: { notified80: true },
      });

      for (const toEmail of emails) {
        await this.emailService.sendBudgetThresholdAlert({
          toEmail,
          monthLabel: month.label,
          budget: month.budget,
          used,
          threshold: 80,
        });
      }
    }
  }

  /**
   * Create an expense entry. Amount stored in integer paisa, occurredAt in UTC.
   */
  async createExpense(userId: string, dto: CreateExpenseDto): Promise<Expense> {
    await this.verifyMonthAccess(dto.monthId, userId);

    // If idempotent clientId provided (e.g. mobile sync)
    if (dto.clientId) {
      const existing = await this.prisma.expense.findUnique({
        where: { clientId: dto.clientId },
        include: { category: true },
      });
      if (existing) {
        return existing as any;
      }
    }

    const expense = await this.prisma.expense.create({
      data: {
        monthId: dto.monthId,
        categoryId: dto.categoryId || null,
        content: dto.content.trim(),
        amount: dto.amount, // Integer paisa (PKR x 100)
        occurredAt: new Date(dto.occurredAt), // UTC instant
        createdByUserId: userId,
        clientId: dto.clientId || null,
        syncStatus: 'synced',
      },
      include: {
        category: true,
      },
    });

    // Check budget threshold alerts asynchronously (Spec A.11)
    this.checkBudgetThresholdAlert(dto.monthId).catch(() => {});

    return expense as any;
  }

  /**
   * Update an expense entry (cell editing).
   */
  async updateExpense(
    id: string,
    userId: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const existing = await this.prisma.expense.findUnique({
      where: { id },
      include: { month: true },
    });

    if (!existing) {
      throw new NotFoundException('Expense not found');
    }

    // Access check: creator or month owner
    if (existing.createdByUserId !== userId && existing.month.userId !== userId) {
      throw new ForbiddenException('You do not have permission to edit this expense');
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId || null } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.occurredAt !== undefined ? { occurredAt: new Date(dto.occurredAt) } : {}),
      },
      include: {
        category: true,
      },
    });

    return updated as any;
  }

  /**
   * Delete an expense entry.
   */
  async deleteExpense(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.expense.findUnique({
      where: { id },
      include: { month: true },
    });

    if (!existing) {
      throw new NotFoundException('Expense not found');
    }

    if (existing.createdByUserId !== userId && existing.month.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this expense');
    }

    await this.prisma.expense.delete({ where: { id } });
  }
}

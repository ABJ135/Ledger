import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RetentionService } from '../src/retention/retention.service';
import { randomUUID } from 'crypto';

class MockPrismaService {
  public users = new Map<string, any>();
  public sharedExpenses = new Map<string, any>();
  public months = new Map<string, any>();
  public expenses = new Map<string, any>();

  user = {
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const user = { id, email: data.email || null, isGuest: data.isGuest ?? false, createdAt: new Date() };
      this.users.set(id, user);
      return user;
    },
  };

  sharedExpense = {
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const se = { id, code: data.code || 'ABCDEFGH', ownerId: data.ownerId, name: data.name, createdAt: new Date() };
      this.sharedExpenses.set(id, se);
      return se;
    },
  };

  month = {
    findMany: async (args: any = {}) => {
      const { where = {}, orderBy, distinct } = args;
      let list = Array.from(this.months.values());

      if (where.userId !== undefined) {
        if (where.userId && typeof where.userId === 'object' && where.userId.not !== undefined) {
          list = list.filter((m) => m.userId != null);
        } else if (where.userId !== undefined) {
          list = list.filter((m) => m.userId === where.userId);
        }
      }

      if (where.sharedExpenseId !== undefined) {
        if (where.sharedExpenseId && typeof where.sharedExpenseId === 'object' && where.sharedExpenseId.not !== undefined) {
          list = list.filter((m) => m.sharedExpenseId != null);
        } else if (where.sharedExpenseId !== undefined) {
          list = list.filter((m) => m.sharedExpenseId === where.sharedExpenseId);
        }
      }

      if (distinct && distinct.includes('userId')) {
        const seen = new Set<string>();
        list = list.filter((m) => {
          if (m.userId && !seen.has(m.userId)) {
            seen.add(m.userId);
            return true;
          }
          return false;
        });
      }

      if (distinct && distinct.includes('sharedExpenseId')) {
        const seen = new Set<string>();
        list = list.filter((m) => {
          if (m.sharedExpenseId && !seen.has(m.sharedExpenseId)) {
            seen.add(m.sharedExpenseId);
            return true;
          }
          return false;
        });
      }

      if (orderBy) {
        list.sort((a, b) => {
          const timeA = a.endAt ? new Date(a.endAt).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.endAt ? new Date(b.endAt).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA; // desc
        });
      }

      return list;
    },
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const m = {
        id,
        userId: data.userId || null,
        sharedExpenseId: data.sharedExpenseId || null,
        label: data.label,
        budget: data.budget,
        startAt: data.startAt || new Date(),
        endAt: data.endAt || null,
        isCurrent: data.isCurrent ?? false,
        createdAt: data.createdAt || new Date(),
      };
      this.months.set(id, m);
      return m;
    },
    delete: async ({ where }: any) => {
      const m = this.months.get(where.id);
      if (m) this.months.delete(where.id);
      return m;
    },
  };

  expense = {
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const e = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      this.expenses.set(id, e);
      return e;
    },
    findMany: async ({ where }: any) => {
      let list = Array.from(this.expenses.values());
      if (where.monthId) {
        list = list.filter((e) => e.monthId === where.monthId);
      }
      return list;
    },
    deleteMany: async ({ where }: any) => {
      let count = 0;
      for (const [id, e] of this.expenses.entries()) {
        if (e.monthId === where.monthId) {
          this.expenses.delete(id);
          count++;
        }
      }
      return { count };
    },
  };

  $transaction = async (arg: any) => {
    if (typeof arg === 'function') {
      return arg(this);
    }
    return Promise.all(arg);
  };
  async onModuleInit() {}
  async onModuleDestroy() {}
}

async function runRetentionE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 9 Data Retention Cron Job E2E Tests');
  console.log('=============================================\n');

  const mockPrisma = new MockPrismaService();

  const app = await NestFactory.create(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  try {
    await (prisma as any).$queryRaw`SELECT 1`;
    console.log('Connected to real database.');
  } catch (err: any) {
    console.log('Using in-memory MockPrismaService for E2E testing.');
    prisma.user = mockPrisma.user as any;
    prisma.sharedExpense = mockPrisma.sharedExpense as any;
    prisma.month = mockPrisma.month as any;
    prisma.expense = mockPrisma.expense as any;
    prisma.$transaction = mockPrisma.$transaction as any;
    (PrismaService.prototype as any).$transaction = mockPrisma.$transaction as any;
  }

  const retentionService = app.get(RetentionService);

  const testUserId = randomUUID();
  console.log(`[1] Seeding personal billing cycles for test user (${testUserId})...`);

  // Create 1 active month (current)
  const activeMonth = await app.get(PrismaService).month.create({
    data: {
      userId: testUserId,
      label: 'Active Cycle (Current)',
      budget: 10000000,
      startAt: new Date(Date.now() - 5 * 86400000),
      endAt: null,
      isCurrent: true,
    },
  });

  // Create 2 expenses in active month
  await app.get(PrismaService).expense.create({
    data: {
      monthId: activeMonth.id,
      content: 'Current Rent',
      amount: 4000000,
      occurredAt: new Date(),
      createdByUserId: testUserId,
    },
  });
  await app.get(PrismaService).expense.create({
    data: {
      monthId: activeMonth.id,
      content: 'Current Groceries',
      amount: 1500000,
      occurredAt: new Date(),
      createdByUserId: testUserId,
    },
  });

  // Create 5 ended months:
  // Month 1: ended 10 days ago (Keep 1)
  // Month 2: ended 40 days ago (Keep 2)
  // Month 3: ended 70 days ago (Keep 3)
  // Month 4: ended 100 days ago (Prune 1)
  // Month 5: ended 130 days ago (Prune 2)
  const endedMonths = [];
  const daysAgo = [10, 40, 70, 100, 130];
  for (let i = 0; i < 5; i++) {
    const d = daysAgo[i];
    const m = await app.get(PrismaService).month.create({
      data: {
        userId: testUserId,
        label: `Cycle - Ended ${d}d ago`,
        budget: 8000000,
        startAt: new Date(Date.now() - (d + 25) * 86400000),
        endAt: new Date(Date.now() - d * 86400000),
        isCurrent: false,
        createdAt: new Date(Date.now() - (d + 25) * 86400000),
      },
    });
    endedMonths.push(m);

    // Add 2 expenses to each ended month
    await app.get(PrismaService).expense.create({
      data: {
        monthId: m.id,
        content: `Expense A for ${m.label}`,
        amount: 2000000,
        occurredAt: new Date(Date.now() - (d + 5) * 86400000),
        createdByUserId: testUserId,
      },
    });
    await app.get(PrismaService).expense.create({
      data: {
        monthId: m.id,
        content: `Expense B for ${m.label}`,
        amount: 1000000,
        occurredAt: new Date(Date.now() - (d + 3) * 86400000),
        createdByUserId: testUserId,
      },
    });
  }

  console.log('  ✓ Created 1 active month and 5 ended historical months (each with 2 expenses).');

  console.log('\n[2] Seeding shared expense billing cycles...');
  const testSharedExpenseId = randomUUID();
  const activeSharedMonth = await app.get(PrismaService).month.create({
    data: {
      sharedExpenseId: testSharedExpenseId,
      label: 'Shared Active Cycle',
      budget: 15000000,
      startAt: new Date(Date.now() - 3 * 86400000),
      endAt: null,
      isCurrent: true,
    },
  });
  await app.get(PrismaService).expense.create({
    data: {
      monthId: activeSharedMonth.id,
      content: 'Shared Wifi',
      amount: 500000,
      occurredAt: new Date(),
      createdByUserId: testUserId,
    },
  });

  // Create 4 ended shared months:
  // 3 kept, 1 pruned (with 3 expenses in the pruned month)
  const sharedDaysAgo = [15, 45, 75, 105];
  const sharedEndedMonths = [];
  for (let i = 0; i < 4; i++) {
    const d = sharedDaysAgo[i];
    const sm = await app.get(PrismaService).month.create({
      data: {
        sharedExpenseId: testSharedExpenseId,
        label: `Shared Cycle - Ended ${d}d ago`,
        budget: 12000000,
        startAt: new Date(Date.now() - (d + 20) * 86400000),
        endAt: new Date(Date.now() - d * 86400000),
        isCurrent: false,
        createdAt: new Date(Date.now() - (d + 20) * 86400000),
      },
    });
    sharedEndedMonths.push(sm);

    // Put 3 expenses in the oldest shared month (index 3)
    const expCount = i === 3 ? 3 : 1;
    for (let k = 0; k < expCount; k++) {
      await app.get(PrismaService).expense.create({
        data: {
          monthId: sm.id,
          content: `Shared Exp ${k + 1} for ${sm.label}`,
          amount: 800000,
          occurredAt: new Date(Date.now() - (d + 2) * 86400000),
          createdByUserId: testUserId,
        },
      });
    }
  }

  console.log('  ✓ Created 1 active shared month and 4 ended shared months.');

  console.log('\n[3] Executing retention cleanup (Spec A.9 algorithm)...');
  const cleanupResult = await retentionService.runRetentionCleanup();
  console.log(`  ✓ Retention cleanup executed.`);
  console.log(`  ✓ Deleted Months Count: ${cleanupResult.deletedMonthsCount}`);
  console.log(`  ✓ Deleted Expenses Count: ${cleanupResult.deletedExpensesCount}`);

  // Expected:
  // Personal: 5 ended months -> keep top 3, delete 2 oldest months. 2 months * 2 expenses = 4 expenses.
  // Shared: 4 ended months -> keep top 3, delete 1 oldest month. 1 month * 3 expenses = 3 expenses.
  // Total expected deleted months = 2 + 1 = 3
  // Total expected deleted expenses = 4 + 3 = 7
  if (cleanupResult.deletedMonthsCount !== 3) {
    throw new Error(`Expected exactly 3 deleted months, got ${cleanupResult.deletedMonthsCount}`);
  }
  if (cleanupResult.deletedExpensesCount !== 7) {
    throw new Error(`Expected exactly 7 deleted expenses, got ${cleanupResult.deletedExpensesCount}`);
  }

  console.log('\n[4] Verifying database state after retention pruning...');

  // 1. Personal months verification
  const remainingPersonalMonths = await app.get(PrismaService).month.findMany({
    where: { userId: testUserId },
  });
  console.log(`  ✓ Remaining personal months for user: ${remainingPersonalMonths.length} (Expected 4: 1 active + 3 recent ended)`);
  if (remainingPersonalMonths.length !== 4) {
    throw new Error(`Expected 4 remaining personal months, got ${remainingPersonalMonths.length}`);
  }

  // Verify active month is preserved
  const foundActive = remainingPersonalMonths.find((m: any) => m.id === activeMonth.id);
  if (!foundActive || !foundActive.isCurrent) {
    throw new Error('Active current personal month was incorrectly pruned!');
  }
  const activeExpenses = await app.get(PrismaService).expense.findMany({
    where: { monthId: activeMonth.id },
  });
  if (activeExpenses.length !== 2) {
    throw new Error(`Active month expenses were lost! Expected 2, got ${activeExpenses.length}`);
  }
  console.log('  ✓ Active personal month and its expenses are completely intact.');

  // Verify the 3 most recently ended months are kept
  for (let i = 0; i < 3; i++) {
    const shouldExist = remainingPersonalMonths.find((m: any) => m.id === endedMonths[i].id);
    if (!shouldExist) {
      throw new Error(`Recently ended month ${endedMonths[i].label} was incorrectly pruned!`);
    }
  }
  console.log('  ✓ Top 3 most recently ended personal months are retained.');

  // Verify the 2 oldest ended months were purged
  for (let i = 3; i < 5; i++) {
    const shouldNotExist = remainingPersonalMonths.find((m: any) => m.id === endedMonths[i].id);
    if (shouldNotExist) {
      throw new Error(`Old month ${endedMonths[i].label} was NOT pruned!`);
    }
    const orphanExpenses = await app.get(PrismaService).expense.findMany({
      where: { monthId: endedMonths[i].id },
    });
    if (orphanExpenses.length > 0) {
      throw new Error(`Old month ${endedMonths[i].label} left orphan expenses!`);
    }
  }
  console.log('  ✓ 2 oldest personal months and their expenses were hard-deleted (0 orphans).');

  // 2. Shared months verification
  const remainingSharedMonths = await app.get(PrismaService).month.findMany({
    where: { sharedExpenseId: testSharedExpenseId },
  });
  console.log(`  ✓ Remaining shared months: ${remainingSharedMonths.length} (Expected 4: 1 active + 3 recent ended)`);
  if (remainingSharedMonths.length !== 4) {
    throw new Error(`Expected 4 remaining shared months, got ${remainingSharedMonths.length}`);
  }

  const oldestSharedPruned = remainingSharedMonths.find((m: any) => m.id === sharedEndedMonths[3].id);
  if (oldestSharedPruned) {
    throw new Error('Oldest shared month was NOT pruned!');
  }
  const sharedOrphanExpenses = await app.get(PrismaService).expense.findMany({
    where: { monthId: sharedEndedMonths[3].id },
  });
  if (sharedOrphanExpenses.length > 0) {
    throw new Error('Oldest shared month left orphan expenses!');
  }
  console.log('  ✓ Oldest shared month and all 3 of its expenses were hard-deleted.');

  console.log('\n[5] Verifying idempotency (subsequent run with no new older data)...');
  const secondRunResult = await retentionService.runRetentionCleanup();
  console.log(`  ✓ Second run deleted months: ${secondRunResult.deletedMonthsCount}`);
  console.log(`  ✓ Second run deleted expenses: ${secondRunResult.deletedExpensesCount}`);
  if (secondRunResult.deletedMonthsCount !== 0 || secondRunResult.deletedExpensesCount !== 0) {
    throw new Error('Second retention cleanup run should have pruned 0 records!');
  }

  console.log('\n[6] Testing handleCron entry point...');
  await retentionService.handleCron();
  console.log('  ✓ handleCron executed smoothly.');

  await app.close();
  console.log('\n=============================================');
  console.log('🎉 ALL STEP 9 DATA RETENTION TESTS PASSED!');
  console.log('=============================================\n');
}

runRetentionE2ETests().catch((err) => {
  console.error('\n❌ STEP 9 RETENTION TEST FAILED:');
  console.error(err);
  process.exit(1);
});

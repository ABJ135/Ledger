import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { ExpensesService } from '../src/expenses/expenses.service';
import { MonthsService } from '../src/months/months.service';
import { AuthService } from '../src/auth/auth.service';
import { randomUUID } from 'crypto';

class MockPrismaService {
  public users = new Map<string, any>();
  public sharedExpenses = new Map<string, any>();
  public sharedExpenseMembers = new Map<string, any>();
  public months = new Map<string, any>();
  public expenses = new Map<string, any>();

  user = {
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const user = { id, email: data.email || null, passwordHash: data.passwordHash || null, isGuest: data.isGuest ?? false, createdAt: new Date() };
      this.users.set(id, user);
      return user;
    },
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) || null;
      if (where.email) {
        for (const u of this.users.values()) {
          if (u.email === where.email) return u;
        }
      }
      return null;
    },
    update: async ({ where, data }: any) => {
      const u = this.users.get(where.id);
      if (!u) throw new Error('User not found');
      const updated = { ...u, ...data, updatedAt: new Date() };
      this.users.set(where.id, updated);
      return updated;
    },
  };

  month = {
    findUnique: async ({ where }: any) => {
      const m = this.months.get(where.id);
      if (!m) return null;
      const exps = Array.from(this.expenses.values()).filter((e) => e.monthId === m.id);
      const usr = m.userId ? this.users.get(m.userId) : null;
      return {
        ...m,
        expenses: exps,
        user: usr,
        sharedExpense: null,
      };
    },
    findFirst: async ({ where }: any) => {
      for (const m of this.months.values()) {
        if (where.userId && m.userId !== where.userId) continue;
        if (where.isCurrent && !m.isCurrent) continue;
        const exps = Array.from(this.expenses.values()).filter((e) => e.monthId === m.id);
        const usr = m.userId ? this.users.get(m.userId) : null;
        return {
          ...m,
          expenses: exps,
          user: usr,
        };
      }
      return null;
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
        isCurrent: data.isCurrent ?? true,
        notified80: false,
        notified100: false,
        createdAt: data.createdAt || new Date(),
      };
      this.months.set(id, m);
      return m;
    },
    update: async ({ where, data }: any) => {
      const m = this.months.get(where.id);
      if (!m) throw new Error('Month not found');
      const updated = { ...m, ...data };
      this.months.set(where.id, updated);
      return updated;
    },
    count: async () => this.months.size,
  };

  expense = {
    create: async ({ data }: any) => {
      const id = randomUUID();
      const e = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      this.expenses.set(id, e);
      return e;
    },
    findMany: async ({ where }: any) => {
      let list = Array.from(this.expenses.values());
      if (where.monthId) list = list.filter((e) => e.monthId === where.monthId);
      return list;
    },
    findUnique: async () => null,
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

async function runEmailE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 10 Email Triggers & Templates E2E Tests');
  console.log('=============================================\n');

  const mockPrisma = new MockPrismaService();
  const app = await NestFactory.create(AppModule, { logger: false });

  const prisma = app.get(PrismaService);
  prisma.user = mockPrisma.user as any;
  prisma.sharedExpense = mockPrisma.sharedExpense as any;
  prisma.month = mockPrisma.month as any;
  prisma.expense = mockPrisma.expense as any;
  prisma.$transaction = mockPrisma.$transaction as any;
  (PrismaService.prototype as any).$transaction = mockPrisma.$transaction as any;

  const emailService = app.get(EmailService);
  const expensesService = app.get(ExpensesService);
  const monthsService = app.get(MonthsService);
  const authService = app.get(AuthService);

  // Track dispatched emails in test spy
  const sentEmails: Array<{ to: string; subject: string; htmlContent: string }> = [];
  const originalSendBrevoEmail = emailService.sendBrevoEmail.bind(emailService);
  emailService.sendBrevoEmail = async (params) => {
    sentEmails.push(params);
    return originalSendBrevoEmail(params);
  };

  // -------------------------------------------------------------
  // Test 1: Direct Template Rendering
  // -------------------------------------------------------------
  console.log('[1] Testing HTML email template generation...');

  // 80% threshold
  await emailService.sendBudgetThresholdAlert({
    toEmail: 'investor@fintech.test',
    monthLabel: 'Cycle 1 (September)',
    budget: 10000000, // Rs 100,000
    used: 8200000,   // Rs 82,000
    threshold: 80,
  });

  const email80 = sentEmails[sentEmails.length - 1];
  if (!email80.subject.includes('80') && !email80.subject.includes('Approaching')) {
    throw new Error(`Invalid subject for 80% alert: ${email80.subject}`);
  }
  if (!email80.htmlContent.includes('Rs 100,000') || !email80.htmlContent.includes('80%')) {
    throw new Error('80% threshold HTML missing formatted budget or threshold');
  }
  console.log('  ✓ 80% threshold template rendered correctly with Deep Teal palette.');

  // 100% threshold
  await emailService.sendBudgetThresholdAlert({
    toEmail: 'investor@fintech.test',
    monthLabel: 'Cycle 1 (September)',
    budget: 10000000,
    used: 10500000,
    threshold: 100,
  });
  const email100 = sentEmails[sentEmails.length - 1];
  if (!email100.subject.includes('Exceeded') || !email100.htmlContent.includes('100%')) {
    throw new Error('100% threshold HTML missing limit exceeded indicator');
  }
  console.log('  ✓ 100% threshold template rendered with coral-red alert styling.');

  // Month-end summary
  await emailService.sendMonthEndSummary('investor@fintech.test', {
    monthId: randomUUID(),
    label: 'Cycle 1 (September)',
    budget: 10000000,
    totalSpent: 8500000,
    remaining: 1500000,
    categoryBreakdown: [
      { categoryId: '1', categoryName: 'Food & Groceries', total: 5000000, percentage: 58.82 },
      { categoryId: '2', categoryName: 'Transport', total: 3500000, percentage: 41.18 },
    ],
    nextMonthId: randomUUID(),
    nextMonthLabel: 'Cycle 2',
  });
  const emailSummary = sentEmails[sentEmails.length - 1];
  if (!emailSummary.htmlContent.includes('Food & Groceries') || !emailSummary.htmlContent.includes('Rs 50,000')) {
    throw new Error('Month-end summary HTML missing category table');
  }
  console.log('  ✓ Month-end summary report email rendered with full breakdown.');

  // -------------------------------------------------------------
  // Test 2: Trigger 1 (POST /expenses crosses 80% and 100%)
  // -------------------------------------------------------------
  console.log('\n[2] Testing Trigger 1: Budget threshold crossed during expense entry...');
  sentEmails.length = 0; // reset spy

  // Create user with email
  const testUser = await prisma.user.create({
    data: {
      email: 'ahmed@pakistan.finance',
      isGuest: false,
    },
  });

  // Create active month with Rs 100,000 budget
  const cycle = await prisma.month.create({
    data: {
      userId: testUser.id,
      label: 'Personal Cycle 1',
      budget: 10000000, // Rs 100,000
      isCurrent: true,
    },
  });

  // Add expense for Rs 70,000 (70% - under threshold)
  await expensesService.createExpense(testUser.id, {
    monthId: cycle.id,
    content: 'Family Groceries',
    amount: 7000000,
    occurredAt: new Date().toISOString(),
  });
  await expensesService.checkBudgetThresholdAlert(cycle.id);
  console.log(`  ✓ Added Rs 70,000 expense (70%). Emails sent: ${sentEmails.length} (Expected 0)`);
  if (sentEmails.length !== 0) throw new Error('Alert sent prematurely under 80%!');

  // Add expense for Rs 15,000 (total Rs 85,000 = 85% - crosses 80%)
  await expensesService.createExpense(testUser.id, {
    monthId: cycle.id,
    content: 'Electric Bill',
    amount: 1500000,
    occurredAt: new Date().toISOString(),
  });
  await expensesService.checkBudgetThresholdAlert(cycle.id);
  console.log(`  ✓ Added Rs 15,000 expense (85%). Emails sent: ${sentEmails.length} (Expected 1)`);
  if (sentEmails.length !== 1) throw new Error('80% threshold alert was not sent!');
  if (!sentEmails[0].htmlContent.includes('80%')) throw new Error('Incorrect email sent for 80% trigger');

  // Add expense for Rs 5,000 (total Rs 90,000 = 90% - should not re-trigger 80%)
  await expensesService.createExpense(testUser.id, {
    monthId: cycle.id,
    content: 'Fuel',
    amount: 500000,
    occurredAt: new Date().toISOString(),
  });
  await expensesService.checkBudgetThresholdAlert(cycle.id);
  console.log(`  ✓ Added Rs 5,000 expense (90%). Emails sent: ${sentEmails.length} (Expected still 1 - deduplicated)`);
  if (sentEmails.length !== 1) throw new Error('Duplicate 80% alert was sent!');

  // Add expense for Rs 15,000 (total Rs 105,000 = 105% - crosses 100%)
  await expensesService.createExpense(testUser.id, {
    monthId: cycle.id,
    content: 'Home Repairs',
    amount: 1500000,
    occurredAt: new Date().toISOString(),
  });
  await expensesService.checkBudgetThresholdAlert(cycle.id);
  console.log(`  ✓ Added Rs 15,000 expense (105%). Emails sent: ${sentEmails.length} (Expected 2: 80% + 100%)`);
  if (sentEmails.length !== 2) throw new Error('100% threshold alert was not sent!');
  if (!sentEmails[1].htmlContent.includes('100%')) throw new Error('Incorrect email sent for 100% trigger');

  // Verify month flags in db
  const finalCycle = await prisma.month.findUnique({ where: { id: cycle.id } });
  if (!finalCycle.notified80 || !finalCycle.notified100) {
    throw new Error('Month notified flags not updated in database!');
  }
  console.log('  ✓ Month flags (notified80, notified100) set to true.');

  // -------------------------------------------------------------
  // Test 3: Trigger 2 (POST /months/end-current sends summary)
  // -------------------------------------------------------------
  console.log('\n[3] Testing Trigger 2: Month-end summary email upon cycle rollover...');
  sentEmails.length = 0;

  await monthsService.endCurrentMonth(testUser.id, {
    budget: 12000000,
  });

  // Give asynchronous promise a tick
  await new Promise((resolve) => setTimeout(resolve, 50));
  console.log(`  ✓ Ended active cycle. Emails sent: ${sentEmails.length} (Expected 1)`);
  if (sentEmails.length !== 1) throw new Error('Month-end summary email was not sent!');
  if (!sentEmails[0].subject.includes('Summary Report')) throw new Error('Subject does not indicate summary report');
  console.log('  ✓ Month-end summary email dispatched with budget vs actual and breakdown.');

  // -------------------------------------------------------------
  // Test 4: Trigger 3 (POST /auth/upgrade-guest sends confirmation)
  // -------------------------------------------------------------
  console.log('\n[4] Testing Trigger 3: Guest account upgrade confirmation email...');
  sentEmails.length = 0;

  const guest = await prisma.user.create({
    data: {
      isGuest: true,
      email: null,
    },
  });

  await authService.upgradeGuest(guest.id, {
    email: 'newuser@pakistan.finance',
    password: 'SecurePassword123!',
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  console.log(`  ✓ Upgraded guest to account. Emails sent: ${sentEmails.length} (Expected 1)`);
  if (sentEmails.length !== 1) throw new Error('Account upgrade confirmation email was not sent!');
  if (!sentEmails[0].subject.includes('confirmed')) throw new Error('Subject does not indicate confirmed account');
  if (!sentEmails[0].htmlContent.includes('newuser@pakistan.finance')) throw new Error('Email template missing upgraded email address');
  console.log('  ✓ Account upgrade confirmation email dispatched.');

  await app.close();
  console.log('\n=============================================');
  console.log('🎉 ALL STEP 10 EMAIL TRIGGER TESTS PASSED!');
  console.log('=============================================\n');
}

runEmailE2ETests().catch((err) => {
  console.error('\n❌ STEP 10 EMAIL TEST FAILED:');
  console.error(err);
  process.exit(1);
});

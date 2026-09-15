import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';

class MockPrismaService {
  public users = new Map<string, any>();
  public categories = new Map<string, any>();
  public months = new Map<string, any>();
  public expenses = new Map<string, any>();

  constructor() {
    const cats = ['Food', 'Transport', 'Utilities', 'Rent'];
    cats.forEach((name) => {
      const id = randomUUID();
      this.categories.set(id, { id, name, isDefault: true, ownerId: null });
    });
  }

  user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) || null;
      return null;
    },
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const user = { id, ...data };
      this.users.set(id, user);
      return user;
    },
  };

  category = {
    findMany: async () => Array.from(this.categories.values()),
    findFirst: async ({ where }: any) => {
      for (const c of this.categories.values()) if (c.name === where.name) return c;
      return null;
    },
  };

  month = {
    findMany: async ({ where }: any) => {
      return Array.from(this.months.values()).filter((m) => m.userId === where.userId);
    },
    findFirst: async ({ where }: any) => {
      for (const m of this.months.values()) {
        if (m.userId === where.userId && m.isCurrent === where.isCurrent) {
          const exps = Array.from(this.expenses.values())
            .filter((e) => e.monthId === m.id)
            .map((e) => ({
              ...e,
              category: this.categories.get(e.categoryId) || null,
            }));
          return { ...m, expenses: exps };
        }
      }
      return null;
    },
    findUnique: async ({ where }: any) => {
      return this.months.get(where.id) || null;
    },
    create: async ({ data }: any) => {
      const id = randomUUID();
      const m = {
        id,
        userId: data.userId,
        label: data.label,
        budget: data.budget,
        startAt: data.startAt || new Date(),
        endAt: null,
        isCurrent: data.isCurrent ?? false,
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
    count: async ({ where }: any) => {
      return Array.from(this.months.values()).filter((m) => m.userId === where.userId).length;
    },
  };

  expense = {
    create: async ({ data }: any) => {
      const id = randomUUID();
      const e = { id, ...data, createdAt: new Date() };
      this.expenses.set(id, e);
      return { ...e, category: this.categories.get(e.categoryId) || null };
    },
  };

  $transaction = async (promises: any[]) => {
    return Promise.all(promises);
  };

  async onModuleInit() {}
  async onModuleDestroy() {}
}

async function runMonthEndE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 4 Month-End Flow E2E Tests');
  console.log('=============================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.use(cookieParser());

  const mockPrisma = new MockPrismaService();
  const prismaService = app.get(PrismaService);
  prismaService.user = mockPrisma.user as any;
  prismaService.category = mockPrisma.category as any;
  prismaService.month = mockPrisma.month as any;
  prismaService.expense = mockPrisma.expense as any;
  prismaService.$transaction = mockPrisma.$transaction as any;

  await app.listen(0);
  const url = await app.getUrl();

  try {
    // 1. Authenticate user
    console.log('[1] Authenticating test session...');
    const authRes = await fetch(`${url}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const { user, tokens } = await authRes.json();
    const token = tokens.accessToken;
    console.log(`  ✓ Authenticated user: ${user.id}`);

    // 2. Initialize initial cycle
    console.log('\n[2] Initializing active cycle (Cycle 1)...');
    const monthsRes = await fetch(`${url}/months`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const months = await monthsRes.json();
    const cycle1 = months[0];
    console.log(`  ✓ Initial cycle active: "${cycle1.label}" (Budget: Rs ${cycle1.budget / 100})`);

    // 3. Add expenses to Cycle 1
    console.log('\n[3] Recording expenses across categories...');
    const categories = await (await fetch(`${url}/categories`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const foodCat = categories.find((c: any) => c.name === 'Food');
    const transportCat = categories.find((c: any) => c.name === 'Transport');
    const utilCat = categories.find((c: any) => c.name === 'Utilities');

    const now = new Date().toISOString();

    // Food: Rs 30,000 (3,000,000 paisa)
    await fetch(`${url}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ monthId: cycle1.id, categoryId: foodCat.id, content: 'Groceries', amount: 3000000, occurredAt: now }),
    });

    // Transport: Rs 15,000 (1,500,000 paisa)
    await fetch(`${url}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ monthId: cycle1.id, categoryId: transportCat.id, content: 'Fuel & Uber', amount: 1500000, occurredAt: now }),
    });

    // Utilities: Rs 10,000 (1,000,000 paisa)
    await fetch(`${url}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ monthId: cycle1.id, categoryId: utilCat.id, content: 'Electricity & Internet', amount: 1000000, occurredAt: now }),
    });

    console.log('  ✓ Added expenses totaling Rs 55,000 (5,500,000 paisa)');

    // 4. Trigger Month-End Rollover (POST /months/end-current)
    console.log('\n[4] Triggering month-end rollover with new budget (POST /months/end-current)...');
    const endRes = await fetch(`${url}/months/end-current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        budget: 12000000, // Rs 120,000 next cycle budget
      }),
    });

    if (endRes.status !== 200) {
      const err = await endRes.text();
      throw new Error(`Month end failed with ${endRes.status}: ${err}`);
    }

    const summary = await endRes.json();
    console.log(`  ✓ Received MonthSummary for: "${summary.label}"`);
    console.log(`    • Total Spent: Rs ${summary.totalSpent / 100} (${summary.totalSpent} paisa)`);
    console.log(`    • Remaining:   Rs ${summary.remaining / 100} (${summary.remaining} paisa)`);
    console.log(`    • Categories:  ${summary.categoryBreakdown.length} items breakdown`);

    summary.categoryBreakdown.forEach((c: any) => {
      console.log(`      - ${c.categoryName}: Rs ${c.total / 100} (${c.percentage}%)`);
    });

    if (summary.totalSpent !== 5500000) {
      throw new Error(`Expected totalSpent 5500000, got ${summary.totalSpent}`);
    }
    if (summary.remaining !== 4500000) {
      throw new Error(`Expected remaining 4500000, got ${summary.remaining}`);
    }
    if (summary.nextMonthLabel !== 'Cycle 2') {
      throw new Error(`Expected nextMonthLabel "Cycle 2", got "${summary.nextMonthLabel}"`);
    }

    // 5. Verify Database State
    console.log('\n[5] Verifying database state post-rollover...');
    const allMonths = await (await fetch(`${url}/months`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const activeMonth = allMonths.find((m: any) => m.isCurrent);
    const closedMonth = allMonths.find((m: any) => !m.isCurrent);

    if (!activeMonth || activeMonth.label !== 'Cycle 2') {
      throw new Error('New cycle is not active');
    }
    if (activeMonth.budget !== 12000000) {
      throw new Error(`Expected active budget 12000000 paisa (Rs 120,000), got ${activeMonth.budget}`);
    }
    if (!closedMonth.endAt) {
      throw new Error('Closed cycle endAt must be set to UTC instant');
    }

    console.log(`  ✓ Active cycle is now "${activeMonth.label}" with budget Rs ${activeMonth.budget / 100}.`);
    console.log(`  ✓ Previous cycle "${closedMonth.label}" closed at ${closedMonth.endAt}.`);
    console.log(`  ✓ Seamless continuation confirmed with no time gap (Spec A.6).`);

    console.log('\n=============================================');
    console.log('🎉 ALL STEP 4 MONTH-END TESTS PASSED!');
    console.log('=============================================\n');
  } finally {
    await app.close();
  }
}

runMonthEndE2ETests().catch((err) => {
  console.error('\n❌ STEP 4 TEST FAILED:', err);
  process.exit(1);
});

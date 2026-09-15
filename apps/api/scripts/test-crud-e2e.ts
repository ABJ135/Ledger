import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';

interface MockCategory {
  id: string;
  name: string;
  isDefault: boolean;
  ownerId: string | null;
  createdAt: Date;
}

interface MockMonth {
  id: string;
  userId: string | null;
  sharedExpenseId: string | null;
  label: string;
  budget: number;
  startAt: Date;
  endAt: Date | null;
  isCurrent: boolean;
  notified80: boolean;
  notified100: boolean;
  createdAt: Date;
}

interface MockExpense {
  id: string;
  monthId: string;
  categoryId: string | null;
  content: string;
  amount: number;
  occurredAt: Date;
  createdByUserId: string;
  syncStatus: string;
  clientId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

class MockPrismaService {
  public users = new Map<string, any>();
  public categories = new Map<string, MockCategory>();
  public months = new Map<string, MockMonth>();
  public expenses = new Map<string, MockExpense>();

  constructor() {
    // Seed default categories
    const defaults = ['Food', 'Transport', 'Utilities', 'Rent', 'Shopping', 'Health', 'Entertainment', 'Other'];
    defaults.forEach((name) => {
      const id = randomUUID();
      this.categories.set(id, {
        id,
        name,
        isDefault: true,
        ownerId: null,
        createdAt: new Date(),
      });
    });
  }

  user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) || null;
      if (where.email) {
        for (const u of this.users.values()) if (u.email === where.email) return u;
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const user = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      this.users.set(id, user);
      return user;
    },
  };

  category = {
    findMany: async ({ where }: any) => {
      const all = Array.from(this.categories.values());
      return all.filter((c) => {
        if (c.isDefault) return true;
        if (where?.OR) {
          return where.OR.some((clause: any) => clause.ownerId === c.ownerId);
        }
        return false;
      });
    },
    findFirst: async ({ where }: any) => {
      for (const c of this.categories.values()) {
        if (c.name === where.name) return c;
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = randomUUID();
      const cat = { id, ...data, createdAt: new Date() };
      this.categories.set(id, cat);
      return cat;
    },
  };

  month = {
    findMany: async ({ where }: any) => {
      return Array.from(this.months.values()).filter((m) => m.userId === where.userId);
    },
    findUnique: async ({ where }: any) => {
      const m = this.months.get(where.id);
      if (!m) return null;
      const exps = Array.from(this.expenses.values())
        .filter((e) => e.monthId === m.id)
        .map((e) => ({
          ...e,
          category: e.categoryId ? this.categories.get(e.categoryId) || null : null,
        }));
      return { ...m, expenses: exps };
    },
    create: async ({ data }: any) => {
      const id = randomUUID();
      const month = {
        id,
        userId: data.userId || null,
        sharedExpenseId: data.sharedExpenseId || null,
        label: data.label,
        budget: data.budget,
        startAt: data.startAt || new Date(),
        endAt: null,
        isCurrent: data.isCurrent ?? false,
        notified80: false,
        notified100: false,
        createdAt: new Date(),
      };
      this.months.set(id, month);
      return month;
    },
    update: async ({ where, data }: any) => {
      const existing = this.months.get(where.id);
      if (!existing) throw new Error('Month not found');
      const updated = { ...existing, ...data };
      this.months.set(where.id, updated);
      return updated;
    },
    delete: async ({ where }: any) => {
      this.months.delete(where.id);
      return {};
    },
  };

  expense = {
    create: async ({ data }: any) => {
      const id = randomUUID();
      const exp = {
        id,
        monthId: data.monthId,
        categoryId: data.categoryId || null,
        content: data.content,
        amount: data.amount,
        occurredAt: data.occurredAt || new Date(),
        createdByUserId: data.createdByUserId,
        syncStatus: 'synced',
        clientId: data.clientId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.expenses.set(id, exp);
      const cat = exp.categoryId ? this.categories.get(exp.categoryId) || null : null;
      return { ...exp, category: cat };
    },
    findUnique: async ({ where }: any) => {
      const exp = this.expenses.get(where.id);
      if (!exp) return null;
      const m = this.months.get(exp.monthId);
      const cat = exp.categoryId ? this.categories.get(exp.categoryId) || null : null;
      return { ...exp, month: m, category: cat };
    },
    update: async ({ where, data }: any) => {
      const existing = this.expenses.get(where.id);
      if (!existing) throw new Error('Expense not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.expenses.set(where.id, updated);
      const cat = updated.categoryId ? this.categories.get(updated.categoryId) || null : null;
      return { ...updated, category: cat };
    },
    delete: async ({ where }: any) => {
      this.expenses.delete(where.id);
      return {};
    },
    deleteMany: async ({ where }: any) => {
      for (const [id, e] of this.expenses.entries()) {
        if (e.monthId === where.monthId) this.expenses.delete(id);
      }
      return {};
    },
  };

  async onModuleInit() {}
  async onModuleDestroy() {}
}

async function runCrudE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 3 Personal Expense CRUD Tests');
  console.log('=============================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.use(cookieParser());

  const mockPrisma = new MockPrismaService();
  const prismaService = app.get(PrismaService);
  prismaService.user = mockPrisma.user as any;
  prismaService.category = mockPrisma.category as any;
  prismaService.month = mockPrisma.month as any;
  prismaService.expense = mockPrisma.expense as any;

  await app.listen(0);
  const url = await app.getUrl();
  console.log(`Server listening on: ${url}`);

  try {
    // 1. Authenticate as Guest
    console.log('[1] Authenticating test user...');
    const authRes = await fetch(`${url}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const authData = await authRes.json();
    const token = authData.tokens.accessToken;
    console.log(`  ✓ Authenticated as guest user: ${authData.user.id}`);

    // 2. Categories
    console.log('\n[2] Testing categories API...');
    const catRes = await fetch(`${url}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const categories = await catRes.json();
    console.log(`  ✓ Loaded ${categories.length} default categories.`);

    const foodCat = categories.find((c: any) => c.name === 'Food');
    if (!foodCat) throw new Error('Default Food category missing');

    const newCatRes = await fetch(`${url}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Tech Gadgets' }),
    });
    const newCat = await newCatRes.json();
    console.log(`  ✓ Created custom category: "${newCat.name}" (id: ${newCat.id})`);

    // 3. Months List (Auto-creates initial cycle)
    console.log('\n[3] Testing months listing & auto-creation...');
    const monthsRes = await fetch(`${url}/months`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const months = await monthsRes.json();
    if (months.length === 0) throw new Error('Expected initial cycle to be created');
    const currentMonth = months[0];
    console.log(`  ✓ Month cycle available: "${currentMonth.label}" (Budget: Rs ${currentMonth.budget / 100})`);

    // 4. Create Expenses (Integer Paisa)
    console.log('\n[4] Creating expenses in integer paisa...');
    const nowUtc = new Date().toISOString();

    const exp1Res = await fetch(`${url}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        monthId: currentMonth.id,
        categoryId: foodCat.id,
        content: 'Supermarket weekly grocery',
        amount: 450000, // Rs 4,500 in paisa
        occurredAt: nowUtc,
      }),
    });
    const exp1 = await exp1Res.json();
    console.log(`  ✓ Created expense 1: "${exp1.content}" - ${exp1.amount} paisa (Rs ${exp1.amount / 100})`);

    const exp2Res = await fetch(`${url}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        monthId: currentMonth.id,
        categoryId: newCat.id,
        content: 'USB-C Cable',
        amount: 150000, // Rs 1,500 in paisa
        occurredAt: nowUtc,
      }),
    });
    const exp2 = await exp2Res.json();
    console.log(`  ✓ Created expense 2: "${exp2.content}" - ${exp2.amount} paisa (Rs ${exp2.amount / 100})`);

    // 5. Verify Server-Authoritative Totals (Rule 6)
    console.log('\n[5] Verifying server-authoritative totals (Rule 6)...');
    const detailRes = await fetch(`${url}/months/${currentMonth.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const monthDetail = await detailRes.json();
    const { budget, used, remaining, percentageUsed } = monthDetail.totals;

    console.log(`  • Budget:    Rs ${budget / 100} (${budget} paisa)`);
    console.log(`  • Used:      Rs ${used / 100} (${used} paisa)`);
    console.log(`  • Remaining: Rs ${remaining / 100} (${remaining} paisa)`);
    console.log(`  • Used %:    ${percentageUsed}%`);

    if (used !== 600000) {
      throw new Error(`Expected used total 600000 paisa, got ${used}`);
    }
    if (remaining !== 9400000) {
      throw new Error(`Expected remaining total 9400000 paisa, got ${remaining}`);
    }
    if (percentageUsed !== 6) {
      throw new Error(`Expected percentageUsed 6%, got ${percentageUsed}%`);
    }
    console.log('  ✓ Server-authoritative totals match expected math exactly!');

    // 6. Update Expense (Cell Edit)
    console.log('\n[6] Testing cell update (PATCH /expenses/:id)...');
    const updateRes = await fetch(`${url}/expenses/${exp2.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: 'High-speed Braided USB-C Cable',
        amount: 200000, // Updated to Rs 2,000
      }),
    });
    const updatedExp = await updateRes.json();
    console.log(`  ✓ Updated content: "${updatedExp.content}", new amount: Rs ${updatedExp.amount / 100}`);

    // 7. Delete Expense
    console.log('\n[7] Testing delete expense (DELETE /expenses/:id)...');
    const deleteRes = await fetch(`${url}/expenses/${exp1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (deleteRes.status !== 204) {
      throw new Error(`Expected 204 No Content, got ${deleteRes.status}`);
    }
    console.log('  ✓ Expense deleted.');

    console.log('\n=============================================');
    console.log('🎉 ALL STEP 3 BACKEND CRUD TESTS PASSED!');
    console.log('=============================================\n');
  } finally {
    await app.close();
  }
}

runCrudE2ETests().catch((err) => {
  console.error('\n❌ CRUD TEST FAILED:', err);
  process.exit(1);
});

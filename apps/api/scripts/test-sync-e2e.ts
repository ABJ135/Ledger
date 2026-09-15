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
    const defaults = ['Food', 'Transport', 'Utilities', 'Rent', 'Shopping', 'Health', 'Entertainment', 'Other'];
    defaults.forEach((name) => {
      const id = randomUUID();
      this.categories.set(id, { id, name, isDefault: true, ownerId: null, createdAt: new Date() });
    });
  }

  user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) || null;
      if (where.email) {
        for (const u of this.users.values()) {
          if (u.email === where.email) return u;
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const user = { id, email: data.email || null, passwordHash: data.passwordHash || null, isGuest: data.isGuest ?? false, createdAt: new Date(), updatedAt: new Date() };
      this.users.set(id, user);
      return user;
    },
  };

  category = {
    findMany: async () => Array.from(this.categories.values()),
  };

  month = {
    findFirst: async ({ where }: any) => {
      for (const m of this.months.values()) {
        if (where.id && m.id !== where.id) continue;
        if (where.userId && m.userId !== where.userId) continue;
        return m;
      }
      return null;
    },
    findMany: async ({ where }: any) => {
      return Array.from(this.months.values()).filter((m) => {
        if (where?.userId && m.userId !== where.userId) return false;
        if (where?.createdAt?.gt && m.createdAt <= where.createdAt.gt) return false;
        return true;
      });
    },
    findUnique: async ({ where }: any) => this.months.get(where.id) || null,
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
        notified80: false,
        notified100: false,
        createdAt: new Date(),
      };
      this.months.set(id, m);
      return m;
    },
    count: async ({ where }: any) => {
      return Array.from(this.months.values()).filter((m) => m.userId === where.userId).length;
    },
  };

  expense = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.expenses.get(where.id) || null;
      if (where.clientId) {
        for (const e of this.expenses.values()) {
          if (e.clientId === where.clientId) return e;
        }
      }
      return null;
    },
    findMany: async ({ where }: any) => {
      return Array.from(this.expenses.values()).filter((e) => {
        if (where?.updatedAt?.gt && e.updatedAt <= where.updatedAt.gt) return false;
        return true;
      });
    },
    create: async ({ data }: any) => {
      const id = randomUUID();
      const e = {
        id,
        ...data,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
      };
      this.expenses.set(id, e);
      return e;
    },
    update: async ({ where, data }: any) => {
      const e = this.expenses.get(where.id);
      if (!e) throw new Error('Expense not found');
      const updated = { ...e, ...data };
      this.expenses.set(where.id, updated);
      return updated;
    },
    delete: async ({ where }: any) => {
      const e = this.expenses.get(where.id);
      if (e) this.expenses.delete(where.id);
      return e;
    },
  };

  $transaction = async (promises: any[]) => Promise.all(promises);
  async onModuleInit() {}
  async onModuleDestroy() {}
}

async function runSyncE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 6 Mobile Sync Protocol E2E Tests');
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
    console.log(`  ✓ Active cycle initialized: "${cycle1.label}" (ID: ${cycle1.id})`);

    // 3. Test POST /sync/push with offline expenses
    console.log('\n[3] Testing POST /sync/push with offline-created expenses...');
    const client1 = randomUUID();
    const client2 = randomUUID();
    const client3 = randomUUID();

    const t1 = new Date(Date.now() - 60000).toISOString();
    const pushRes = await fetch(`${url}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        expenses: [
          {
            clientId: client1,
            monthId: cycle1.id,
            content: 'Offline Groceries',
            amount: 350000, // Rs 3,500
            occurredAt: t1,
            updatedAt: t1,
          },
          {
            clientId: client2,
            monthId: cycle1.id,
            content: 'Offline Fuel',
            amount: 200000, // Rs 2,000
            occurredAt: t1,
            updatedAt: t1,
          },
          {
            clientId: client3,
            monthId: cycle1.id,
            content: 'Offline Chai',
            amount: 15000, // Rs 150
            occurredAt: t1,
            updatedAt: t1,
          },
        ],
      }),
    });

    const pushData = await pushRes.json();
    if (!pushData.success || pushData.syncedCount !== 3) {
      throw new Error(`Expected syncedCount 3, got: ${JSON.stringify(pushData)}`);
    }
    console.log(`  ✓ Successfully pushed 3 offline expenses (syncedCount: ${pushData.syncedCount})`);

    // Verify stored state
    const savedExp1 = mockPrisma.expense.findUnique({ where: { clientId: client1 } });
    if (!savedExp1 || (await savedExp1).amount !== 350000 || (await savedExp1).syncStatus !== 'synced') {
      throw new Error(`Verification failed for client1: ${JSON.stringify(await savedExp1)}`);
    }
    console.log('  ✓ Records saved with syncStatus: "synced" and integer paisa standard');

    // 4. Test Last-Write-Wins Conflict Rule (Spec A.8)
    console.log('\n[4] Testing Conflict Rule: Last-Write-Wins by updatedAt...');
    
    // 4a. Newer update should succeed
    const newerTime = new Date(Date.now() + 5000).toISOString();
    await fetch(`${url}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        expenses: [
          {
            clientId: client1,
            monthId: cycle1.id,
            content: 'Offline Groceries (Supermarket Updated)',
            amount: 420000, // Rs 4,200
            occurredAt: t1,
            updatedAt: newerTime,
          },
        ],
      }),
    });

    const updatedExp1 = await mockPrisma.expense.findUnique({ where: { clientId: client1 } });
    if (updatedExp1?.amount !== 420000 || updatedExp1?.content !== 'Offline Groceries (Supermarket Updated)') {
      throw new Error(`Expected newer update to apply, got: ${JSON.stringify(updatedExp1)}`);
    }
    console.log('  ✓ Newer update applied successfully (amount updated to Rs 4,200)');

    // 4b. Older update should be ignored (stale)
    const olderTime = new Date(Date.now() - 120000).toISOString();
    await fetch(`${url}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        expenses: [
          {
            clientId: client1,
            monthId: cycle1.id,
            content: 'Stale Old Content',
            amount: 100000,
            occurredAt: t1,
            updatedAt: olderTime,
          },
        ],
      }),
    });

    const staleExp1 = await mockPrisma.expense.findUnique({ where: { clientId: client1 } });
    if (staleExp1?.amount !== 420000 || staleExp1?.content !== 'Offline Groceries (Supermarket Updated)') {
      throw new Error(`Stale write erroneously overwrote newer write: ${JSON.stringify(staleExp1)}`);
    }
    console.log('  ✓ Stale update safely ignored under Last-Write-Wins rule');

    // 5. Test GET /sync/pull?since=...
    console.log('\n[5] Testing GET /sync/pull?since=...');
    const pullSince = new Date(Date.now() - 300000).toISOString();
    const pullRes = await fetch(`${url}/sync/pull?since=${encodeURIComponent(pullSince)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pullData = await pullRes.json();
    if (!pullData.serverTime || pullData.expenses.length < 3) {
      throw new Error(`Pull returned unexpected result: ${JSON.stringify(pullData)}`);
    }
    console.log(`  ✓ Pulled ${pullData.expenses.length} modified expenses and ${pullData.months.length} cycles (serverTime: ${pullData.serverTime})`);

    // 6. Test Deletion via Sync
    console.log('\n[6] Testing offline deletion push (deleted: true)...');
    await fetch(`${url}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        expenses: [
          {
            clientId: client3,
            monthId: cycle1.id,
            content: 'Offline Chai',
            amount: 15000,
            occurredAt: t1,
            updatedAt: new Date().toISOString(),
            deleted: true,
          },
        ],
      }),
    });

    const deletedExp3 = await mockPrisma.expense.findUnique({ where: { clientId: client3 } });
    if (deletedExp3 !== null) {
      throw new Error(`Expected client3 to be deleted, got: ${JSON.stringify(deletedExp3)}`);
    }
    console.log('  ✓ Deleted record successfully removed from database');

    console.log('\n=============================================');
    console.log('🎉 ALL STEP 6 SYNC PROTOCOL TESTS PASSED!');
    console.log('=============================================\n');
  } finally {
    await app.close();
  }
}

runSyncE2ETests().catch((err) => {
  console.error('\n❌ STEP 6 TEST FAILED:', err);
  process.exit(1);
});

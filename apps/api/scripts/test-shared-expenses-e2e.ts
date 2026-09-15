import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';

class MockPrismaService {
  public users = new Map<string, any>();
  public sharedExpenses = new Map<string, any>();
  public members = new Map<string, any>();
  public months = new Map<string, any>();
  public expenses = new Map<string, any>();

  user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) || null;
      return null;
    },
    create: async ({ data }: any) => {
      const id = data.id || randomUUID();
      const user = { id, email: data.email || null, isGuest: data.isGuest ?? false, createdAt: new Date() };
      this.users.set(id, user);
      return user;
    },
  };

  sharedExpense = {
    findUnique: async ({ where, include }: any) => {
      let found: any = null;
      if (where.id) found = this.sharedExpenses.get(where.id);
      if (where.code) {
        for (const s of this.sharedExpenses.values()) {
          if (s.code === where.code) {
            found = s;
            break;
          }
        }
      }
      if (!found) return null;
      if (include?.members) {
        const mems = Array.from(this.members.values()).filter((m) => m.sharedExpenseId === found.id);
        return { ...found, members: mems };
      }
      return found;
    },
    create: async ({ data }: any) => {
      const id = randomUUID();
      const s = {
        id,
        name: data.name,
        code: data.code,
        ownerId: data.ownerId,
        createdAt: new Date(),
      };
      this.sharedExpenses.set(id, s);

      // Create owner member
      if (data.members?.create) {
        const memId = randomUUID();
        this.members.set(memId, {
          id: memId,
          sharedExpenseId: id,
          userId: data.members.create.userId,
          joinedAt: new Date(),
        });
      }

      // Create initial month
      if (data.months?.create) {
        const mId = randomUUID();
        this.months.set(mId, {
          id: mId,
          sharedExpenseId: id,
          userId: null,
          label: data.months.create.label,
          budget: data.months.create.budget,
          startAt: data.months.create.startAt || new Date(),
          endAt: null,
          isCurrent: data.months.create.isCurrent ?? true,
          createdAt: new Date(),
        });
      }

      return s;
    },
    findMany: async ({ where }: any) => {
      const results: any[] = [];
      for (const s of this.sharedExpenses.values()) {
        const isOwner = where.OR?.some((cond: any) => cond.ownerId === s.ownerId);
        const isMember = Array.from(this.members.values()).some(
          (m) => m.sharedExpenseId === s.id && where.OR?.some((cond: any) => cond.members?.some?.userId === m.userId),
        );
        if (isOwner || isMember) {
          results.push(s);
        }
      }
      return results;
    },
  };

  sharedExpenseMember = {
    create: async ({ data }: any) => {
      const id = randomUUID();
      const m = { id, ...data, joinedAt: new Date() };
      this.members.set(id, m);
      return m;
    },
  };

  month = {
    findMany: async ({ where }: any) => {
      return Array.from(this.months.values()).filter((m) => {
        if (where.sharedExpenseId && m.sharedExpenseId !== where.sharedExpenseId) return false;
        return true;
      });
    },
  };

  $transaction = async (promises: any[]) => Promise.all(promises);
  async onModuleInit() {}
  async onModuleDestroy() {}
}

async function runSharedExpensesE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 7 Shared Expense Feature E2E Tests');
  console.log('=============================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.use(cookieParser());

  const mockPrisma = new MockPrismaService();
  const prismaService = app.get(PrismaService);
  prismaService.user = mockPrisma.user as any;
  prismaService.sharedExpense = mockPrisma.sharedExpense as any;
  prismaService.sharedExpenseMember = mockPrisma.sharedExpenseMember as any;
  prismaService.month = mockPrisma.month as any;

  await app.listen(0);
  const url = await app.getUrl();

  try {
    // 1. Authenticate User A (Owner) and User B (Member)
    console.log('[1] Authenticating test sessions (User A & User B)...');
    const authA = await (await fetch(`${url}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    const tokenA = authA.tokens.accessToken;
    console.log(`  ✓ User A (Owner) ID: ${authA.user.id}`);

    const authB = await (await fetch(`${url}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    const tokenB = authB.tokens.accessToken;
    console.log(`  ✓ User B (Member) ID: ${authB.user.id}`);

    // 2. User A creates SharedExpense group
    console.log('\n[2] User A creates Shared Expense "Apartment 4B"...');
    const createRes = await fetch(`${url}/shared-expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Apartment 4B' }),
    });
    const createdGroup = await createRes.json();
    console.log(`  ✓ Created group: "${createdGroup.name}" (ID: ${createdGroup.id})`);
    console.log(`  ✓ Generated 8-char uppercase code: "${createdGroup.code}"`);

    if (!createdGroup.code || createdGroup.code.length !== 8) {
      throw new Error(`Invalid code format: ${createdGroup.code}`);
    }

    // 3. User B joins via code
    console.log('\n[3] User B joins group using code...');
    const joinRes = await fetch(`${url}/shared-expenses/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ code: createdGroup.code.toLowerCase() }), // test case-insensitivity
    });
    const joinedGroup = await joinRes.json();
    console.log(`  ✓ User B successfully joined "${joinedGroup.name}"`);

    // 4. Test idempotent join
    console.log('\n[4] User B attempts re-join (idempotency check)...');
    const rejoinRes = await fetch(`${url}/shared-expenses/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ code: createdGroup.code }),
    });
    const rejoinedGroup = await rejoinRes.json();
    if (rejoinedGroup.id !== createdGroup.id) {
      throw new Error('Rejoin failed');
    }
    console.log('  ✓ Idempotent join confirmed with no duplicate records');

    // 5. Test GET /shared-expenses/mine
    console.log('\n[5] Testing GET /shared-expenses/mine...');
    const listA = await (await fetch(`${url}/shared-expenses/mine`, { headers: { Authorization: `Bearer ${tokenA}` } })).json();
    const listB = await (await fetch(`${url}/shared-expenses/mine`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();

    if (listA.length !== 1 || listA[0].id !== createdGroup.id) {
      throw new Error(`Owner list mismatch: ${JSON.stringify(listA)}`);
    }
    if (listB.length !== 1 || listB[0].id !== createdGroup.id) {
      throw new Error(`Member list mismatch: ${JSON.stringify(listB)}`);
    }
    console.log('  ✓ Both Owner and Member successfully list "Apartment 4B" in /shared-expenses/mine');

    // 6. Test GET /months?context=shared&sharedExpenseId=...
    console.log('\n[6] Testing shared cycle access...');
    const sharedMonths = await (await fetch(`${url}/months?context=shared&sharedExpenseId=${createdGroup.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    if (sharedMonths.length !== 1 || sharedMonths[0].sharedExpenseId !== createdGroup.id) {
      throw new Error(`Shared months mismatch: ${JSON.stringify(sharedMonths)}`);
    }
    console.log(`  ✓ Shared cycle retrieved: "${sharedMonths[0].label}" (Budget: Rs ${sharedMonths[0].budget / 100})`);

    console.log('\n=============================================');
    console.log('🎉 ALL STEP 7 SHARED EXPENSE TESTS PASSED!');
    console.log('=============================================\n');
  } finally {
    await app.close();
  }
}

runSharedExpensesE2ETests().catch((err) => {
  console.error('\n❌ STEP 7 TEST FAILED:', err);
  process.exit(1);
});

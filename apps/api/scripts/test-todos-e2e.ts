import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';

class MockPrismaService {
  public users = new Map<string, any>();
  public months = new Map<string, any>();
  public expenses = new Map<string, any>();
  public todos = new Map<string, any>();

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

  month = {
    findFirst: async ({ where }: any) => {
      for (const m of this.months.values()) {
        if (where.userId && m.userId !== where.userId) continue;
        if (where.isCurrent && !m.isCurrent) continue;
        return m;
      }
      return null;
    },
    findMany: async ({ where }: any) => {
      return Array.from(this.months.values()).filter((m) => m.userId === where.userId);
    },
    create: async ({ data }: any) => {
      const id = randomUUID();
      const m = {
        id,
        userId: data.userId,
        label: data.label,
        budget: data.budget,
        startAt: new Date(),
        endAt: null,
        isCurrent: data.isCurrent ?? true,
        createdAt: new Date(),
      };
      this.months.set(id, m);
      return m;
    },
  };

  expense = {
    create: async ({ data }: any) => {
      const id = randomUUID();
      const e = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      this.expenses.set(id, e);
      return e;
    },
    findMany: async ({ where }: any) => {
      return Array.from(this.expenses.values()).filter((e) => e.monthId === where.monthId);
    },
  };

  todo = {
    findMany: async ({ where }: any) => {
      return Array.from(this.todos.values()).filter((t) => t.userId === where.userId);
    },
    findFirst: async ({ where }: any) => {
      const t = this.todos.get(where.id);
      if (t && (!where.userId || t.userId === where.userId)) return t;
      return null;
    },
    create: async ({ data }: any) => {
      const id = randomUUID();
      const t = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      this.todos.set(id, t);
      return t;
    },
    update: async ({ where, data }: any) => {
      const t = this.todos.get(where.id);
      if (!t) throw new Error('Todo not found');
      const updated = { ...t, ...data, updatedAt: new Date() };
      this.todos.set(where.id, updated);
      return updated;
    },
    delete: async ({ where }: any) => {
      const t = this.todos.get(where.id);
      if (t) this.todos.delete(where.id);
      return t;
    },
    deleteMany: async ({ where }: any) => {
      let count = 0;
      for (const [id, t] of this.todos.entries()) {
        if (t.userId === where.userId) {
          this.todos.delete(id);
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

async function runTodosE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 8 ToDo Wishlist Feature E2E Tests');
  console.log('=============================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.use(cookieParser());

  const mockPrisma = new MockPrismaService();
  const prismaService = app.get(PrismaService);
  prismaService.user = mockPrisma.user as any;
  prismaService.month = mockPrisma.month as any;
  prismaService.expense = mockPrisma.expense as any;
  prismaService.todo = mockPrisma.todo as any;
  prismaService.$transaction = mockPrisma.$transaction as any;
  (PrismaService.prototype as any).$transaction = mockPrisma.$transaction as any;

  await app.listen(0);
  const url = await app.getUrl();

  try {
    // 1. Authenticate user
    console.log('[1] Authenticating test session...');
    const authRes = await fetch(`${url}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const { user, tokens } = await authRes.json();
    const token = tokens.accessToken;
    console.log(`  ✓ Authenticated user ID: ${user.id}`);

    // Ensure cycle exists
    await fetch(`${url}/months`, { headers: { Authorization: `Bearer ${token}` } });

    // 2. Create Todos
    console.log('\n[2] Creating wishlist todos (POST /todos)...');
    const todo1Res = await fetch(`${url}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: 'Buy Ergonomic Chair', price: 2500000 }), // Rs 25,000
    });
    const todo1 = await todo1Res.json();
    console.log(`  ✓ Created Todo 1: "${todo1.content}" (Price: Rs ${todo1.price / 100})`);

    const todo2Res = await fetch(`${url}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: 'Mechanical Keyboard (Unpriced)' }), // Nullable price
    });
    const todo2 = await todo2Res.json();
    console.log(`  ✓ Created Todo 2: "${todo2.content}" (Price: ${todo2.price})`);

    const todo3Res = await fetch(`${url}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: 'USB-C Dock', price: 1200000 }), // Rs 12,000
    });
    const todo3 = await todo3Res.json();
    console.log(`  ✓ Created Todo 3: "${todo3.content}" (Price: Rs ${todo3.price / 100})`);

    // 3. List Todos
    console.log('\n[3] Listing todos (GET /todos)...');
    const listRes = await fetch(`${url}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const todosList = await listRes.json();
    if (todosList.length !== 3) {
      throw new Error(`Expected 3 todos, got ${todosList.length}`);
    }
    console.log(`  ✓ Retrieved ${todosList.length} todos successfully`);

    // 4. Update Todo 2 with price
    console.log('\n[4] Updating Todo 2 with price (PATCH /todos/:id)...');
    const patchRes = await fetch(`${url}/todos/${todo2.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ price: 1800000 }), // Rs 18,000
    });
    const updatedTodo2 = await patchRes.json();
    if (updatedTodo2.price !== 1800000) {
      throw new Error(`Price not updated: ${JSON.stringify(updatedTodo2)}`);
    }
    console.log(`  ✓ Todo 2 price updated to Rs ${updatedTodo2.price / 100}`);

    // 5. Promote Todo 1 to active cycle
    console.log('\n[5] Promoting single todo to active cycle (POST /todos/:id/promote)...');
    const promote1Res = await fetch(`${url}/todos/${todo1.id}/promote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const promotedExp = await promote1Res.json();
    console.log(`  ✓ Promoted "${promotedExp.content}" to expense (Amount: Rs ${promotedExp.amount / 100})`);

    // Verify todo1 is deleted
    const checkTodo1 = await mockPrisma.todo.findFirst({ where: { id: todo1.id } });
    if (checkTodo1 !== null) {
      throw new Error('Promoted todo was not removed from wishlist');
    }
    console.log('  ✓ Promoted todo was removed from wishlist table');

    // 6. Promote All remaining todos
    console.log('\n[6] Promoting all remaining todos (POST /todos/promote-all)...');
    const promoteAllRes = await fetch(`${url}/todos/promote-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const promoteAllResult = await promoteAllRes.json();
    if (promoteAllResult.count !== 2) {
      throw new Error(`Expected 2 todos promoted, got: ${JSON.stringify(promoteAllResult)}`);
    }
    console.log(`  ✓ Promoted ${promoteAllResult.count} todos to active cycle`);

    const remainingTodos = await (await fetch(`${url}/todos`, { headers: { Authorization: `Bearer ${token}` } })).json();
    if (remainingTodos.length !== 0) {
      throw new Error(`Expected 0 remaining todos, found ${remainingTodos.length}`);
    }
    console.log('  ✓ Wishlist is now empty after promote-all');

    console.log('\n=============================================');
    console.log('🎉 ALL STEP 8 TODO TESTS PASSED!');
    console.log('=============================================\n');
  } finally {
    await app.close();
  }
}

runTodosE2ETests().catch((err) => {
  console.error('\n❌ STEP 8 TEST FAILED:', err);
  process.exit(1);
});

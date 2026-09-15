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
  public categories = new Map<string, any>();

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

  category = {
    findUnique: async ({ where }: any) => this.categories.get(where.id) || null,
    create: async ({ data }: any) => {
      const id = randomUUID();
      const c = { id, ...data };
      this.categories.set(id, c);
      return c;
    },
  };

  month = {
    findUnique: async ({ where }: any) => {
      const m = this.months.get(where.id);
      if (!m) return null;
      const exps = Array.from(this.expenses.values())
        .filter((e) => e.monthId === m.id)
        .map((e) => ({
          ...e,
          category: e.categoryId ? this.categories.get(e.categoryId) : null,
        }));
      return {
        ...m,
        expenses: exps,
      };
    },
    create: async ({ data }: any) => {
      const id = randomUUID();
      const m = {
        id,
        userId: data.userId || null,
        sharedExpenseId: data.sharedExpenseId || null,
        label: data.label,
        budget: data.budget,
        startAt: new Date(),
        endAt: null,
        isCurrent: true,
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

async function runCsvExportE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 12 CSV Export Feature E2E Tests');
  console.log('=============================================\n');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());

  const mockPrisma = new MockPrismaService();
  const prismaService = app.get(PrismaService);
  prismaService.user = mockPrisma.user as any;
  prismaService.category = mockPrisma.category as any;
  prismaService.month = mockPrisma.month as any;
  prismaService.expense = mockPrisma.expense as any;
  prismaService.$transaction = mockPrisma.$transaction as any;
  (PrismaService.prototype as any).$transaction = mockPrisma.$transaction as any;

  await app.listen(0);
  const url = await app.getUrl();

  try {
    // 1. Authenticate Owner User
    console.log('[1] Authenticating owner session...');
    const authRes = await fetch(`${url}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const { user: owner, tokens: ownerTokens } = await authRes.json();
    console.log(`  ✓ Owner user authenticated (ID: ${owner.id})`);

    // 2. Setup Category, Cycle, and Expenses
    console.log('\n[2] Seeding cycle with expenses (testing RFC 4180 quotes & commas)...');
    const diningCategory = await mockPrisma.category.create({
      data: { name: 'Fine Dining & Groceries', isDefault: false, ownerId: owner.id },
    });

    const cycle = await mockPrisma.month.create({
      data: {
        userId: owner.id,
        label: 'September 2026 Cycle',
        budget: 15000000, // Rs 150,000 (15,000,000 paisa)
      },
    });

    // Add expense 1: standard
    await mockPrisma.expense.create({
      data: {
        monthId: cycle.id,
        categoryId: diningCategory.id,
        content: 'Metro Hypermarket weekly run',
        amount: 850000, // Rs 8,500
        occurredAt: new Date('2026-09-01T10:30:00.000Z'), // UTC 10:30 -> PKT 15:30
        createdByUserId: owner.id,
      },
    });

    // Add expense 2: contains comma and quotation marks to test RFC 4180 escaping
    await mockPrisma.expense.create({
      data: {
        monthId: cycle.id,
        categoryId: diningCategory.id,
        content: 'Cafe Bistro, "Special Anniversary" Dinner',
        amount: 1425000, // Rs 14,250
        occurredAt: new Date('2026-09-02T16:00:00.000Z'), // UTC 16:00 -> PKT 21:00
        createdByUserId: owner.id,
      },
    });

    console.log('  ✓ Seeded cycle and 2 expenses with special characters.');

    // 3. Request CSV Export
    console.log('\n[3] Requesting GET /months/:id/export-csv...');
    const exportRes = await fetch(`${url}/months/${cycle.id}/export-csv`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerTokens.accessToken}`,
      },
    });

    console.log(`  ✓ HTTP Status: ${exportRes.status}`);
    if (exportRes.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${exportRes.status}`);
    }

    const contentType = exportRes.headers.get('content-type') || '';
    console.log(`  ✓ Content-Type: ${contentType}`);
    if (!contentType.includes('text/csv')) {
      throw new Error(`Expected text/csv content type, got ${contentType}`);
    }

    const contentDisposition = exportRes.headers.get('content-disposition') || '';
    console.log(`  ✓ Content-Disposition: ${contentDisposition}`);
    if (!contentDisposition.includes('attachment') || !contentDisposition.includes('.csv')) {
      throw new Error(`Invalid Content-Disposition: ${contentDisposition}`);
    }

    const csvText = await exportRes.text();
    console.log('\n--- Exported CSV Preview ---');
    console.log(csvText.trim());
    console.log('----------------------------\n');

    // 4. Verify CSV Formatting & Rules
    console.log('[4] Verifying CSV stream structure...');
    if (!csvText.includes('# Cycle: September 2026 Cycle')) {
      throw new Error('CSV missing cycle label header comment');
    }
    if (!csvText.includes('# Budget (PKR): 150000.00')) {
      throw new Error('CSV missing budget header comment in PKR');
    }
    if (!csvText.includes('Date (PKT),Category,Description,Amount (PKR),Amount (Paisa)')) {
      throw new Error('CSV missing correct table column header row');
    }

    // Check PKT timezone presentation (+05:00)
    // 2026-09-01T10:30:00Z + 5h = 2026-09-01 15:30:00
    if (!csvText.includes('2026-09-01 15:30:00')) {
      throw new Error('Timestamp was not correctly converted to PKT (+05:00)');
    }

    // Check currency columns
    if (!csvText.includes('8500.00,850000')) {
      throw new Error('Currency amounts not correctly rendered as PKR and paisa');
    }

    // Check RFC 4180 escaping
    // 'Cafe Bistro, "Special Anniversary" Dinner' should become '"Cafe Bistro, ""Special Anniversary"" Dinner"'
    if (!csvText.includes('"Cafe Bistro, ""Special Anniversary"" Dinner"')) {
      throw new Error('RFC 4180 escaping failed for quotes/commas');
    }
    console.log('  ✓ Timezone conversion (PKT), integer paisa to PKR formatting, and RFC 4180 escaping verified.');

    // 5. Security & Access Control
    console.log('\n[5] Verifying security access control (unauthorized user)...');
    const strangerRes = await fetch(`${url}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const { tokens: strangerTokens } = await strangerRes.json();

    const unauthorizedExport = await fetch(`${url}/months/${cycle.id}/export-csv`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${strangerTokens.accessToken}`,
      },
    });

    console.log(`  ✓ Unauthorized export HTTP status: ${unauthorizedExport.status} (Expected 403)`);
    if (unauthorizedExport.status !== 403) {
      throw new Error(`Expected 403 Forbidden for stranger user, got ${unauthorizedExport.status}`);
    }

    console.log('\n=============================================');
    console.log('🎉 ALL STEP 12 CSV EXPORT TESTS PASSED!');
    console.log('=============================================\n');
  } finally {
    await app.close();
  }
}

runCsvExportE2ETests().catch((err) => {
  console.error('\n❌ STEP 12 CSV EXPORT TEST FAILED:');
  console.error(err);
  process.exit(1);
});

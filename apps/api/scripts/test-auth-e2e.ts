import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';

interface MockUser {
  id: string;
  email: string | null;
  passwordHash: string | null;
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class MockPrismaService {
  private users = new Map<string, MockUser>();

  user = {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) {
        return this.users.get(where.id) || null;
      }
      if (where.email) {
        for (const user of this.users.values()) {
          if (user.email === where.email) return user;
        }
        return null;
      }
      return null;
    },

    create: async ({ data }: { data: Partial<MockUser> }) => {
      const id = data.id || randomUUID();
      const user: MockUser = {
        id,
        email: data.email ?? null,
        passwordHash: data.passwordHash ?? null,
        isGuest: data.isGuest ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(id, user);
      return user;
    },

    update: async ({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
      const existing = this.users.get(where.id);
      if (!existing) throw new Error('User not found');
      const updated: MockUser = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      this.users.set(where.id, updated);
      return updated;
    },
  };

  async onModuleInit() {}
  async onModuleDestroy() {}
}

async function runAuthE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 2 Auth Module End-to-End Tests');
  console.log('=============================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.use(cookieParser());

  // Replace live Prisma with in-memory mock for isolated testing
  const mockPrisma = new MockPrismaService();
  const prismaService = app.get(PrismaService);
  prismaService.user = mockPrisma.user as any;

  await app.listen(0);
  const url = await app.getUrl();
  console.log(`Test server running at: ${url}`);

  let guestId: string;
  let guestAccessToken: string;
  let upgradedAccessToken: string;
  let upgradedRefreshToken: string;

  try {
    // ----------------------------------------------------
    // Test 1: Guest Authentication (POST /auth/guest)
    // ----------------------------------------------------
    console.log('\n[Test 1] Guest authentication (POST /auth/guest)...');
    const guestRes = await fetch(`${url}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (guestRes.status !== 200) {
      throw new Error(`Guest auth failed with status ${guestRes.status}`);
    }

    const guestData = await guestRes.json();
    if (!guestData.user?.id || guestData.user?.isGuest !== true) {
      throw new Error(`Guest auth failed: unexpected response: ${JSON.stringify(guestData)}`);
    }
    if (!guestData.tokens?.accessToken || !guestData.tokens?.refreshToken) {
      throw new Error('Guest auth did not return token pair');
    }

    guestId = guestData.user.id;
    guestAccessToken = guestData.tokens.accessToken;
    console.log(`  ✓ Guest created: id=${guestId}, isGuest=${guestData.user.isGuest}`);

    // Verify Set-Cookie header for refreshToken
    const setCookie = guestRes.headers.get('set-cookie');
    if (!setCookie || !setCookie.includes('refreshToken=')) {
      throw new Error('Expected httpOnly refreshToken cookie on guest auth response');
    }
    console.log('  ✓ Set-Cookie header contains httpOnly refreshToken');

    // ----------------------------------------------------
    // Test 2: In-place Guest Upgrade (POST /auth/upgrade-guest)
    // Spec A.7 & A.13: Updates the SAME User.id in place!
    // ----------------------------------------------------
    console.log('\n[Test 2] In-place Guest Upgrade (POST /auth/upgrade-guest)...');
    const upgradeRes = await fetch(`${url}/auth/upgrade-guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestAccessToken}`,
      },
      body: JSON.stringify({
        email: 'testuser@ledger.local',
        password: 'Password123!',
      }),
    });

    if (upgradeRes.status !== 200) {
      const err = await upgradeRes.text();
      throw new Error(`Upgrade failed with status ${upgradeRes.status}: ${err}`);
    }

    const upgradeData = await upgradeRes.json();
    if (upgradeData.user.id !== guestId) {
      throw new Error(
        `VIOLATION OF SPEC A.7/A.13: User ID changed on guest upgrade! Before: ${guestId}, After: ${upgradeData.user.id}`,
      );
    }
    if (upgradeData.user.isGuest !== false) {
      throw new Error(`User should no longer be a guest. isGuest is still: ${upgradeData.user.isGuest}`);
    }
    if (upgradeData.user.email !== 'testuser@ledger.local') {
      throw new Error(`User email mismatch: ${upgradeData.user.email}`);
    }

    upgradedAccessToken = upgradeData.tokens.accessToken;
    upgradedRefreshToken = upgradeData.tokens.refreshToken;
    console.log(`  ✓ Guest upgraded in place! id=${upgradeData.user.id} remained identical.`);

    // ----------------------------------------------------
    // Test 3: Login with Upgraded Credentials (POST /auth/login)
    // ----------------------------------------------------
    console.log('\n[Test 3] Login with credentials (POST /auth/login)...');
    const loginRes = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@ledger.local',
        password: 'Password123!',
      }),
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    if (loginData.user.id !== guestId) {
      throw new Error('Login user id mismatch');
    }
    console.log('  ✓ Logged in successfully with upgraded account.');

    // ----------------------------------------------------
    // Test 4: Token Rotation (POST /auth/refresh)
    // ----------------------------------------------------
    console.log('\n[Test 4] Refresh token rotation (POST /auth/refresh)...');
    const refreshRes = await fetch(`${url}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: upgradedRefreshToken,
      }),
    });

    if (refreshRes.status !== 200) {
      throw new Error(`Refresh failed with status ${refreshRes.status}`);
    }

    const refreshData = await refreshRes.json();
    if (!refreshData.tokens?.accessToken || !refreshData.tokens?.refreshToken) {
      throw new Error('Refresh endpoint did not return new token pair');
    }
    console.log('  ✓ Token pair rotated successfully.');

    // ----------------------------------------------------
    // Test 5: Rate Limiting (5 attempts / email / 15 min -> 429)
    // Spec A.7
    // ----------------------------------------------------
    console.log('\n[Test 5] Rate limiting on login (5 attempts max / 15 min)...');
    for (let i = 1; i <= 5; i++) {
      const badLogin = await fetch(`${url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testuser@ledger.local',
          password: 'WrongPassword123!',
        }),
      });
      if (badLogin.status !== 401) {
        throw new Error(`Expected attempt ${i} to return 401, got ${badLogin.status}`);
      }
      console.log(`  Attempt ${i}/5 returned 401 Unauthorized as expected.`);
    }

    // 6th attempt MUST return 429 Too Many Requests
    const rateLimitedRes = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@ledger.local',
        password: 'WrongPassword123!',
      }),
    });

    if (rateLimitedRes.status !== 429) {
      throw new Error(`Expected attempt 6 to return 429 Too Many Requests, got ${rateLimitedRes.status}`);
    }
    console.log('  ✓ 6th attempt returned HTTP 429 Too Many Requests as required by Spec A.7!');

    // ----------------------------------------------------
    // Test 6: Fresh Signup (POST /auth/signup) & Duplicate Detection
    // ----------------------------------------------------
    console.log('\n[Test 6] Fresh signup and duplicate detection (POST /auth/signup)...');
    const signupRes = await fetch(`${url}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'seconduser@ledger.local',
        password: 'Password123!',
      }),
    });

    if (signupRes.status !== 201) {
      throw new Error(`Signup failed with status ${signupRes.status}`);
    }

    const signupData = await signupRes.json();
    if (signupData.user.email !== 'seconduser@ledger.local' || signupData.user.isGuest !== false) {
      throw new Error('Fresh signup failed');
    }
    console.log('  ✓ Fresh account created.');

    // Duplicate email signup
    const duplicateRes = await fetch(`${url}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'seconduser@ledger.local',
        password: 'Password123!',
      }),
    });

    if (duplicateRes.status !== 409) {
      throw new Error(`Expected duplicate signup to return 409 Conflict, got ${duplicateRes.status}`);
    }
    console.log('  ✓ Duplicate email signup rejected with HTTP 409 Conflict.');

    // ----------------------------------------------------
    // Test 7: Logout (POST /auth/logout)
    // ----------------------------------------------------
    console.log('\n[Test 7] Logout (POST /auth/logout)...');
    const logoutRes = await fetch(`${url}/auth/logout`, {
      method: 'POST',
    });

    if (logoutRes.status !== 200) {
      throw new Error(`Logout failed with status ${logoutRes.status}`);
    }

    const logoutData = await logoutRes.json();
    if (!logoutData.success) {
      throw new Error('Logout returned success: false');
    }
    console.log('  ✓ Logout successful.');

    console.log('\n=============================================');
    console.log('🎉 ALL STEP 2 AUTH TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================\n');
  } finally {
    await app.close();
  }
}

runAuthE2ETests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});

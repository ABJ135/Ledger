import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e: any) {
      console.warn('Database connection warning (check DATABASE_URL):', e?.message || e);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

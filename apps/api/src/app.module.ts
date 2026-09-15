import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { MonthsModule } from './months/months.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SyncModule } from './sync/sync.module';
import { SharedExpensesModule } from './shared-expenses/shared-expenses.module';
import { TodosModule } from './todos/todos.module';
import { RetentionModule } from './retention/retention.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AuthModule,
    CategoriesModule,
    MonthsModule,
    ExpensesModule,
    SyncModule,
    SharedExpensesModule,
    TodosModule,
    RetentionModule,
  ],
})
export class AppModule {}

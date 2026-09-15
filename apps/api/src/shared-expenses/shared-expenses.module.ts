import { Module } from '@nestjs/common';
import { SharedExpensesService } from './shared-expenses.service';
import { SharedExpensesController } from './shared-expenses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SharedExpensesController],
  providers: [SharedExpensesService],
  exports: [SharedExpensesService],
})
export class SharedExpensesModule {}

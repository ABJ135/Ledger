import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSharedExpenseDto,
  JoinSharedExpenseDto,
  SharedExpense,
} from '@repo/shared-types';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

@Injectable()
export class SharedExpensesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new SharedExpense group, generates 8-char uppercase code,
   * adds creator as member, and seeds initial active month cycle.
   */
  async create(userId: string, dto: CreateSharedExpenseDto): Promise<SharedExpense> {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Group name is required');
    }

    // Generate unique 8-char code
    let code = generateJoinCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await this.prisma.sharedExpense.findUnique({ where: { code } });
      if (!existing) break;
      code = generateJoinCode();
      attempts++;
    }

    const created = await this.prisma.sharedExpense.create({
      data: {
        name: dto.name.trim(),
        code,
        ownerId: userId,
        members: {
          create: {
            userId,
          },
        },
        months: {
          create: {
            label: 'Cycle 1',
            budget: 10000000, // Rs 100,000 default budget (10,000,000 paisa)
            startAt: new Date(),
            isCurrent: true,
          },
        },
      },
    });

    return {
      id: created.id,
      name: created.name,
      code: created.code,
      ownerId: created.ownerId,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Join an existing shared expense group via 8-char code.
   */
  async join(userId: string, dto: JoinSharedExpenseDto): Promise<SharedExpense> {
    if (!dto.code || !dto.code.trim()) {
      throw new BadRequestException('Join code is required');
    }

    const normalizedCode = dto.code.trim().toUpperCase();

    const shared = await this.prisma.sharedExpense.findUnique({
      where: { code: normalizedCode },
      include: {
        members: true,
      },
    });

    if (!shared) {
      throw new NotFoundException('Shared expense group not found with that code');
    }

    // Check if already a member
    const isMember = shared.members.some((m) => m.userId === userId);
    if (!isMember) {
      await this.prisma.sharedExpenseMember.create({
        data: {
          sharedExpenseId: shared.id,
          userId,
        },
      });
    }

    return {
      id: shared.id,
      name: shared.name,
      code: shared.code,
      ownerId: shared.ownerId,
      createdAt: shared.createdAt.toISOString(),
    };
  }

  /**
   * List all shared expenses where the user is an owner or member.
   */
  async getMySharedExpenses(userId: string): Promise<SharedExpense[]> {
    const list = await this.prisma.sharedExpense.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: { userId },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      ownerId: s.ownerId,
      createdAt: s.createdAt.toISOString(),
    }));
  }
}

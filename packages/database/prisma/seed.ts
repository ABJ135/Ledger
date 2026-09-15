import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Rent',
  'Shopping',
  'Health',
  'Entertainment',
  'Other',
];

export async function main() {
  console.log('Seeding default categories...');

  for (const name of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        name,
        ownerId: null,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name,
          isDefault: true,
          ownerId: null,
        },
      });
      console.log(`Created default category: ${name}`);
    } else {
      console.log(`Default category already exists: ${name}`);
    }
  }

  console.log('Seeding finished successfully.');
}

if (require.main === module || process.argv[1]?.includes('seed')) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

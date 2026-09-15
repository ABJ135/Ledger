# Ledger — Monthly Expense Calculator

A production-grade personal and shared finance tracking application built with a calm, editorial fintech design system.

## Monorepo Architecture

```
Ledger/
├── apps/
│   ├── web/                    # React JS (Vite SPA), Tailwind CSS, shadcn/ui
│   ├── mobile/                 # React Native via Expo (managed)
│   └── api/                    # NestJS backend REST API
├── packages/
│   ├── database/               # Prisma schema + client (@repo/database)
│   ├── shared-types/           # TypeScript domain types & DTOs (@repo/shared-types)
│   ├── validation/             # Zod validation schemas (@repo/validation)
│   ├── api-client/             # RTK Query base + endpoints (@repo/api-client)
│   └── config/                 # Shared configs & Tailwind preset (@repo/config)
├── turbo.json
├── package.json
├── .env.example
└── monthly-expense-calculator-spec.md
```

## Non-Negotiable Core Rules

1. **Integer Paisa**: All currency is stored as an integer in paisa (`PKR × 100`). Never float or double.
2. **Timezone UTC**: All database timestamps are `timestamptz` stored in UTC. Converted to Pakistan Standard Time (UTC+5, fixed, no DST) only at presentation.
3. **User-Controlled Months**: Months are billing cycles controlled by the user, not calendar months.
4. **Server-Authoritative Totals**: Totals (budget, used, remaining) are always computed on the backend.
5. **Unified Validation**: Zod schemas in `packages/validation` are the single source of truth for request and response shapes.

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- PostgreSQL (Neon recommended, with pooled and direct connection strings)

### Setup

1. Copy `.env.example` to `.env` (and `apps/api/.env`):
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```
4. Run migrations and seed default categories:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Start development servers:
   ```bash
   npm run dev
   ```

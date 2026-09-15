// ==========================================
// Models & Entities
// All money is stored as an integer in paisa (PKR x 100).
// All timestamps are timestamptz (ISO 8601 strings in UTC).
// ==========================================

export type SyncStatus = 'pending' | 'synced' | 'conflict';

export interface User {
  id: string;
  email: string | null;
  passwordHash?: string | null;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  ownerId: string | null;
  createdAt: string;
}

export interface Month {
  id: string;
  userId: string | null;
  sharedExpenseId: string | null;
  label: string;
  budget: number; // paisa (PKR x 100)
  startAt: string; // UTC ISO string
  endAt: string | null; // UTC ISO string
  isCurrent: boolean;
  notified80: boolean;
  notified100: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  monthId: string;
  categoryId: string | null;
  content: string;
  amount: number; // paisa (PKR x 100)
  occurredAt: string; // UTC ISO string
  createdByUserId: string;
  syncStatus: SyncStatus;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
}

export interface Todo {
  id: string;
  userId: string;
  categoryId: string | null;
  content: string;
  price: number | null; // paisa, nullable until filled
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
}

export interface SharedExpense {
  id: string;
  code: string; // 8-char uppercase alphanumeric
  ownerId: string;
  name: string;
  createdAt: string;
}

export interface SharedExpenseMember {
  id: string;
  sharedExpenseId: string;
  userId: string;
  joinedAt: string;
  user?: Pick<User, 'id' | 'email'>;
}

// ==========================================
// Computed Financial Totals (Server Authoritative)
// ==========================================

export interface MonthTotals {
  budget: number; // paisa
  used: number; // paisa
  remaining: number; // paisa (budget - used, can be negative)
  percentageUsed: number; // 0 - 100+
}

export interface MonthDetail extends Month {
  totals: MonthTotals;
  expenses: Expense[];
}

export interface CategorySpend {
  categoryId: string | null;
  categoryName: string;
  total: number; // paisa
  percentage: number;
}

export interface MonthSummary {
  monthId: string;
  label: string;
  budget: number;
  totalSpent: number;
  remaining: number;
  categoryBreakdown: CategorySpend[];
  nextMonthId?: string;
  nextMonthLabel?: string;
}

// ==========================================
// Auth API Contracts
// ==========================================

export interface GuestAuthDto {
  guestId?: string;
}

export interface SignupDto {
  email: string;
  password: string;
}

export interface UpgradeGuestDto {
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  isGuest: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

// ==========================================
// Month API Contracts
// ==========================================

export interface CreateMonthDto {
  label: string;
  budget: number; // paisa
  sharedExpenseId?: string;
}

export interface UpdateMonthDto {
  label?: string;
  budget?: number; // paisa
}

export interface EndCurrentMonthDto {
  budget: number; // budget in paisa for the next rollover month
  label?: string; // optional custom label for the next cycle
}

// ==========================================
// Expense API Contracts
// ==========================================

export interface CreateExpenseDto {
  monthId: string;
  categoryId?: string | null;
  content: string;
  amount: number; // paisa
  occurredAt: string; // UTC ISO string
  clientId?: string;
}

export interface UpdateExpenseDto {
  categoryId?: string | null;
  content?: string;
  amount?: number; // paisa
  occurredAt?: string; // UTC ISO string
}

// ==========================================
// Category API Contracts
// ==========================================

export interface CreateCategoryDto {
  name: string;
}

// ==========================================
// Todo API Contracts
// ==========================================

export interface CreateTodoDto {
  content: string;
  price?: number | null; // paisa
  categoryId?: string | null;
}

export interface UpdateTodoDto {
  content?: string;
  price?: number | null; // paisa
  categoryId?: string | null;
}

// ==========================================
// Shared Expense API Contracts
// ==========================================

export interface CreateSharedExpenseDto {
  name: string;
}

export interface JoinSharedExpenseDto {
  code: string;
}

// ==========================================
// Mobile Sync API Contracts
// ==========================================

export interface SyncPushDto {
  expenses: Array<{
    clientId: string;
    monthId: string;
    categoryId?: string | null;
    content: string;
    amount: number; // paisa
    occurredAt: string;
    updatedAt: string;
    deleted?: boolean;
  }>;
}

export interface SyncPullResponse {
  serverTime: string; // UTC ISO string
  expenses: Expense[];
  months: Month[];
}

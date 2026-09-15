import { z } from 'zod';

// ==========================================
// Auth Schemas
// ==========================================

export const guestAuthSchema = z.object({
  guestId: z.string().uuid().optional(),
});

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const upgradeGuestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ==========================================
// Month Schemas
// ==========================================

export const createMonthSchema = z.object({
  label: z.string().min(1, 'Month label is required').max(100),
  budget: z.number().int('Budget must be an integer').nonnegative('Budget must be non-negative'),
  sharedExpenseId: z.string().uuid().optional(),
});

export const updateMonthSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  budget: z.number().int('Budget must be an integer').nonnegative('Budget must be non-negative').optional(),
});

export const endCurrentMonthSchema = z.object({
  budget: z.number().int('Budget must be an integer').nonnegative('Budget must be non-negative'),
  label: z.string().min(1).max(100).optional(),
});

// ==========================================
// Expense Schemas
// ==========================================

export const createExpenseSchema = z.object({
  monthId: z.string().uuid('Invalid month ID'),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  content: z.string().min(1, 'Expense description is required').max(255),
  amount: z.number().int('Amount must be an integer in paisa').positive('Amount must be greater than 0'),
  occurredAt: z.string().datetime({ message: 'Invalid UTC ISO timestamp' }),
  clientId: z.string().uuid().optional(),
});

export const updateExpenseSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  content: z.string().min(1).max(255).optional(),
  amount: z.number().int('Amount must be an integer in paisa').positive('Amount must be greater than 0').optional(),
  occurredAt: z.string().datetime({ message: 'Invalid UTC ISO timestamp' }).optional(),
});

// ==========================================
// Category Schemas
// ==========================================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
});

// ==========================================
// Todo Schemas
// ==========================================

export const createTodoSchema = z.object({
  content: z.string().min(1, 'Todo content is required').max(255),
  price: z.number().int('Price must be an integer in paisa').positive('Price must be greater than 0').nullable().optional(),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
});

export const updateTodoSchema = z.object({
  content: z.string().min(1).max(255).optional(),
  price: z.number().int('Price must be an integer in paisa').positive('Price must be greater than 0').nullable().optional(),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
});

// ==========================================
// Shared Expense Schemas
// ==========================================

export const createSharedExpenseSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
});

export const joinSharedExpenseSchema = z.object({
  code: z
    .string()
    .length(8, 'Join code must be 8 characters')
    .regex(/^[A-Z0-9]{8}$/, 'Code must be 8 uppercase alphanumeric characters'),
});

// ==========================================
// Mobile Sync Schemas
// ==========================================

export const syncExpenseItemSchema = z.object({
  clientId: z.string().uuid(),
  monthId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  content: z.string().min(1),
  amount: z.number().int().positive(),
  occurredAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deleted: z.boolean().optional(),
});

export const syncPushSchema = z.object({
  expenses: z.array(syncExpenseItemSchema),
});

// ==========================================
// Exported Inferred Types
// ==========================================

export type GuestAuthInput = z.infer<typeof guestAuthSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type UpgradeGuestInput = z.infer<typeof upgradeGuestSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export type CreateMonthInput = z.infer<typeof createMonthSchema>;
export type UpdateMonthInput = z.infer<typeof updateMonthSchema>;
export type EndCurrentMonthInput = z.infer<typeof endCurrentMonthSchema>;

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

export type CreateSharedExpenseInput = z.infer<typeof createSharedExpenseSchema>;
export type JoinSharedExpenseInput = z.infer<typeof joinSharedExpenseSchema>;

export type SyncPushInput = z.infer<typeof syncPushSchema>;
export type SyncExpenseItemInput = z.infer<typeof syncExpenseItemSchema>;

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AuthResponse,
  GuestAuthDto,
  SignupDto,
  UpgradeGuestDto,
  LoginDto,
  RefreshTokenDto,
  Month,
  MonthDetail,
  CreateMonthDto,
  UpdateMonthDto,
  EndCurrentMonthDto,
  MonthSummary,
  Expense,
  CreateExpenseDto,
  UpdateExpenseDto,
  Category,
  CreateCategoryDto,
  Todo,
  CreateTodoDto,
  UpdateTodoDto,
  SharedExpense,
  CreateSharedExpenseDto,
  JoinSharedExpenseDto,
  SyncPushDto,
  SyncPullResponse,
} from '@repo/shared-types';

let getAccessToken: (() => string | null) = () => null;
let currentDirectToken: string | null = null;
let getRefreshToken: (() => string | null) = () => null;
let currentRefreshToken: string | null = null;

let onTokenRefreshedCallback:
  | ((data: { accessToken: string; refreshToken: string; user?: any }) => void)
  | null = null;
let onAuthFailedCallback: (() => void) | null = null;

const resolveInitialBaseUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__LEDGER_API_URL__) {
    return String((window as any).__LEDGER_API_URL__).trim().replace(/\/+$/, '');
  }
  if (typeof process !== 'undefined' && process.env) {
    const envUrl =
      process.env.VITE_API_BASE_URL ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
      return String(envUrl).trim().replace(/\/+$/, '');
    }
  }
  return 'http://localhost:4000';
};

let currentBaseUrl: string = resolveInitialBaseUrl();

export const setAuthTokenGetter = (getter: () => string | null) => {
  getAccessToken = getter;
};

export const setDirectToken = (token: string | null) => {
  currentDirectToken = token;
};

export const setAuthRefreshTokenGetter = (getter: () => string | null) => {
  getRefreshToken = getter;
};

export const setDirectRefreshToken = (token: string | null) => {
  currentRefreshToken = token;
};

export const setOnTokenRefreshed = (
  cb: ((data: { accessToken: string; refreshToken: string; user?: any }) => void) | null
) => {
  onTokenRefreshedCallback = cb;
};

export const setOnAuthFailed = (cb: (() => void) | null) => {
  onAuthFailedCallback = cb;
};

export const setApiBaseUrl = (url: string) => {
  if (url && typeof url === 'string') {
    currentBaseUrl = url.trim().replace(/\/+$/, '');
  }
};

export const getApiBaseUrl = () => currentBaseUrl;

let refreshPromise: Promise<string | null> | null = null;

const createRawBaseQuery = () =>
  fetchBaseQuery({
    baseUrl: currentBaseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const token = currentDirectToken !== null ? currentDirectToken : getAccessToken();
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

const dynamicBaseQuery = async (args: any, apiInstance: any, extraOptions: any) => {
  const rawBaseQuery = createRawBaseQuery();
  let result = await rawBaseQuery(args, apiInstance, extraOptions);

  // If request failed with 401 Unauthorized, attempt to refresh token and retry
  if (result.error && result.error.status === 401) {
    const requestUrl = typeof args === 'string' ? args : args?.url || '';
    const isAuthUrl =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/signup') ||
      requestUrl.includes('/auth/guest') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    if (!isAuthUrl) {
      if (!refreshPromise) {
        refreshPromise = (async (): Promise<string | null> => {
          try {
            const refreshToken = currentRefreshToken || getRefreshToken();
            // Call POST /auth/refresh with token in body and cookie credentials
            const refreshResult = await rawBaseQuery(
              {
                url: '/auth/refresh',
                method: 'POST',
                body: refreshToken ? { refreshToken } : {},
              },
              apiInstance,
              extraOptions
            );

            if (refreshResult.data) {
              const authResponse = refreshResult.data as AuthResponse;
              const newAccess = authResponse.tokens.accessToken;
              const newRefresh = authResponse.tokens.refreshToken;

              currentDirectToken = newAccess;
              currentRefreshToken = newRefresh;

              if (onTokenRefreshedCallback) {
                onTokenRefreshedCallback({
                  accessToken: newAccess,
                  refreshToken: newRefresh,
                  user: authResponse.user,
                });
              }

              return newAccess;
            } else {
              // Refresh failed - token expired or invalid
              currentDirectToken = null;
              currentRefreshToken = null;
              if (onAuthFailedCallback) {
                onAuthFailedCallback();
              }
              return null;
            }
          } catch {
            currentDirectToken = null;
            currentRefreshToken = null;
            if (onAuthFailedCallback) {
              onAuthFailedCallback();
            }
            return null;
          }
        })().finally(() => {
          refreshPromise = null;
        });
      }

      const freshToken = await refreshPromise;
      if (freshToken) {
        // Retry the original query with the newly acquired access token!
        result = await rawBaseQuery(args, apiInstance, extraOptions);
      }
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['Auth', 'Month', 'Expense', 'Category', 'Todo', 'SharedExpense'],
  endpoints: (builder) => ({
    // Auth
    guestAuth: builder.mutation<AuthResponse, GuestAuthDto>({
      query: (body) => ({
        url: '/auth/guest',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.tokens?.accessToken) {
            currentDirectToken = data.tokens.accessToken;
            currentRefreshToken = data.tokens.refreshToken;
            if (onTokenRefreshedCallback) {
              onTokenRefreshedCallback({
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
                user: data.user,
              });
            }
          }
        } catch {}
      },
      invalidatesTags: ['Auth', 'Month', 'Expense', 'Category', 'Todo', 'SharedExpense'],
    }),
    signup: builder.mutation<AuthResponse, SignupDto>({
      query: (body) => ({
        url: '/auth/signup',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.tokens?.accessToken) {
            currentDirectToken = data.tokens.accessToken;
            currentRefreshToken = data.tokens.refreshToken;
            if (onTokenRefreshedCallback) {
              onTokenRefreshedCallback({
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
                user: data.user,
              });
            }
          }
        } catch {}
      },
      invalidatesTags: ['Auth', 'Month', 'Expense', 'Category', 'Todo', 'SharedExpense'],
    }),
    upgradeGuest: builder.mutation<AuthResponse, UpgradeGuestDto>({
      query: (body) => ({
        url: '/auth/upgrade-guest',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.tokens?.accessToken) {
            currentDirectToken = data.tokens.accessToken;
            currentRefreshToken = data.tokens.refreshToken;
            if (onTokenRefreshedCallback) {
              onTokenRefreshedCallback({
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
                user: data.user,
              });
            }
          }
        } catch {}
      },
      invalidatesTags: ['Auth', 'Month', 'Expense', 'Category', 'Todo', 'SharedExpense'],
    }),
    login: builder.mutation<AuthResponse, LoginDto>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.tokens?.accessToken) {
            currentDirectToken = data.tokens.accessToken;
            currentRefreshToken = data.tokens.refreshToken;
            if (onTokenRefreshedCallback) {
              onTokenRefreshedCallback({
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
                user: data.user,
              });
            }
          }
        } catch {}
      },
      invalidatesTags: ['Auth', 'Month', 'Expense', 'Category', 'Todo', 'SharedExpense'],
    }),
    refreshToken: builder.mutation<AuthResponse, RefreshTokenDto>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.tokens?.accessToken) {
            currentDirectToken = data.tokens.accessToken;
            currentRefreshToken = data.tokens.refreshToken;
            if (onTokenRefreshedCallback) {
              onTokenRefreshedCallback({
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
                user: data.user,
              });
            }
          }
        } catch {}
      },
    }),
    logout: builder.mutation<void, { refreshToken?: string } | void>({
      query: (body = {}) => ({
        url: '/auth/logout',
        method: 'POST',
        body: body || {},
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          currentDirectToken = null;
          currentRefreshToken = null;
        } catch {}
      },
      invalidatesTags: ['Auth', 'Month', 'Expense', 'Category', 'Todo', 'SharedExpense'],
    }),

    // Months
    getMonths: builder.query<Month[], { context?: 'personal' | 'shared'; sharedExpenseId?: string }>({
      query: ({ context, sharedExpenseId }) => {
        const params = new URLSearchParams();
        if (context) params.append('context', context);
        if (sharedExpenseId) params.append('sharedExpenseId', sharedExpenseId);
        return `/months?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Month' as const, id })), { type: 'Month', id: 'LIST' }]
          : [{ type: 'Month', id: 'LIST' }],
    }),
    getMonthById: builder.query<MonthDetail, string>({
      query: (id) => `/months/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Month', id }, { type: 'Expense', id: 'LIST' }],
    }),
    createMonth: builder.mutation<Month, CreateMonthDto>({
      query: (body) => ({
        url: '/months',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Month', id: 'LIST' }],
    }),
    updateMonth: builder.mutation<Month, { id: string; data: UpdateMonthDto }>({
      query: ({ id, data }) => ({
        url: `/months/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Month', id }, { type: 'Month', id: 'LIST' }],
    }),
    deleteMonth: builder.mutation<void, string>({
      query: (id) => ({
        url: `/months/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Month', id: 'LIST' }],
    }),
    setCurrentMonth: builder.mutation<Month, string>({
      query: (id) => ({
        url: `/months/${id}/set-current`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Month', id: 'LIST' }],
    }),
    endCurrentMonth: builder.mutation<MonthSummary, EndCurrentMonthDto>({
      query: (body) => ({
        url: '/months/end-current',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Month', id: 'LIST' }, { type: 'Expense', id: 'LIST' }],
    }),
    exportMonthCsv: builder.query<string, string>({
      query: (id) => ({
        url: `/months/${id}/export-csv`,
        responseHandler: (response: any) => response.text(),
      }),
    }),

    // Expenses
    createExpense: builder.mutation<Expense, CreateExpenseDto>({
      query: (body) => ({
        url: '/expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { monthId }) => [
        { type: 'Month', id: monthId },
        { type: 'Expense', id: 'LIST' },
      ],
    }),
    updateExpense: builder.mutation<Expense, { id: string; data: UpdateExpenseDto; monthId: string }>({
      query: ({ id, data }) => ({
        url: `/expenses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id, monthId }) => [
        { type: 'Expense', id },
        { type: 'Month', id: monthId },
      ],
    }),
    deleteExpense: builder.mutation<void, { id: string; monthId: string }>({
      query: ({ id }) => ({
        url: `/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { monthId }) => [
        { type: 'Expense', id: 'LIST' },
        { type: 'Month', id: monthId },
      ],
    }),

    // Categories
    getCategories: builder.query<Category[], void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<Category, CreateCategoryDto>({
      query: (body) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    // Todos
    getTodos: builder.query<Todo[], void>({
      query: () => '/todos',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Todo' as const, id })), { type: 'Todo', id: 'LIST' }]
          : [{ type: 'Todo', id: 'LIST' }],
    }),
    createTodo: builder.mutation<Todo, CreateTodoDto>({
      query: (body) => ({
        url: '/todos',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Todo', id: 'LIST' }],
    }),
    updateTodo: builder.mutation<Todo, { id: string; data: UpdateTodoDto }>({
      query: ({ id, data }) => ({
        url: `/todos/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Todo', id }],
    }),
    deleteTodo: builder.mutation<void, string>({
      query: (id) => ({
        url: `/todos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Todo', id: 'LIST' }],
    }),
    deleteAllTodos: builder.mutation<void, void>({
      query: () => ({
        url: '/todos',
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Todo', id: 'LIST' }],
    }),
    promoteTodo: builder.mutation<Expense, string>({
      query: (id) => ({
        url: `/todos/${id}/promote`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Todo', id: 'LIST' }, { type: 'Month', id: 'LIST' }, { type: 'Expense', id: 'LIST' }],
    }),
    promoteAllTodos: builder.mutation<{ count: number }, void>({
      query: () => ({
        url: '/todos/promote-all',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Todo', id: 'LIST' }, { type: 'Month', id: 'LIST' }, { type: 'Expense', id: 'LIST' }],
    }),

    // Shared Expenses
    createSharedExpense: builder.mutation<SharedExpense, CreateSharedExpenseDto>({
      query: (body) => ({
        url: '/shared-expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SharedExpense'],
    }),
    joinSharedExpense: builder.mutation<SharedExpense, JoinSharedExpenseDto>({
      query: (body) => ({
        url: '/shared-expenses/join',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SharedExpense'],
    }),
    getMySharedExpenses: builder.query<SharedExpense[], void>({
      query: () => '/shared-expenses/mine',
      providesTags: ['SharedExpense'],
    }),

    // Sync
    syncPush: builder.mutation<{ success: boolean; syncedCount: number }, SyncPushDto>({
      query: (body) => ({
        url: '/sync/push',
        method: 'POST',
        body,
      }),
    }),
    syncPull: builder.query<SyncPullResponse, { since: string }>({
      query: ({ since }) => `/sync/pull?since=${encodeURIComponent(since)}`,
    }),
  }),
});

export const {
  useGuestAuthMutation,
  useSignupMutation,
  useUpgradeGuestMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useGetMonthsQuery,
  useGetMonthByIdQuery,
  useCreateMonthMutation,
  useUpdateMonthMutation,
  useDeleteMonthMutation,
  useSetCurrentMonthMutation,
  useEndCurrentMonthMutation,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetTodosQuery,
  useCreateTodoMutation,
  useUpdateTodoMutation,
  useDeleteTodoMutation,
  useDeleteAllTodosMutation,
  usePromoteTodoMutation,
  usePromoteAllTodosMutation,
  useCreateSharedExpenseMutation,
  useJoinSharedExpenseMutation,
  useGetMySharedExpensesQuery,
  useSyncPushMutation,
  useLazySyncPullQuery,
  useExportMonthCsvQuery,
  useLazyExportMonthCsvQuery,
} = api;

export const apiSlice = api;

/**
 * Browser helper to trigger instant direct file download of the CSV stream.
 */
export const downloadMonthCsv = async (monthId: string): Promise<void> => {
  const token = getAccessToken();
  const url = `${currentBaseUrl}/months/${monthId}/export-csv`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to download CSV export');
  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = `ledger-cycle-${monthId.slice(0, 8)}.csv`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
};

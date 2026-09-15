import { Expense, SyncPushDto } from '@repo/shared-types';
import { api } from '@repo/api-client';

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface OfflinePendingExpense {
  clientId: string;
  monthId: string;
  categoryId?: string | null;
  content: string;
  amount: number;
  occurredAt: string;
  updatedAt: string;
  deleted?: boolean;
}

class MobileSyncManager {
  private pendingQueue: OfflinePendingExpense[] = [];
  private lastSyncTime: string = new Date(0).toISOString();
  private isSyncing = false;

  public getPendingExpenses(): OfflinePendingExpense[] {
    return [...this.pendingQueue];
  }

  public getPendingCount(): number {
    return this.pendingQueue.length;
  }

  public enqueueExpense(expense: {
    monthId: string;
    categoryId?: string | null;
    content: string;
    amount: number;
    occurredAt: string;
  }): Expense {
    const clientId = generateUUID();
    const now = new Date().toISOString();

    const pendingItem: OfflinePendingExpense = {
      clientId,
      monthId: expense.monthId,
      categoryId: expense.categoryId,
      content: expense.content,
      amount: expense.amount,
      occurredAt: expense.occurredAt,
      updatedAt: now,
    };

    this.pendingQueue.push(pendingItem);

    const localExpense: Expense = {
      id: clientId,
      monthId: expense.monthId,
      categoryId: expense.categoryId || null,
      content: expense.content,
      amount: expense.amount,
      occurredAt: expense.occurredAt,
      createdByUserId: 'local-user',
      syncStatus: 'pending', // Spec A.8
      clientId,
      createdAt: now,
      updatedAt: now,
    };

    return localExpense;
  }

  public enqueueDelete(clientId: string, monthId: string) {
    this.pendingQueue = this.pendingQueue.filter((p) => p.clientId !== clientId);
    this.pendingQueue.push({
      clientId,
      monthId,
      content: '',
      amount: 0,
      occurredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: true,
    });
  }

  public async syncWithServer(dispatch: any): Promise<{ pushed: number; success: boolean }> {
    if (this.isSyncing) return { pushed: 0, success: false };
    if (this.pendingQueue.length === 0) {
      // Pull only
      try {
        await dispatch(api.endpoints.syncPull.initiate({ since: this.lastSyncTime }));
        this.lastSyncTime = new Date().toISOString();
        return { pushed: 0, success: true };
      } catch (err) {
        return { pushed: 0, success: false };
      }
    }

    this.isSyncing = true;
    const itemsToPush = [...this.pendingQueue];

    try {
      const pushPayload: SyncPushDto = { expenses: itemsToPush };
      const pushAction = await dispatch(api.endpoints.syncPush.initiate(pushPayload));

      if (pushAction.data && pushAction.data.success) {
        // Remove pushed items from pending queue
        const pushedIds = new Set(itemsToPush.map((i) => i.clientId));
        this.pendingQueue = this.pendingQueue.filter((i) => !pushedIds.has(i.clientId));

        // Pull latest updates
        await dispatch(api.endpoints.syncPull.initiate({ since: this.lastSyncTime }));
        this.lastSyncTime = new Date().toISOString();

        return { pushed: pushAction.data.syncedCount, success: true };
      }
      return { pushed: 0, success: false };
    } catch (error) {
      console.warn('Sync failed (offline or network error), items preserved in pending queue:', error);
      return { pushed: 0, success: false };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new MobileSyncManager();

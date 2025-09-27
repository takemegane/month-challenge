import useSWR, { useSWRConfig, preload } from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher } from '../lib/swr-config';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  is_admin?: boolean;
}

interface Entry {
  id: string;
  user_id: string;
  entry_date: string;
  created_at: string;
}

interface EntriesResponse {
  entries: Entry[];
}

// Mutation fetchers
const postFetcher = async (url: string, { arg }: { arg?: any }) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: arg ? { 'Content-Type': 'application/json' } : {},
    body: arg ? JSON.stringify(arg) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = new Error('HTTP Error');
    (error as any).status = res.status;
    (error as any).info = await res.json().catch(() => ({}));
    throw error;
  }

  return res.json();
};

const putFetcher = async (url: string, { arg }: { arg: any }) => {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
    credentials: 'include',
  });

  if (!res.ok) {
    const error = new Error('HTTP Error');
    (error as any).status = res.status;
    (error as any).info = await res.json().catch(() => ({}));
    throw error;
  }

  return res.json();
};

// Custom hooks
export function useUser() {
  const { data, error, isLoading, mutate } = useSWR<{ user: User }>('/api/auth/me');

  return {
    user: data?.user || null,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useEntries(month?: string, since?: string, until?: string) {
  // Build query parameters
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (since) params.append('since', since);
  if (until) params.append('until', until);

  const queryString = params.toString();
  const key = queryString ? `/api/entries?${queryString}` : '/api/entries';

  const { data, error, isLoading, mutate } = useSWR<EntriesResponse>(key);

  return {
    entries: data?.entries || [],
    count: data?.entries?.length || 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useCreateEntry() {
  const { mutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    '/api/entries/today',
    postFetcher,
    {
      // Optimistic update with entry addition
      optimisticData: (currentData) => {
        return {
          status: 'created',
        };
      },
      populateCache: (result, currentData) => {
        return result;
      },
      revalidate: false,
      onSuccess: (data) => {
        // Get today's date for targeted cache invalidation
        const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const todayISO = today.toISOString().slice(0, 10);
        const currentMonth = todayISO.slice(0, 7);

        // Invalidate all related cache keys
        mutate(
          key => {
            if (typeof key !== 'string') return false;

            return (
              // All entries queries
              key.startsWith('/api/entries') ||
              // Month-specific queries that might include today
              (key.includes('since=') && key.includes('until=') &&
               key.includes(currentMonth)) ||
              // Any query that could show today's data
              key.includes(todayISO) ||
              // General entries without parameters (includes all data)
              key === '/api/entries'
            );
          },
          undefined,
          { revalidate: true }
        );

        // Also optimistically update existing entries data
        mutate('/api/entries', (currentData: EntriesResponse | undefined) => {
          if (!currentData) return currentData;

          // Check if today's entry already exists
          const hasToday = currentData.entries.some(
            entry => entry.entry_date.slice(0, 10) === todayISO
          );

          if (!hasToday && data?.status === 'created') {
            // Add optimistic entry
            const newEntry = {
              id: `temp-${Date.now()}`,
              user_id: 'current-user',
              entry_date: todayISO,
              created_at: new Date().toISOString()
            };

            return {
              entries: [...currentData.entries, newEntry]
            };
          }

          return currentData;
        }, { revalidate: false });
      },
    }
  );

  return {
    createEntry: trigger,
    isCreating: isMutating,
    error,
  };
}

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<{ users: User[] }>('/api/admin/users');

  return {
    users: data?.users || [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

// 軽量なユーザーリスト（チェック操作用）
export function useUsersList() {
  const { data, error, isLoading } = useSWR<{ users: User[] }>('/api/admin/users-list');

  return {
    users: data?.users || [],
    isLoading,
    isError: !!error,
  };
}

// 日別チェック状況
export function useDailyStats(month?: string) {
  const url = month ? `/api/admin/daily-stats?month=${month}` : '/api/admin/daily-stats';
  const { data, error, isLoading, isValidating } = useSWR(url);

  return {
    data,
    isLoading,
    isValidating,
    isError: !!error,
  };
}

// ユーザー別ランキング
export function useUserRanking(month?: string) {
  const url = month ? `/api/admin/user-ranking?month=${month}` : '/api/admin/user-ranking';
  const { data, error, isLoading, isValidating } = useSWR(url);

  return {
    data,
    isLoading,
    isValidating,
    isError: !!error,
  };
}

export function useUpdateProfile() {
  const { mutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    '/api/auth/profile',
    putFetcher,
    {
      onSuccess: (data) => {
        // Update the user cache directly with the returned data
        if (data?.user) {
          mutate('/api/auth/me', { user: data.user }, { revalidate: false });

          // Also force invalidate all user-related caches
          mutate(
            (key) => typeof key === 'string' && key.includes('/api/auth'),
            undefined,
            { revalidate: true }
          );
        } else {
          // Fallback: refresh user data if no user data in response
          mutate('/api/auth/me');
        }
      },
    }
  );

  return {
    updateProfile: trigger,
    isUpdating: isMutating,
    error,
  };
}

// Prefetch utilities for better navigation performance
export function prefetchCalendarData(month?: string) {
  // Prefetch specific month's entries
  const targetMonth = month || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).toISOString().slice(0, 7);
  const [year, monthNum] = targetMonth.split('-').map(Number);

  const start = `${targetMonth}-01`;
  const endDate = new Date(year, monthNum, 0).getDate();
  const end = `${targetMonth}-${String(endDate).padStart(2, '0')}`;

  // Preload specific month data
  preload(`/api/entries?since=${start}&until=${end}`, fetcher);

  // Preload all entries (for general queries) - only for current month
  if (!month) {
    preload('/api/entries', fetcher);
  }
}

// Advanced prefetch strategy for calendar navigation
export function prefetchCalendarRange(currentMonth: string) {
  // Helper function to add/subtract months
  const addMonths = (monthStr: string, diff: number): string => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1 + diff, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // 1. Immediate prefetch: Adjacent months (high priority)
  const prevMonth = addMonths(currentMonth, -1);
  const nextMonth = addMonths(currentMonth, 1);

  prefetchCalendarData(prevMonth);
  prefetchCalendarData(nextMonth);

  // 2. Delayed prefetch: 2-3 months range (medium priority)
  setTimeout(() => {
    const twoMonthsAgo = addMonths(currentMonth, -2);
    const threeMonthsAgo = addMonths(currentMonth, -3);
    const twoMonthsAhead = addMonths(currentMonth, 2);

    prefetchCalendarData(twoMonthsAgo);
    prefetchCalendarData(threeMonthsAgo);
    prefetchCalendarData(twoMonthsAhead);
  }, 1000); // 1秒後に低優先度プリフェッチ
}

export function prefetchListData() {
  // Prefetch all entries for list view
  preload('/api/entries', fetcher);
}

// Prefetch 6 months of data for list view
export function prefetchMonthlySummaryData() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

  // Calculate 6 months range
  const span = 6;
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - (span - 1), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const pad = (n: number) => String(n).padStart(2, "0");
  const since = `${firstMonth.getFullYear()}-${pad(firstMonth.getMonth() + 1)}-01`;
  const until = `${lastMonth.getFullYear()}-${pad(lastMonth.getMonth() + 1)}-${pad(lastMonth.getDate())}`;

  // Preload 6 months data for MonthlySummary
  preload(`/api/entries?since=${since}&until=${until}`, fetcher);
}

// Prefetch admin users data
export function prefetchAdminData() {
  // Preload admin users list
  preload('/api/admin/users', fetcher);
}

// Prefetch admin overview data
export function prefetchOverviewData(month?: string) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  preload(`/api/admin/overview?month=${currentMonth}`, fetcher);
}

// Advanced prefetch strategy for admin overview navigation
export function prefetchOverviewRange(currentMonth: string) {
  // Helper function to add/subtract months
  const addMonths = (monthStr: string, diff: number): string => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1 + diff, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // 1. Immediate prefetch: Adjacent months (high priority)
  const prevMonth = addMonths(currentMonth, -1);
  const nextMonth = addMonths(currentMonth, 1);

  prefetchOverviewData(prevMonth);
  prefetchOverviewData(nextMonth);

  // 2. Delayed prefetch: 2-3 months range (medium priority)
  setTimeout(() => {
    const twoMonthsAgo = addMonths(currentMonth, -2);
    const threeMonthsAgo = addMonths(currentMonth, -3);
    const twoMonthsAhead = addMonths(currentMonth, 2);

    prefetchOverviewData(twoMonthsAgo);
    prefetchOverviewData(threeMonthsAgo);
    prefetchOverviewData(twoMonthsAhead);
  }, 1000); // 1秒後に低優先度プリフェッチ
}

// Overview data hook
export function useOverview(month?: string) {
  const key = month ? `/api/admin/overview?month=${month}` : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher);

  return {
    overview: data,
    isLoading,
    isValidating,
    isError: !!error,
    mutate
  };
}

// Check operation hook with optimistic updates (no reloads)
export function useCheckOperation() {
  const { mutate } = useSWRConfig();

  return {
    performCheck: async (arg: { action: 'add' | 'remove'; user_id: string; entry_date: string; month: string }) => {
      try {
        const res = await fetch('/api/admin/entries', {
          method: arg.action === 'add' ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: arg.user_id, entry_date: arg.entry_date }),
          credentials: 'include',
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw { status: res.status, info: errorData };
        }

        const result = await res.json();

        // Optimistic update - update cache directly without revalidating
        mutate(`/api/admin/overview?month=${arg.month}`, (currentData: any) => {
          if (!currentData) return currentData;

          // Create updated data based on the operation
          const updatedData = { ...currentData };

          if (updatedData.users) {
            updatedData.users = updatedData.users.map((user: any) => {
              if (user.id === arg.user_id) {
                const updatedUser = { ...user };
                if (arg.action === 'add') {
                  // Add date if not already present
                  if (!updatedUser.dates.includes(arg.entry_date)) {
                    updatedUser.dates = [...updatedUser.dates, arg.entry_date];
                    updatedUser.total = updatedUser.dates.length;
                  }
                } else {
                  // Remove date if present
                  updatedUser.dates = updatedUser.dates.filter((date: string) => date !== arg.entry_date);
                  updatedUser.total = updatedUser.dates.length;
                }
                return updatedUser;
              }
              return user;
            });
          }

          if (updatedData.totals) {
            delete updatedData.totals;
          }

          return updatedData;
        }, { revalidate: false });

        return result;
      } catch (error) {
        throw error;
      }
    },
    isUpdating: false,
    error: null
  };
}

// Hook for intelligent prefetching based user navigation patterns
export function usePrefetch() {
  return {
    prefetchCalendar: prefetchCalendarData,
    prefetchList: () => {
      prefetchListData();
      prefetchMonthlySummaryData();
    },
    prefetchAdmin: prefetchAdminData,
    prefetchOverview: prefetchOverviewData,
  };
}

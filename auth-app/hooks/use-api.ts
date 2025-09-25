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

export function useUpdateProfile() {
  const { mutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    '/api/auth/profile',
    putFetcher,
    {
      onSuccess: () => {
        // Refresh user data
        mutate('/api/auth/me');
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
export function prefetchCalendarData() {
  // Prefetch current month's entries
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const currentMonth = today.toISOString().slice(0, 7);
  const start = `${currentMonth}-01`;
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const end = `${currentMonth}-${String(endDate).padStart(2, '0')}`;

  // Preload current month data
  preload(`/api/entries?since=${start}&until=${end}`, fetcher);

  // Preload all entries (for general queries)
  preload('/api/entries', fetcher);
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

// Hook for intelligent prefetching based user navigation patterns
export function usePrefetch() {
  return {
    prefetchCalendar: prefetchCalendarData,
    prefetchList: () => {
      prefetchListData();
      prefetchMonthlySummaryData();
    },
    prefetchAdmin: prefetchAdminData,
  };
}
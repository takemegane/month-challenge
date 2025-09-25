import useSWR, { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';

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
      // Optimistic update
      optimisticData: (currentData) => {
        // Get today's date in JST
        const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const todayISO = today.toISOString().slice(0, 10);

        return {
          status: 'created',
        };
      },
      populateCache: (result, currentData) => {
        // Update the cache with the actual result
        return result;
      },
      revalidate: false, // Don't revalidate immediately, trust the optimistic update
      onSuccess: () => {
        // Invalidate all entries queries to refresh data
        mutate(key => typeof key === 'string' && key.startsWith('/api/entries'));
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
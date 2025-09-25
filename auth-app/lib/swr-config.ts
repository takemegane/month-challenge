import { SWRConfiguration } from 'swr';

// Custom fetcher with credentials and error handling
export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
    // Remove cache: "no-store" to allow SWR caching
  });

  // Handle HTTP errors
  if (!res.ok) {
    const error = new Error('HTTP Error');
    (error as any).status = res.status;
    (error as any).info = await res.json().catch(() => ({}));
    throw error;
  }

  return res.json();
};

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher,
  // Cache for 30 seconds, revalidate on focus
  dedupingInterval: 30000,
  focusThrottleInterval: 5000,
  // Revalidate when user comes back to the page
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  // Retry on error with exponential backoff
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  // Keep data fresh
  refreshInterval: 0, // Disable auto refresh for now
  // Performance optimizations
  keepPreviousData: true,
};
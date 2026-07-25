import { SWRConfiguration } from 'swr';

// fetcher が投げるHTTPエラー。ステータスで分岐したい箇所があるため型を付ける。
export type HttpError = Error & { status: number; info: unknown };

export function isHttpError(e: unknown): e is HttpError {
  return e instanceof Error && typeof (e as Partial<HttpError>).status === 'number';
}

// Custom fetcher with credentials and error handling
export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
    // Remove cache: "no-store" to allow SWR caching
  });

  // Handle HTTP errors
  if (!res.ok) {
    const error = new Error('HTTP Error') as HttpError;
    error.status = res.status;
    error.info = await res.json().catch(() => ({}));
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
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Retry on error with exponential backoff
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  // 4xx はリトライしても結果が変わらないので即座に諦める。
  // 401 のログアウト検知が3回のリトライ分だけ遅れるのを防ぐ狙いもある。
  onErrorRetry: (error, _key, config, revalidate, { retryCount }) => {
    if (isHttpError(error) && error.status >= 400 && error.status < 500) return;
    const maxRetry = config.errorRetryCount ?? 3;
    if (retryCount >= maxRetry) return;
    const interval = config.errorRetryInterval ?? 1000;
    setTimeout(() => revalidate({ retryCount }), interval * 2 ** Math.min(retryCount, 8));
  },
  // Keep data fresh
  refreshInterval: 0, // Disable auto refresh for now
  // Performance optimizations
  keepPreviousData: true,
};

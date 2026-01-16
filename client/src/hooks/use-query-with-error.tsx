import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { ReactNode } from "react";

interface QueryWrapperOptions<TData> extends Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> {
  queryKey: string | string[];
  queryFn?: () => Promise<TData>;
}

export function useQueryWithError<TData = unknown>(
  options: QueryWrapperOptions<TData>
): UseQueryResult<TData> & { 
  isOffline: boolean;
  canRetry: boolean;
} {
  const queryResult = useQuery<TData>({
    ...options,
    queryKey: Array.isArray(options.queryKey) ? options.queryKey : [options.queryKey],
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options.gcTime ?? 10 * 60 * 1000, // 10 minutes default (renamed from cacheTime in v5)
  });

  const isOffline = !navigator.onLine;
  const canRetry = queryResult.isError && !queryResult.isFetching;

  return {
    ...queryResult,
    isOffline,
    canRetry
  };
}

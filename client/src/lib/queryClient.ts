import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await res.json();
        errorMessage = json.message || json.error || errorMessage;
      } else {
        errorMessage = await res.text() || errorMessage;
      }
    } catch {
      // If parsing fails, use status text
    }
    // Include status code in error for proper 401 handling
    const error: any = new Error(errorMessage);
    error.status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
type QueryFnOptions = {
  on401?: UnauthorizedBehavior;
};

// Function to create a query function with specific options
export function getQueryFn<T>(options?: QueryFnOptions): QueryFunction<T> {
  const on401 = options?.on401 || "throw";
  
  return async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (on401 === "returnNull" && res.status === 401) {
        return null as any;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Handle errors gracefully
      if (on401 === "returnNull") {
        // Check if it's a 401 error (either from throwIfResNotOk or HTTP response)
        if ((error as any)?.status === 401) {
          return null as any;
        }
      }
      
      // For network errors without status, add generic network error info
      if (error instanceof Error && !(error as any).status) {
        const networkError: any = error;
        networkError.status = 0; // Network error indicator
      }
      
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn<unknown>({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
      staleTime: 30_000, // 30 seconds instead of Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

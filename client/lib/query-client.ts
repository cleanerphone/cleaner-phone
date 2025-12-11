import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:5000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // For web development, redirect to Express server port
  if (typeof window !== "undefined" && window.location) {
    const currentHost = window.location.hostname;
    const protocol = window.location.protocol;
    
    // On localhost (development), use port 5000 for Express API
    if (currentHost === "localhost" || currentHost === "127.0.0.1") {
      return `${protocol}//localhost:5000`;
    }
    
    // On Replit, the proxy routes to the correct port based on the domain
    // But Metro bundler (8081) intercepts requests first, so we need to use port suffix
    // Replit supports accessing specific ports via URL like: domain-00-user.replit.dev:5000
    // However, this doesn't work reliably, so we use a different approach:
    // Check if EXPO_PUBLIC_DOMAIN has the API host
    const expoPublicDomain = process.env.EXPO_PUBLIC_DOMAIN;
    if (expoPublicDomain) {
      // Extract host without port
      const apiHost = expoPublicDomain.replace(/:5000$/, "");
      return `https://${apiHost}`;
    }
    
    // Fallback: use current origin (may not work if Metro intercepts)
    return window.location.origin;
  }

  // For native, use environment variable
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  // Remove port if present (Replit proxies to the correct port automatically)
  host = host.replace(/:5000$/, "");

  return `https://${host}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

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
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

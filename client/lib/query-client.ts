import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:5000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  const expoHost = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
  
  const isReplitHost = (host: string) => 
    host.includes(".replit.dev") || host.includes(".repl.co");

  if (typeof window !== "undefined" && window.location) {
    const currentHost = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (currentHost === "localhost" || currentHost === "127.0.0.1") {
      return `${protocol}//${currentHost}:5000`;
    }
    
    if (isReplitHost(currentHost)) {
      return `${protocol}//${currentHost}:5000`;
    }
    
    return window.location.origin;
  }

  if (expoHost) {
    const hostWithoutPort = expoHost.split(":")[0];
    if (isReplitHost(hostWithoutPort)) {
      return `https://${hostWithoutPort}:5000`;
    }
    return `https://${hostWithoutPort}`;
  }

  const envHost = process.env.EXPO_PUBLIC_DOMAIN;
  if (envHost) {
    const cleanHost = envHost.replace(/:5000$/, "").replace(/:8081$/, "");
    if (isReplitHost(cleanHost)) {
      return `https://${cleanHost}:5000`;
    }
    return `https://${cleanHost}`;
  }

  throw new Error("Cannot determine API URL - no host configuration found");
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

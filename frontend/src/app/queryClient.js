import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      // Always fetch fresh data on navigation
      gcTime: 1e3 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true
    }
  }
});

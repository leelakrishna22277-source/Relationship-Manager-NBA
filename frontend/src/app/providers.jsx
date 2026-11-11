import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { AuthProvider } from "../features/auth/AuthContext";
export const AppProviders = ({ children }) => {
  return <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>;
};

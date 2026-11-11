import { apiClient } from "./apiClient";
export const authService = {
  async login(credentials) {
    return apiClient.post("/auth/login", credentials);
  },
  async getMe() {
    return apiClient.get("/auth/me");
  },
  async logout() {
    return apiClient.post("/auth/logout");
  }
};

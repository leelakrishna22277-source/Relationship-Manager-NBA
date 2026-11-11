import { apiClient } from "./apiClient";
export const rmService = {
  async getDashboard() {
    return apiClient.get("/rm/dashboard");
  }
};

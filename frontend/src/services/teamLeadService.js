import { apiClient } from "./apiClient";
export const teamLeadService = {
  async getDashboard() {
    return apiClient.get("/team-lead/dashboard");
  },
  async getTeamRms() {
    return apiClient.get("/team-lead/rms");
  },
  async assignClient(clientId, rmId) {
    return apiClient.patch(`/team-lead/clients/${clientId}/assign`, { rm_id: rmId });
  },
  async getTeamOutcomes(params = {}) {
    const query = new URLSearchParams();
    if (params.outcome) query.append("outcome", params.outcome);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    const qs = query.toString();
    return apiClient.get(`/team-lead/outcomes${qs ? `?${qs}` : ""}`);
  }
};

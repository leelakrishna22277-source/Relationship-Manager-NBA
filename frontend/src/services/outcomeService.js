import { apiClient } from "./apiClient";
export const outcomeService = {
  async recordOutcome(nbaId, payload) {
    return apiClient.post(`/nbas/${nbaId}/outcomes`, payload);
  },
  async getRmOutcomes(params = {}) {
    const query = new URLSearchParams();
    if (params.outcome) query.append("outcome", params.outcome);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    const queryString = query.toString();
    return apiClient.get(`/rm/outcomes${queryString ? `?${queryString}` : ""}`);
  },
  async getOutcomeById(id) {
    return apiClient.get(`/rm/outcomes/${id}`);
  }
};

import { apiClient } from "./apiClient";
export const nbaService = {
  async getNbas(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.priority) query.append("priority", params.priority);
    if (params.action_type) query.append("action_type", params.action_type);
    if (params.client_id) query.append("client_id", params.client_id);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.exclude_completed) query.append("exclude_completed", "true");
    const queryString = query.toString();
    return apiClient.get(`/nbas${queryString ? `?${queryString}` : ""}`);
  },
  async getNbaById(id) {
    return apiClient.get(`/nbas/${id}`);
  },
  async getNbaSuitability(id) {
    return apiClient.get(`/nbas/${id}/suitability`);
  },
  async acceptNba(id, notes) {
    return apiClient.post(`/nbas/${id}/accept`, { notes });
  },
  async dismissNba(id, rationale) {
    return apiClient.post(`/nbas/${id}/dismiss`, { rationale });
  }
};

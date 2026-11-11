import { apiClient } from "./apiClient";
export const clientService = {
  async getClients(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.segment) query.append("segment", params.segment);
    if (params.risk_tolerance) query.append("risk_tolerance", params.risk_tolerance);
    if (params.risk_profile) query.append("risk_profile", params.risk_profile);
    if (params.rm_id) query.append("rm_id", params.rm_id);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.sort_by) query.append("sort_by", params.sort_by);
    if (params.sort_order) query.append("sort_order", params.sort_order);
    const queryString = query.toString();
    return apiClient.get(`/clients${queryString ? `?${queryString}` : ""}`);
  },
  async assignRm(clientId, rmId) {
    return apiClient.patch(`/clients/${clientId}/assign`, { rm_id: rmId });
  },
  async getClientById(id) {
    return apiClient.get(`/clients/${id}`);
  },
  async getClientHoldings(id) {
    return apiClient.get(`/clients/${id}/holdings`);
  },
  async getClientSignals(id) {
    return apiClient.get(`/clients/${id}/signals`);
  },
  async getClientNbas(id) {
    return apiClient.get(`/clients/${id}/nbas`);
  },
  async generateNbas(id) {
    return apiClient.post(`/clients/${id}/nbas/generate`);
  }
};

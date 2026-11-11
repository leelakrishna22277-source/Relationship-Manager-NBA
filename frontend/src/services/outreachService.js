import { apiClient } from "./apiClient";
export const outreachService = {
  async generateDraft(nbaId, payload = {}) {
    return apiClient.post(`/nbas/${nbaId}/outreach/draft`, payload);
  },
  async saveOutreach(nbaId, payload) {
    return apiClient.post(`/nbas/${nbaId}/outreach`, payload);
  },
  async getLatestOutreach(nbaId) {
    return apiClient.get(`/nbas/${nbaId}/outreach`);
  },
  async approveOutreach(outreachId) {
    return apiClient.post(`/outreach/${outreachId}/approve`);
  },
  async recordContactActivity(outreachId, payload) {
    return apiClient.post(`/outreach/${outreachId}/activities`, payload);
  },
  async getContactActivities(outreachId) {
    return apiClient.get(`/outreach/${outreachId}/activities`);
  }
};

import api from './api.js';

export const policyService = {
  getPolicies: async () => {
    const response = await api.get('/policies');
    return response.data;
  },

  createPolicy: async (policyData) => {
    const response = await api.post('/policies', policyData);
    return response.data;
  },

  deletePolicy: async (policyId) => {
    const response = await api.delete(`/policies/${policyId}`);
    return response.data;
  },
};

export default policyService;

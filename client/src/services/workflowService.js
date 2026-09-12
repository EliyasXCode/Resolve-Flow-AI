import api from './api.js';

export const workflowService = {
  triggerTriage: async (complaintId) => {
    const response = await api.post(`/workflows/${complaintId}/triage`);
    return response.data;
  },

  triggerResolution: async (complaintId) => {
    const response = await api.post(`/workflows/${complaintId}/resolve`);
    return response.data;
  },

  reviewResolution: async (complaintId, { decision, modifiedResolution, notes }) => {
    const response = await api.post(`/workflows/${complaintId}/review`, {
      decision,
      modifiedResolution,
      notes,
    });
    return response.data;
  },

  triggerDraft: async (complaintId) => {
    const response = await api.post(`/workflows/${complaintId}/draft`);
    return response.data;
  },

  executeAction: async (complaintId) => {
    const response = await api.post(`/workflows/${complaintId}/execute-action`);
    return response.data;
  },

  runOrchestration: async (complaintId) => {
    const response = await api.post(`/workflows/${complaintId}/orchestrate`);
    return response.data;
  },

  getWorkflow: async (complaintId) => {
    const response = await api.get(`/workflows/${complaintId}`);
    return response.data;
  },
};

export default workflowService;

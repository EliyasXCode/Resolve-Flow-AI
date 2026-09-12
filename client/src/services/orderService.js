import api from './api.js';

export const orderService = {
  getMyOrders: async () => {
    const response = await api.get('/orders/my-orders');
    return response.data;
  },

  ensureSampleOrders: async () => {
    const response = await api.post('/orders/ensure-sample');
    return response.data;
  },
};

export default orderService;

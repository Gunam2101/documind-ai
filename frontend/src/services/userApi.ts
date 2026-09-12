import { api } from './api';
import { User, DashboardStats } from '../types';

export const userApi = {
  getProfile: async (): Promise<User> => {
    const res = await api.get('/user/profile');
    return res.data;
  },

  updateProfile: async (data: { name?: string; email?: string; current_password?: string; new_password?: string }): Promise<User> => {
    const res = await api.patch('/user/profile', data);
    return res.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/user/dashboard-stats');
    return res.data;
  }
};

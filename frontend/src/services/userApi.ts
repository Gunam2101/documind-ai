import { api } from './api';
import { User, DashboardStats } from '../types';
import { DEMO_USER } from './demoData';

export const userApi = {
  getProfile: async (): Promise<User> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      return DEMO_USER;
    }

    const res = await api.get('/user/profile');
    return res.data;
  },

  updateProfile: async (data: { name?: string; email?: string; current_password?: string; new_password?: string }): Promise<User> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      if (data.name) DEMO_USER.name = data.name;
      return DEMO_USER;
    }

    const res = await api.patch('/user/profile', data);
    return res.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      return {
        total_documents: 2,
        total_pages: 63,
        questions_asked: 18,
        storage_used_bytes: 1180532
      };
    }

    const res = await api.get('/user/dashboard-stats');
    return res.data;
  }
};

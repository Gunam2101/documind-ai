import { api } from './api';
import { User } from '../types';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token: string, new_password: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/reset-password', { token, new_password });
    return res.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/verify-email', { token });
    return res.data;
  }
};

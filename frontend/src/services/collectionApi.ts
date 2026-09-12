import { api } from './api';
import { Collection } from '../types';

export const collectionApi = {
  list: async (): Promise<Collection[]> => {
    const res = await api.get('/collections');
    return res.data;
  },

  get: async (id: string): Promise<Collection> => {
    const res = await api.get(`/collections/${id}`);
    return res.data;
  },

  create: async (data: { name: string; description?: string; document_ids?: string[] }): Promise<Collection> => {
    const res = await api.post('/collections', data);
    return res.data;
  },

  update: async (id: string, data: { name?: string; description?: string }): Promise<Collection> => {
    const res = await api.patch(`/collections/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/collections/${id}`);
  },

  addDocument: async (collection_id: string, document_id: string): Promise<Collection> => {
    const res = await api.post(`/collections/${collection_id}/documents`, { document_id });
    return res.data;
  },

  removeDocument: async (collection_id: string, document_id: string): Promise<Collection> => {
    const res = await api.delete(`/collections/${collection_id}/documents/${document_id}`);
    return res.data;
  }
};

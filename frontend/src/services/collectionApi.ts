import { api } from './api';
import { Collection } from '../types';
import { DEMO_DOCUMENTS } from './demoData';

const DEMO_COLLECTIONS: Collection[] = [
  {
    id: 'demo-col-001',
    user_id: 'demo-user-001',
    name: 'Sample Risk & Credit Analysis',
    description: 'Collection of demo finance documents and credit assessment notes.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    documents: DEMO_DOCUMENTS
  }
];

let demoCollectionsStore = [...DEMO_COLLECTIONS];

export const collectionApi = {
  list: async (): Promise<Collection[]> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      return demoCollectionsStore;
    }

    const res = await api.get('/collections');
    return res.data;
  },

  get: async (id: string): Promise<Collection> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      return demoCollectionsStore.find(c => c.id === id) || demoCollectionsStore[0];
    }

    const res = await api.get(`/collections/${id}`);
    return res.data;
  },

  create: async (data: { name: string; description?: string; document_ids?: string[] }): Promise<Collection> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      const newCol: Collection = {
        id: `demo-col-${Date.now()}`,
        user_id: 'demo-user-001',
        name: data.name,
        description: data.description || 'Demo Collection',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        documents: DEMO_DOCUMENTS
      };
      demoCollectionsStore.push(newCol);
      return newCol;
    }

    const res = await api.post('/collections', data);
    return res.data;
  },

  update: async (id: string, data: { name?: string; description?: string }): Promise<Collection> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      const col = demoCollectionsStore.find(c => c.id === id);
      if (col) {
        if (data.name) col.name = data.name;
        if (data.description !== undefined) col.description = data.description;
      }
      return col || demoCollectionsStore[0];
    }

    const res = await api.patch(`/collections/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      demoCollectionsStore = demoCollectionsStore.filter(c => c.id !== id);
      return;
    }

    await api.delete(`/collections/${id}`);
  },

  addDocument: async (collection_id: string, document_id: string): Promise<Collection> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      const col = demoCollectionsStore.find(c => c.id === collection_id);
      return col || demoCollectionsStore[0];
    }

    const res = await api.post(`/collections/${collection_id}/documents`, { document_id });
    return res.data;
  },

  removeDocument: async (collection_id: string, document_id: string): Promise<Collection> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      const col = demoCollectionsStore.find(c => c.id === collection_id);
      return col || demoCollectionsStore[0];
    }

    const res = await api.delete(`/collections/${collection_id}/documents/${document_id}`);
    return res.data;
  }
};

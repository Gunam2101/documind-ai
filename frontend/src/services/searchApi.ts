import { api } from './api';
import { SearchResponse } from '../types';

export const searchApi = {
  search: async (query: string, document_ids?: string[], collection_id?: string, top_k = 5): Promise<SearchResponse> => {
    const res = await api.post('/search', {
      query,
      document_ids,
      collection_id,
      top_k
    });
    return res.data;
  }
};

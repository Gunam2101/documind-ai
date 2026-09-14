import { api } from './api';
import { SearchResponse } from '../types';

export const searchApi = {
  search: async (query: string, document_ids?: string[], collection_id?: string, top_k = 5): Promise<SearchResponse> => {
    if (localStorage.getItem('documind_demo_mode') === 'true') {
      return {
        query,
        results: [
          {
            document_id: 'demo-doc-msme-risk-2026',
            filename: 'MSME_Loan_Default_Risk_REPORT_Final.pdf (Demo Sample)',
            page: 4,
            content: `[DEMO MODE RESULT] Sample search match for "${query}" in credit risk analysis report.`,
            score: 0.94
          },
          {
            document_id: 'demo-doc-ai-architectures-2026',
            filename: 'AI_Agent_Architectures_Lecture_Notes.pdf (Demo Sample)',
            page: 12,
            content: `[DEMO MODE RESULT] Relevant concept snippet related to "${query}" in lecture notes.`,
            score: 0.88
          }
        ]
      };
    }

    const res = await api.post('/search', {
      query,
      document_ids,
      collection_id,
      top_k
    });
    return res.data;
  }
};

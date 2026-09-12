import { api } from './api';
import { Conversation, SourceCitation, IntelligenceResponse, IntelligenceMode } from '../types';

export interface ChatPayload {
  conversation_id?: string;
  document_ids?: string[];
  collection_id?: string;
  message: string;
  image_url?: string;
  language?: string;
  answer_style?: 'auto' | 'quick' | '2_marks' | '5_marks' | '10_marks' | 'detailed';
  page_number?: number;
}

export interface ChatResponseData {
  conversation_id: string;
  answer: string;
  sources: SourceCitation[];
}

export const chatApi = {
  sendMessage: async (payload: ChatPayload): Promise<ChatResponseData> => {
    const res = await api.post('/chat', payload);
    return res.data;
  },

  getIntelligence: async (payload: {
    document_id: string;
    mode: IntelligenceMode;
    custom_prompt?: string;
    num_questions?: number;
    difficulty?: string;
    question_types?: string[];
    marks?: string;
    topic?: string;
    target_level?: string;
    target_language?: string;
    concept_query?: string;
  }): Promise<IntelligenceResponse> => {
    const res = await api.post('/chat/intelligence', payload);
    return res.data;
  },

  listConversations: async (): Promise<Conversation[]> => {
    const res = await api.get('/conversations');
    return res.data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const res = await api.get(`/conversations/${id}`);
    return res.data;
  },

  updateTitle: async (id: string, title: string): Promise<Conversation> => {
    const res = await api.patch(`/conversations/${id}`, { title });
    return res.data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}`);
  }
};

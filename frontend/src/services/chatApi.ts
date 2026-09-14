import { api } from './api';
import { Conversation, SourceCitation, IntelligenceResponse, IntelligenceMode } from '../types';
import { DEMO_CONVERSATIONS, DEMO_INTELLIGENCE } from './demoData';

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

let demoConversationsStore = [...DEMO_CONVERSATIONS];

function isDemoMode(): boolean {
  return localStorage.getItem('documind_demo_mode') === 'true';
}

export const chatApi = {
  sendMessage: async (payload: ChatPayload): Promise<ChatResponseData> => {
    if (isDemoMode()) {
      const convId = payload.conversation_id || `demo-conv-${Date.now()}`;
      let conv = demoConversationsStore.find(c => c.id === convId);

      if (!conv) {
        conv = {
          id: convId,
          user_id: 'demo-user-001',
          title: payload.message.slice(0, 30) + '...',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          documents: [],
          messages: []
        };
        demoConversationsStore.unshift(conv);
      }

      // Add user message
      conv.messages.push({
        id: `msg-user-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content: payload.message,
        image_url: payload.image_url,
        created_at: new Date().toISOString()
      });

      const demoAnswer = `### [DEMO MODE RESPONSE] Analysis for: "${payload.message}"\n\nHere is a structured explanation based on your sample document:\n\n1. **Core Insight**: In Demo Mode, AI responses synthesize sample document text with grounded references.\n2. **Key Application**: You can ask follow-up questions, request 2-mark or 5-mark answer styles, or ask in any language.\n\n> *Sign in with a real account to connect your own Groq API key and upload custom documents.*`;

      const demoSources: SourceCitation[] = [
        {
          document_id: 'demo-doc-msme-risk-2026',
          filename: 'MSME_Loan_Default_Risk_REPORT_Final.pdf (Demo Sample)',
          page: payload.page_number || 4,
          excerpt: 'Sample document reference citation for demonstration purposes.'
        }
      ];

      // Add AI message
      conv.messages.push({
        id: `msg-ai-${Date.now()}`,
        conversation_id: convId,
        role: 'assistant',
        content: demoAnswer,
        sources: demoSources,
        created_at: new Date().toISOString()
      });

      return {
        conversation_id: convId,
        answer: demoAnswer,
        sources: demoSources
      };
    }

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
    if (isDemoMode()) {
      const modeKey = payload.mode;
      const fallback = DEMO_INTELLIGENCE[modeKey] || DEMO_INTELLIGENCE['summary'];
      return {
        ...fallback,
        document_id: payload.document_id || 'demo-doc-msme-risk-2026'
      };
    }

    const res = await api.post('/chat/intelligence', payload);
    return res.data;
  },

  listConversations: async (): Promise<Conversation[]> => {
    if (isDemoMode()) {
      return demoConversationsStore;
    }

    const res = await api.get('/conversations');
    return res.data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    if (isDemoMode()) {
      const conv = demoConversationsStore.find(c => c.id === id) || demoConversationsStore[0];
      return conv;
    }

    const res = await api.get(`/conversations/${id}`);
    return res.data;
  },

  updateTitle: async (id: string, title: string): Promise<Conversation> => {
    if (isDemoMode()) {
      const conv = demoConversationsStore.find(c => c.id === id);
      if (conv) conv.title = title;
      return conv || demoConversationsStore[0];
    }

    const res = await api.patch(`/conversations/${id}`, { title });
    return res.data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    if (isDemoMode()) {
      demoConversationsStore = demoConversationsStore.filter(c => c.id !== id);
      return;
    }

    await api.delete(`/conversations/${id}`);
  }
};

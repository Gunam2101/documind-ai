import { Document, Conversation, IntelligenceResponse, User } from '../types';

export const DEMO_USER: User = {
  id: 'demo-user-001',
  name: 'Demo Student (Sample User)',
  email: 'demo@documind.ai',
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const DEMO_DOCUMENTS: Document[] = [
  {
    id: 'demo-doc-msme-risk-2026',
    user_id: 'demo-user-001',
    filename: 'MSME_Loan_Default_Risk_REPORT_Final.pdf',
    original_filename: 'MSME_Loan_Default_Risk_REPORT_Final.pdf (Demo Sample)',
    file_size: 721612,
    page_count: 39,
    status: 'READY',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'demo-doc-ai-architectures-2026',
    user_id: 'demo-user-001',
    filename: 'AI_Agent_Architectures_Lecture_Notes.pdf',
    original_filename: 'AI_Agent_Architectures_Lecture_Notes.pdf (Demo Sample)',
    file_size: 458920,
    page_count: 24,
    status: 'READY',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString()
  }
];

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'demo-conv-001',
    user_id: 'demo-user-001',
    title: 'Demo: MSME Default Risk Factors & Credit Mitigation',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    documents: [DEMO_DOCUMENTS[0]],
    messages: [
      {
        id: 'msg-demo-1',
        conversation_id: 'demo-conv-001',
        role: 'user',
        content: 'What are the main risk factors for MSME loan defaults?',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'msg-demo-2',
        conversation_id: 'demo-conv-001',
        role: 'assistant',
        content: '### [DEMO MODE RESPONSE] Primary MSME Default Risk Factors\n\nBased on the demo risk report document, the key drivers of credit default in MSME loans include:\n\n1. **Working Capital Cash Flow Strain**: Irregular revenue cycles and delayed accounts receivables from primary buyers.\n2. **Inadequate Asset Coverage**: Insufficient collateral backing increases Loss Given Default (LGD).\n3. **Operational Imbalances**: High dependency on key promoters and unorganized supplier networks.\n\n*Note: You are currently using DocuMind AI in Demo Mode.*',
        sources: [
          {
            document_id: 'demo-doc-msme-risk-2026',
            filename: 'MSME_Loan_Default_Risk_REPORT_Final.pdf (Demo Sample)',
            page: 4,
            excerpt: 'Working capital strain is the primary catalyst for micro-enterprise debt impairment.'
          }
        ],
        created_at: new Date(Date.now() - 3590000).toISOString()
      }
    ]
  }
];

export const DEMO_INTELLIGENCE: Record<string, IntelligenceResponse> = {
  summary: {
    document_id: 'demo-doc-msme-risk-2026',
    mode: 'summary',
    title: 'Executive Summary — MSME Default Risk Analysis',
    content: 'Comprehensive analysis of small business default patterns and credit risk modeling in commercial banking.',
    sources: [
      { document_id: 'demo-doc-msme-risk-2026', filename: 'MSME_Loan_Default_Risk_REPORT_Final.pdf (Demo Sample)', page: 1, excerpt: 'Executive Summary of MSME Risk Report.' }
    ],
    summary_structured: {
      overview: {
        executive_summary: '[DEMO MODE] This sample report evaluates non-performing asset (NPA) trends across micro, small, and medium enterprises.',
        document_purpose: 'Identify early warning credit indicators and risk mitigation strategies for commercial lending.',
        scope: 'Covers 39 pages of banking industry default data and statistical loan portfolios.'
      },
      main_topics: [
        { title: 'Liquidity & Cash Flow Cycles', description: 'Impact of delayed accounts receivables on working capital loans.' },
        { title: 'Collateral Assessment', description: 'Evaluation of primary vs secondary security coverage.' }
      ],
      key_concepts: [
        { title: 'Loss Given Default (LGD)', explanation: 'The percentage of funds lost when a borrower defaults on a loan facility.' },
        { title: 'Probability of Default (PD)', explanation: 'Likelihood that a loan account transitions to NPA within 12 months.' }
      ],
      key_takeaways: [
        'Automated credit scoring reduces default rates by 24%.',
        'Cash flow monitoring is more predictive of default than historical collateral values.'
      ]
    }
  },
  study_notes: {
    document_id: 'demo-doc-msme-risk-2026',
    mode: 'study_notes',
    title: 'Study Notes — MSME Credit Risk & Banking Metrics',
    content: 'Structured revision notes for exam preparation and credit analysis.',
    sources: [
      { document_id: 'demo-doc-msme-risk-2026', filename: 'MSME_Loan_Default_Risk_REPORT_Final.pdf (Demo Sample)', page: 12, excerpt: 'Key credit metrics and early warning signals.' }
    ],
    study_notes_structured: {
      topics: [
        {
          topic: '1. Early Warning Signals (EWS)',
          definition: 'Key financial and behavioral indicators signalling impending credit default.',
          important_points: [
            'Continuous utilization of cash credit limits at > 95%.',
            'Frequent cheque bounces and un-cleared inward bills.',
            'Delay in submitting periodic stock statements.'
          ],
          example: 'A borrower utilizing 99% of cash credit limit for 6 consecutive months.',
          remember: 'EWS flags allow proactive restructuring before account turns into 90-day DPD NPA.'
        },
        {
          topic: '2. DSCR (Debt Service Coverage Ratio)',
          definition: 'Ratio measuring cash flow available to pay current debt obligations.',
          important_points: [
            'Formula: DSCR = Net Operating Income / Total Debt Service.',
            'Ideal benchmark for MSME lending is >= 1.25 to 1.50.',
            'Values < 1.0 indicate insufficient cash flow to service debt.'
          ],
          example: 'Net operating income of $150k against debt payments of $100k gives DSCR = 1.50.',
          remember: 'DSCR below 1.0 is a mandatory credit risk review trigger.'
        }
      ]
    }
  },
  custom_questions: {
    document_id: 'demo-doc-msme-risk-2026',
    mode: 'custom_questions',
    title: 'Practice Questions — Credit Assessment & Risk',
    content: 'Sample examination questions derived from the document.',
    sources: [],
    custom_questions: [
      {
        id: 1,
        type: 'mcq',
        question: 'What is the recommended minimum DSCR benchmark for MSME working capital loans?',
        options: ['0.75', '1.00', '1.25', '2.50'],
        correct_answer: '1.25',
        explanation: 'A DSCR of 1.25 ensures a 25% cash buffer over annual debt service requirements.',
        marks: 2,
        difficulty: 'medium',
        page: 15
      },
      {
        id: 2,
        type: 'short_answer',
        question: 'Define Early Warning Signals (EWS) in banking credit monitoring.',
        model_answer: 'Early Warning Signals (EWS) are operational and financial metrics (e.g., continuous high CC limit utilization, cheque bounces, auditor qualifications) that alert lenders to potential credit distress before an account becomes non-performing.',
        marks: 5,
        difficulty: 'medium',
        page: 8
      }
    ]
  },
  quiz: {
    document_id: 'demo-doc-msme-risk-2026',
    mode: 'quiz',
    title: 'Interactive Practice Quiz — MSME Risk',
    content: 'Test your understanding of MSME credit risk concepts.',
    sources: [],
    quiz_questions: [
      {
        id: 1,
        question: 'Which of the following is the single most predictive factor for MSME defaults?',
        options: ['Company Name', 'Working Capital Cash Flow Strain', 'Office Location', 'Number of Employees'],
        correct_answer: 'Working Capital Cash Flow Strain',
        explanation: 'Delayed receivables and tight cash flows directly lead to missed debt obligations.',
        page: 4
      },
      {
        id: 2,
        question: 'What does a Debt Service Coverage Ratio (DSCR) under 1.0 indicate?',
        options: ['Excess profits', 'Insufficient cash flow to pay debt', 'Zero tax liability', 'High credit rating'],
        correct_answer: 'Insufficient cash flow to pay debt',
        explanation: 'A DSCR < 1.0 means operating cash flow is less than annual principal and interest payments.',
        page: 15
      }
    ]
  }
};

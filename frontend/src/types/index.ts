export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface User {
  id: string;
  name: string;
  email: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  status: DocumentStatus;
  processing_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceCitation {
  document_id: string;
  filename: string;
  page: number;
  excerpt: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string | null;
  sources?: SourceCitation[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  documents: Document[];
  messages: Message[];
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  documents: Document[];
}

export interface SearchItem {
  document_id: string;
  filename: string;
  page: number;
  content: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchItem[];
}

export interface DashboardStats {
  total_documents: number;
  total_pages: number;
  questions_asked: number;
  storage_used_bytes: number;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  ai_model: string;
  response_style: string;
  temperature: number;
  show_sources: boolean;
  enter_to_send: boolean;
}

export interface ChatRequest {
  conversation_id?: string;
  document_ids?: string[];
  collection_id?: string;
  message: string;
  image_url?: string;
  language?: string;
  answer_style?: 'auto' | 'quick' | '2_marks' | '5_marks' | '10_marks' | 'detailed';
  page_number?: number;
}

export type IntelligenceMode = 'summary' | 'key_points' | 'important_questions' | 'exam_questions' | 'study_notes' | 'quiz' | 'real_exam' | 'insights' | 'flashcards' | 'custom_questions' | 'explain_simply' | 'learning_path';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  page: number;
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  page: number;
}

export interface CustomQuestion {
  id: number;
  type: 'mcq' | 'short_answer' | 'long_answer';
  question: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  model_answer?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  page: number;
}

export interface ImportantQuestion {
  id: number;
  question: string;
  topic?: string;
  difficulty?: string;
  marks?: number;
  importance?: string;
  expected_depth?: string;
  model_answer?: string;
  page: number;
}

export interface ExamQuestionItem {
  id?: number;
  question: string;
  marks?: number;
  difficulty?: string;
  topic?: string;
  importance?: string;
  model_answer?: string;
  page: number;
}

export interface ExamSection {
  marks: number;
  questions: ExamQuestionItem[];
}

export interface InsightsData {
  document_type: string;
  main_subject: string;
  difficulty: string;
  core_topics: string[];
  key_takeaways: string[];
  study_focus: string[];
}

export interface OverviewSection {
  executive_summary: string;
  document_purpose: string;
  scope: string;
}

export interface MainTopicItem {
  title: string;
  description: string;
}

export interface KeyConceptItem {
  title: string;
  explanation: string;
}

export interface SummaryStructured {
  overview: OverviewSection;
  main_topics: MainTopicItem[];
  key_concepts: KeyConceptItem[];
  key_takeaways: string[];
}

export interface StudyTopicNote {
  topic: string;
  definition: string;
  important_points: string[];
  example?: string | null;
  remember: string;
}

export interface StudyNotesStructured {
  topics: StudyTopicNote[];
}

export interface TopicLearningItem {
  id: number;
  title: string;
  explanation: string;
  key_concept: string;
  example?: string | null;
  important_points: string[];
}

export interface LearningPathStructured {
  document_title: string;
  topics: TopicLearningItem[];
}

export interface IntelligenceResponse {
  document_id: string;
  mode: IntelligenceMode;
  title: string;
  content: string;
  quiz_questions?: QuizQuestion[] | null;
  flashcards?: Flashcard[] | null;
  custom_questions?: CustomQuestion[] | null;
  important_questions?: ImportantQuestion[] | null;
  exam_sections?: ExamSection[] | null;
  insights?: InsightsData | null;
  summary_structured?: SummaryStructured | null;
  study_notes_structured?: StudyNotesStructured | null;
  learning_path_structured?: LearningPathStructured | null;
  sources: SourceCitation[];
}


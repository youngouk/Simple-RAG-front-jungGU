// API Response Types
export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

// API 응답에서 받는 실제 문서 타입 (백엔드 응답 구조에 맞게 수정)
export interface ApiDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  status: string;
  chunk_count: number;
  processing_time?: number | null;
  error_message?: string | null;
}

// 프론트엔드에서 사용하는 문서 타입
export interface Document {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'failed';
  chunks?: number;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
  };
}

export interface UploadResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export interface UploadStatus {
  job_id: string;
  status: 'processing' | 'completed' | 'failed' | 'completed_with_errors';
  progress: number;
  message: string;
  filename?: string;
  chunk_count?: number;
  processing_time?: number;
  error_message?: string | null;
  timestamp?: string;
  documentId?: string; // 백워드 호환성을 위해 유지
  error?: string; // 백워드 호환성을 위해 유지
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
}

export interface Source {
  id: number;
  document: string;
  page?: number;
  chunk?: number;
  relevance: number;
  content_preview: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
  session_id: string;
  processing_time: number;
  tokens_used: number;
  timestamp: string;
  model_info?: {
    provider: string;
    model: string;
    generation_time: number;
    model_config?: Record<string, unknown>;
  };
}

export interface ChatHistoryEntry {
  id?: string | number;
  role?: 'user' | 'assistant';
  message?: string;
  question?: string;
  prompt?: string;
  response?: string;
  answer?: string;
  content?: string;
  user_message?: string;
  assistant_message?: string;
  session_id?: string;
  timestamp?: string;
  created_at?: string;
  updated_at?: string;
  sources?: Source[];
}

// 세션 정보 API 응답 타입
export interface SessionInfo {
  session_id: string;
  messageCount: number;
  tokensUsed: number;
  processingTime: number;
  modelInfo: {
    provider: string;
    model: string;
    generation_time: number;
    model_config: Record<string, unknown>;
  };
  timestamp: string;
}

export interface Stats {
  uptime: number;
  uptime_human: string;
  cpu_percent: number;
  memory_usage: {
    total: number;
    available: number;
    used: number;
    percentage: number;
    total_gb: number;
    used_gb: number;
    available_gb: number;
  };
  disk_usage: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    total_gb: number;
    used_gb: number;
    free_gb: number;
  };
  system_info: {
    platform: string;
    python_version: string;
    cpu_count: number;
    boot_time: string;
  };
}

// UI State Types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// Form Types
export interface UploadFormData {
  file: File | null;
  description?: string;
}

export interface SearchFilters {
  query: string;
  status?: Document['status'];
  dateFrom?: string;
  dateTo?: string;
}

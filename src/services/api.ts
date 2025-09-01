import axios from 'axios';
import {
  HealthStatus,
  Document,
  ApiDocument,
  UploadResponse,
  UploadStatus,
  ChatResponse,
  Stats,
} from '../types';

// API 기본 설정
// 개발 모드에서는 항상 상대 URL 사용 (Vite 프록시 활용)
const API_BASE_URL = import.meta.env.DEV ? '' : (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // 세션 ID 추가
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 에러 처리
      localStorage.removeItem('sessionId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Health Check API
export const healthAPI = {
  check: () => api.get<HealthStatus>('/health'),
};

// 고유한 임시 ID 생성을 위한 카운터
let tempIdCounter = 0;

// API 응답을 UI용 데이터로 변환하는 함수
const transformApiDocument = (apiDoc: ApiDocument): Document => {
  // 백엔드 응답에서 filename이 있으면 사용, 없으면 기본값
  const documentTitle = apiDoc.filename || 'Unknown Document';

  // 날짜 처리: 유효한 날짜인지 확인하고 변환
  const getValidDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      // 1970년 이전이거나 유효하지 않은 날짜인 경우 현재 시간 사용
      if (isNaN(date.getTime()) || date.getFullYear() < 1990) {
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  return {
    id: apiDoc.id || `temp-${Date.now()}-${++tempIdCounter}-${Math.random().toString(36).substr(2, 9)}`, // 고유한 임시 ID 생성
    filename: documentTitle,
    originalName: documentTitle,
    size: apiDoc.file_size || 0,
    mimeType: 'application/octet-stream', // API에서 제공하지 않으므로 기본값
    uploadedAt: getValidDate(apiDoc.upload_date),
    status: (apiDoc.status as 'processing' | 'completed' | 'failed') || 'completed',
    chunks: apiDoc.chunk_count,
    metadata: {
      wordCount: 0, // 백엔드에서 제공하지 않으므로 기본값
    },
  };
};

// Document API
export const documentAPI = {
  // 문서 목록 조회
  getDocuments: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => {
    const response = await api.get<{ documents: ApiDocument[]; total: number }>('/api/upload/documents', { params });
    return {
      ...response,
      data: {
        documents: response.data.documents.map(transformApiDocument),
        total: response.data.total,
      },
    };
  },

  // 문서 상세 조회
  getDocument: (id: string) => api.get<Document>(`/api/upload/documents/${id}`),

  // 문서 업로드
  upload: (file: File, onProgress?: (progress: number) => void, settings?: { splitterType?: string; chunkSize?: number; chunkOverlap?: number }) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // 업로드 설정이 있으면 추가
    if (settings) {
      if (settings.splitterType) {
        formData.append('splitter_type', settings.splitterType);
      }
      if (settings.chunkSize) {
        formData.append('chunk_size', settings.chunkSize.toString());
      }
      if (settings.chunkOverlap) {
        formData.append('chunk_overlap', settings.chunkOverlap.toString());
      }
    }

    return api.post<UploadResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  // 업로드 상태 확인
  getUploadStatus: (jobId: string) => 
    api.get<UploadStatus>(`/api/upload/status/${jobId}`),

  // 문서 삭제 (단일)
  deleteDocument: (id: string) => 
    api.delete(`/api/upload/documents/${id}`),

  // 문서 일괄 삭제
  deleteDocuments: (ids: string[]) => 
    api.post('/api/upload/documents/bulk-delete', { ids }),

  // 문서 다운로드
  downloadDocument: (id: string) => 
    api.get(`/api/upload/documents/${id}/download`, {
      responseType: 'blob',
    }),
};

// Chat API
export const chatAPI = {
  // 메시지 전송
  sendMessage: (message: string, sessionId?: string) => 
    api.post<ChatResponse>('/api/chat', { 
      message, 
      session_id: sessionId || localStorage.getItem('chatSessionId') 
    }),

  // 채팅 기록 조회
  getChatHistory: (sessionId: string) => 
    api.get<{ messages: ChatResponse[] }>(`/api/chat/history/${sessionId}`),

  // 새 세션 시작
  startNewSession: () => 
    api.post<{ session_id: string }>('/api/chat/session', {}),
};

// Stats API
export const statsAPI = {
  // 전체 통계 조회
  getStats: () => api.get<Stats>('/stats'),

  // 문서 통계 조회
  getDocumentStats: () => api.get<Stats['documents']>('/api/upload/stats'),
};

export default api;
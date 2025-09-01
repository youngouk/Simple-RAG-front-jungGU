/**
 * 관리자 시스템 API 서비스
 * 백엔드 관리자 API와 통신하는 서비스 레이어
 * 향상된 기능: 실시간 모니터링, 세션 관리, WebSocket 지원
 */

// 개발 모드에서는 항상 상대 URL 사용 (Vite 프록시 활용)
const API_BASE_URL = import.meta.env.DEV ? '' : (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
);
const WS_BASE_URL = import.meta.env.DEV ? `ws://${window.location.host}` : (
  import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'
);

// Removed unused ApiResponse interface

class AdminService {
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5초
  private eventListeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();
  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/api/admin${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * WebSocket 연결 초기화
   */
  initWebSocket() {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.wsConnection = new WebSocket(`${WS_BASE_URL}/admin-ws`);
      
      this.wsConnection.onopen = () => {
        console.log('Admin WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connection', { connected: true });
      };
      
      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };
      
      this.wsConnection.onclose = () => {
        console.log('Admin WebSocket disconnected');
        this.emit('connection', { connected: false });
        this.scheduleReconnect();
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket 재연결 스케줄링
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`WebSocket reconnect attempt ${this.reconnectAttempts}`);
        this.initWebSocket();
      }, this.reconnectInterval * this.reconnectAttempts);
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event: string, callback: (...args: unknown[]) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 이벤트 발생
   */
  private emit(event: string, data: unknown) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * WebSocket 연결 해제
   */
  disconnectWebSocket() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.eventListeners.clear();
  }

  /**
   * 시스템 상태 조회 (향상된 버전)
   */
  async getSystemStatus() {
    return this.apiCall('/status');
  }

  /**
   * 실시간 메트릭 조회
   */
  async getRealtimeMetrics() {
    return this.apiCall('/realtime-metrics');
  }

  /**
   * 시스템 메트릭 조회
   */
  async getMetrics(period: string = '7d') {
    return this.apiCall(`/metrics?period=${period}`);
  }

  /**
   * 주요 키워드 조회
   */
  async getKeywords(period: string = '7d') {
    return this.apiCall(`/keywords?period=${period}`);
  }

  /**
   * 자주 사용된 청크 조회
   */
  async getChunks(period: string = '7d') {
    return this.apiCall(`/chunks?period=${period}`);
  }

  /**
   * 접속 국가 통계 조회
   */
  async getCountries(period: string = '7d') {
    return this.apiCall(`/countries?period=${period}`);
  }

  /**
   * 최근 채팅 로그 조회
   */
  async getRecentChats(limit: number = 20) {
    return this.apiCall(`/recent-chats?limit=${limit}`);
  }

  /**
   * 활성 세션 목록 조회
   */
  async getSessions(status: string = 'all', limit: number = 50, offset: number = 0) {
    return this.apiCall(`/sessions?status=${status}&limit=${limit}&offset=${offset}`);
  }

  /**
   * 특정 세션 상세 정보 조회
   */
  async getSessionDetails(sessionId: string) {
    return this.apiCall(`/sessions/${encodeURIComponent(sessionId)}`);
  }

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId: string) {
    return this.apiCall(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
  }

  /**
   * 문서 목록 조회 (향상된 버전)
   */
  async getDocuments() {
    return this.apiCall('/documents');
  }

  /**
   * 문서 삭제
   */
  async deleteDocument(documentId: string) {
    return this.apiCall(`/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE'
    });
  }

  /**
   * 문서 상태 업데이트
   */
  async updateDocument(documentId: string, updates: { status?: string; metadata?: Record<string, unknown> }) {
    return this.apiCall(`/documents/${encodeURIComponent(documentId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  /**
   * 특정 문서의 청크 목록 조회
   */
  async getDocumentChunks(documentName: string, page: number = 1, limit: number = 50) {
    return this.apiCall(`/documents/${encodeURIComponent(documentName)}/chunks?page=${page}&limit=${limit}`);
  }

  /**
   * 특정 청크 상세 정보 조회
   */
  async getChunkDetails(chunkId: string) {
    return this.apiCall(`/chunks/${encodeURIComponent(chunkId)}`);
  }

  /**
   * 청크 삭제
   */
  async deleteChunk(chunkId: string) {
    return this.apiCall(`/chunks/${encodeURIComponent(chunkId)}`, {
      method: 'DELETE'
    });
  }

  /**
   * 문서 재처리
   */
  async reprocessDocument(documentName: string) {
    return this.apiCall(`/documents/${encodeURIComponent(documentName)}/reprocess`, {
      method: 'POST',
    });
  }

  /**
   * 시스템 성능 분석
   */
  async getPerformanceAnalysis(query?: string) {
    const endpoint = query ? `/performance-analysis?query=${encodeURIComponent(query)}` : '/performance-analysis';
    return this.apiCall(endpoint);
  }

  /**
   * 시스템 구성 조회
   */
  async getSystemConfig() {
    return this.apiCall('/config');
  }

  /**
   * RAG 시스템 테스트 (향상된 버전)
   */
  async testRAG(query: string) {
    return this.apiCall('/test', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  /**
   * 전체 인덱스 재구축
   */
  async rebuildIndex() {
    return this.apiCall('/system/rebuild-index', {
      method: 'POST',
    });
  }

  /**
   * 로그 다운로드
   */
  async downloadLogs(startDate?: string, endDate?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `${API_BASE_URL}/admin/system/download-logs?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.blob();
  }

  /**
   * 알림 이메일 발송
   */
  async sendAlertEmail(email: string, subject: string, message: string) {
    return this.apiCall('/alerts/email', {
      method: 'POST',
      body: JSON.stringify({ email, subject, message }),
    });
  }

  /**
   * 특정 기간의 상세 분석 데이터 조회
   */
  async getDetailedAnalytics(startDate: string, endDate: string) {
    return this.apiCall(`/analytics?startDate=${startDate}&endDate=${endDate}`);
  }




  /**
   * 시스템 설정 업데이트
   */
  async updateSystemConfig(config: Record<string, unknown>) {
    return this.apiCall('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  /**
   * 시스템 캐시 초기화 (메트릭 리셋)
   */
  async clearCache() {
    // 실제 구현에서는 메트릭 리셋 API를 호출
    return this.apiCall('/system/reset-metrics', {
      method: 'POST',
    });
  }

  /**
   * 백업 생성
   */
  async createBackup() {
    return this.apiCall('/system/backup', {
      method: 'POST',
    });
  }

  /**
   * 백업 복원
   */
  async restoreBackup(backupId: string) {
    return this.apiCall(`/system/restore/${backupId}`, {
      method: 'POST',
    });
  }

  /**
   * 에러 로그 조회
   */
  async getErrorLogs(limit: number = 50) {
    return this.apiCall(`/logs/errors?limit=${limit}`);
  }

  /**
   * 성능 메트릭 조회
   */
  async getPerformanceMetrics(period: string = '1d') {
    return this.apiCall(`/metrics/performance?period=${period}`);
  }

  /**
   * 사용량 통계 조회
   */
  async getUsageStats(period: string = '7d') {
    return this.apiCall(`/stats/usage?period=${period}`);
  }

  /**
   * A/B 테스트 결과 조회
   */
  async getABTestResults() {
    return this.apiCall('/analytics/ab-test');
  }

  /**
   * 실시간 모니터링 데이터 조회 (향상된 버전)
   */
  async getRealTimeMetrics() {
    return this.apiCall('/realtime-metrics');
  }

  /**
   * 사용자 피드백 조회
   */
  async getUserFeedback(limit: number = 100) {
    return this.apiCall(`/feedback?limit=${limit}`);
  }

  /**
   * 검색 품질 분석
   */
  async getSearchQualityAnalysis(period: string = '7d') {
    return this.apiCall(`/analytics/search-quality?period=${period}`);
  }

  /**
   * 모델 성능 비교
   */
  async getModelPerformanceComparison() {
    return this.apiCall('/analytics/model-performance');
  }

  /**
   * 비용 분석
   */
  async getCostAnalysis(period: string = '30d') {
    return this.apiCall(`/analytics/costs?period=${period}`);
  }

  /**
   * 보안 감사 로그 조회
   */
  async getSecurityAuditLogs(limit: number = 100) {
    return this.apiCall(`/security/audit-logs?limit=${limit}`);
  }

  /**
   * 데이터 무결성 검사
   */
  async checkDataIntegrity() {
    return this.apiCall('/system/integrity-check', {
      method: 'POST',
    });
  }

  /**
   * 자동 확장 설정 조회
   */
  async getAutoScalingConfig() {
    return this.apiCall('/config/auto-scaling');
  }

  /**
   * 자동 확장 설정 업데이트
   */
  async updateAutoScalingConfig(config: Record<string, unknown>) {
    return this.apiCall('/config/auto-scaling', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  /**
   * 헬스 체크 (간단한 ping)
   */
  async ping() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 배치 작업 상태 조회
   */
  async getBatchJobStatus() {
    return this.apiCall('/system/batch-jobs');
  }

  /**
   * 배치 작업 시작
   */
  async startBatchJob(jobType: string, parameters: Record<string, unknown> = {}) {
    return this.apiCall('/system/batch-jobs', {
      method: 'POST',
      body: JSON.stringify({ jobType, parameters }),
    });
  }

  /**
   * 배치 작업 취소
   */
  async cancelBatchJob(jobId: string) {
    return this.apiCall(`/system/batch-jobs/${jobId}/cancel`, {
      method: 'POST',
    });
  }
}

// 싱글톤 인스턴스 생성
export const adminService = new AdminService();

// 타입 정의 export
export interface SystemStatus {
  timestamp: string;
  services: {
    qdrant: { status: string; message: string; responseTime?: string };
    dynamodb: { status: string; message: string; responseTime?: string };
    llm: { status: string; message: string; responseTime?: string };
  };
}

export interface Metrics {
  period: string;
  totalSessions: number;
  totalQueries: number;
  avgResponseTime: number;
  timeSeries: Array<{
    date: string;
    sessions: number;
    queries: number;
    avgResponseTime: number;
  }>;
}

export interface ChatLog {
  id: string;
  chatId: string;
  message: string;
  timestamp: string;
  responseTime: number;
  source: string;
  status: string;
  keywords: string[];
  country: string;
}

export interface Document {
  name: string;
  chunkCount: number;
  size: string;
  lastUpdate: string;
}
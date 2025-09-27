import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  Divider,
  Button,
  Card,
  CardContent,
  Tab,
  Tabs,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Send,
  Person,
  ExpandMore,
  Source,
  Refresh,
  Info,
  History,
  Code,
  ExpandLess,
  Visibility,
  VisibilityOff,
  Settings,
  BugReport,
  BarChart,
  Close,
} from '@mui/icons-material';
import {
  ChatMessage,
  ToastMessage,
  Source as SourceType,
  SessionInfo,
  ChatHistoryEntry,
  SourceAdditionalMetadata,
} from '../types';
import { chatAPI } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';

// 귀여운 챗봇 아이콘 SVG 컴포넌트
const CuteChatbotIcon = ({ fontSize = '24px', color = '#742DDD' }: { fontSize?: string; color?: string }) => (
  <svg 
    width={fontSize} 
    height={fontSize} 
    viewBox="0 0 48 48" 
    fill="none" 
    style={{ display: 'inline-block' }}
  >
    {/* 머리 */}
    <circle cx="24" cy="22" r="16" fill={color} opacity="0.9"/>
    {/* 얼굴 */}
    <circle cx="24" cy="22" r="13" fill="#FFFFFF"/>
    {/* 귀 (안테나) */}
    <circle cx="16" cy="12" r="2" fill={color}/>
    <circle cx="32" cy="12" r="2" fill={color}/>
    <line x1="16" y1="12" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="32" y1="12" x2="32" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    {/* 눈 */}
    <circle cx="19" cy="20" r="2" fill="#333"/>
    <circle cx="29" cy="20" r="2" fill="#333"/>
    {/* 눈 반짝임 */}
    <circle cx="19.5" cy="19.5" r="0.5" fill="#FFF"/>
    <circle cx="29.5" cy="19.5" r="0.5" fill="#FFF"/>
    {/* 입 */}
    <path d="M20 26 Q24 29 28 26" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    {/* 볼 */}
    <circle cx="14" cy="24" r="1.5" fill="#FFB3BA" opacity="0.6"/>
    <circle cx="34" cy="24" r="1.5" fill="#FFB3BA" opacity="0.6"/>
    {/* 몸체 */}
    <rect x="18" y="35" width="12" height="8" rx="2" fill={color} opacity="0.8"/>
    {/* 팔 */}
    <circle cx="12" cy="38" r="2" fill={color} opacity="0.7"/>
    <circle cx="36" cy="38" r="2" fill={color} opacity="0.7"/>
  </svg>
);

// HTML 콘텐츠 파싱 유틸리티 함수
const parseHtmlContent = (text: string): string => {
  if (!text) return text;

  // HTML 콘텐츠인지 확인
  const hasHtmlTags = /<[^>]+>/.test(text);
  if (!hasHtmlTags) return text;

  let parsedText = text;

  // 1. 인라인 스타일 제거 (가독성 향상)
  parsedText = parsedText.replace(/style=['"][^'"]*['"]/g, '');

  // 2. data 속성 제거
  parsedText = parsedText.replace(/data-[^=]*=['"][^'"]*['"]/g, '');

  // 3. id 속성 제거
  parsedText = parsedText.replace(/id=['"][^'"]*['"]/g, '');

  // 4. HTML 태그를 텍스트로 변환
  parsedText = parsedText
    // 테이블 관련 태그
    .replace(/<table[^>]*>/g, '\n테이블 시작\n')
    .replace(/<\/table>/g, '\n테이블 끝\n')
    .replace(/<thead[^>]*>/g, '')
    .replace(/<\/thead>/g, '')
    .replace(/<tbody[^>]*>/g, '')
    .replace(/<\/tbody>/g, '')
    .replace(/<tr[^>]*>/g, '\n')
    .replace(/<\/tr>/g, '')
    .replace(/<td[^>]*>/g, ' | ')
    .replace(/<\/td>/g, '')
    .replace(/<th[^>]*>/g, ' | ')
    .replace(/<\/th>/g, '')

    // 문단 및 텍스트 구조 태그
    .replace(/<p[^>]*>/g, '\n\n')
    .replace(/<\/p>/g, '')
    .replace(/<div[^>]*>/g, '\n')
    .replace(/<\/div>/g, '')
    .replace(/<span[^>]*>/g, '')
    .replace(/<\/span>/g, '')
    .replace(/<h[1-6][^>]*>/g, '\n\n📋 ')
    .replace(/<\/h[1-6]>/g, '\n')

    // 줄바꿈 및 서식 태그
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<hr\s*\/?>/g, '\n────────────────────\n')

    // 리스트 태그
    .replace(/<ul[^>]*>/g, '\n')
    .replace(/<\/ul>/g, '\n')
    .replace(/<ol[^>]*>/g, '\n')
    .replace(/<\/ol>/g, '\n')
    .replace(/<li[^>]*>/g, '• ')
    .replace(/<\/li>/g, '\n')

    // 강조 태그
    .replace(/<strong[^>]*>/g, '**')
    .replace(/<\/strong>/g, '**')
    .replace(/<b[^>]*>/g, '**')
    .replace(/<\/b>/g, '**')
    .replace(/<em[^>]*>/g, '*')
    .replace(/<\/em>/g, '*')
    .replace(/<i[^>]*>/g, '*')
    .replace(/<\/i>/g, '*')

    // 기타 남은 HTML 태그 제거
    .replace(/<[^>]+>/g, '');

  // 5. 텍스트 정리
  parsedText = parsedText
    // 연속된 줄바꿈 정리 (3개 이상 → 2개)
    .replace(/\n{3,}/g, '\n\n')
    // 줄 시작/끝의 공백 정리
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    // 파이프 기호 정리 (테이블용)
    .replace(/^\s*\|\s*/gm, '')
    .replace(/\s*\|\s*$/gm, '')
    // 연속된 공백을 단일 공백으로
    .replace(/[ \t]{2,}/g, ' ')
    // 전체 텍스트 앞뒤 공백 제거
    .trim();

  return parsedText;
};


const formatSourcePreview = (text?: string, limit = 220) => {
  if (!text) {
    return '미리보기를 제공하지 않는 문서입니다.';
  }

  // HTML 콘텐츠 파싱 (개선된 파싱 사용)
  const processedText = parseHtmlContent(text);

  // 미리보기용 텍스트 처리
  const previewText = processedText
    // 테이블 시작/끝 표시를 더 간결하게
    .replace(/테이블 시작/g, '📊')
    .replace(/테이블 끝/g, '')
    // 연속된 줄바꿈을 공백으로 변경 (미리보기에서는 간결하게)
    .replace(/\n+/g, ' ')
    // 연속된 공백 정리
    .replace(/\s+/g, ' ')
    .trim();

  return previewText.length > limit ? `${previewText.slice(0, limit)}…` : previewText;
};

// 전체 콘텐츠 포맷팅 함수
const formatFullContent = (text?: string) => {
  if (!text) {
    return '내용을 불러올 수 없습니다.';
  }

  // HTML 콘텐츠 파싱 (개선된 파싱 사용)
  const processedText = parseHtmlContent(text);

  // 전체 콘텐츠용 추가 정리
  return processedText
    // 테이블 표시를 더 명확하게
    .replace(/테이블 시작/g, '\n📊 테이블\n' + '─'.repeat(40))
    .replace(/테이블 끝/g, '─'.repeat(40) + '\n')
    // 최종 줄바꿈과 공백 정리
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const formatModelConfigValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatModelConfigValue(item)).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const pickFirstString = (...values: Array<string | null | undefined>): string | undefined =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0);

const mapHistoryEntryToChatMessage = (entry: ChatHistoryEntry, index: number): ChatMessage => {
  const role: 'user' | 'assistant' =
    entry.role === 'assistant' || entry.role === 'user'
      ? entry.role
      : index % 2 === 0
        ? 'user'
        : 'assistant';

  const roleSpecificCandidates = role === 'assistant'
    ? [
        entry.answer,
        entry.response,
        entry.assistant_message,
        entry.content,
        entry.message,
      ]
    : [
        entry.message,
        entry.question,
        entry.prompt,
        entry.user_message,
        entry.content,
      ];

  const content = pickFirstString(...roleSpecificCandidates, entry.response, entry.answer) || '';
  const timestamp = pickFirstString(entry.timestamp, entry.created_at, entry.updated_at) || new Date().toISOString();
  const idSource = entry.id ?? entry.timestamp ?? `${role}-${index}`;
  const id = typeof idSource === 'string' ? idSource : idSource.toString();
  const sources = Array.isArray(entry.sources) && entry.sources.length > 0 ? entry.sources : undefined;

  return {
    id,
    role,
    content,
    timestamp,
    sources,
  };
};

interface DocumentInfoItem {
  label: string;
  value: string;
}

interface ChatTabProps {
  showToast: (message: Omit<ToastMessage, 'id'>) => void;
}

interface ApiLog {
  id: string;
  timestamp: string;
  type: 'request' | 'response';
  method: string;
  endpoint: string;
  data: unknown;
  status?: number;
  duration?: number;
}

export const ChatTab: React.FC<ChatTabProps> = ({ showToast }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [leftPanelTab, setLeftPanelTab] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [isDebugExpanded, setIsDebugExpanded] = useState<boolean>(false);
  const [messageAnimations, setMessageAnimations] = useState<Set<string>>(new Set());
  // 반응형: 화면 크기에 따라 개발자 도구 초기 상태 설정
  const [showDevTools, setShowDevTools] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg 사이즈 이상에서만 기본 표시
    }
    return true;
  });
  // 모달 상태 관리
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<SourceType | null>(null);

  const documentInfoItems = useMemo<DocumentInfoItem[]>(() => {
    if (!selectedChunk) {
      return [];
    }

    const meta = (selectedChunk.additional_metadata ?? {}) as SourceAdditionalMetadata;

    const formatPrimitive = (value: unknown): string => {
      if (value === undefined || value === null) {
        return 'N/A';
      }
      if (typeof value === 'boolean') {
        return value ? '예' : '아니오';
      }
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString() : String(value);
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return 'N/A';
        }
        return value
          .map((entryValue) =>
            typeof entryValue === 'string'
              ? entryValue
              : typeof entryValue === 'number'
                ? entryValue.toLocaleString()
                : JSON.stringify(entryValue)
          )
          .join(', ');
      }
      const stringified = String(value);
      return stringified.trim().length > 0 ? stringified : 'N/A';
    };

    const formatDate = (value?: string | null): string => {
      if (!value) {
        return 'N/A';
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return date.toISOString().split('T')[0];
    };

    const similarity = typeof selectedChunk.relevance === 'number'
      ? `${(selectedChunk.relevance * 100).toFixed(2)}%`
      : undefined;

    const items: DocumentInfoItem[] = [
      { label: '문서 ID', value: formatPrimitive(selectedChunk.id) },
      { label: '문서 파일명', value: formatPrimitive(selectedChunk.document) },
      { label: '표시 제목', value: formatPrimitive(meta.display_title ?? meta.law_name) },
      { label: '법령 ID', value: formatPrimitive(meta.law_id) },
      { label: '기관', value: formatPrimitive(meta.agency) },
      { label: '소관 부서', value: formatPrimitive(meta.legal_department) },
      { label: '기관 연락처', value: formatPrimitive(meta.agency_phone) },
      { label: '공포일자', value: formatPrimitive(formatDate(meta.enacted_date)) },
      { label: '시행일자', value: formatPrimitive(formatDate(meta.effective_date)) },
      { label: '공포번호', value: formatPrimitive(meta.promulgation_number) },
      { label: '개정 유형', value: formatPrimitive(meta.revision_type) },
      { label: '우선순위', value: formatPrimitive(meta.priority_level) },
      { label: '청크 번호', value: formatPrimitive(selectedChunk.chunk !== null && selectedChunk.chunk !== undefined ? `#${selectedChunk.chunk}` : null) },
      { label: '페이지', value: formatPrimitive(selectedChunk.page) },
      { label: '유사도', value: formatPrimitive(similarity) },
      { label: '총 청크 수', value: formatPrimitive(selectedChunk.total_chunks) },
      { label: '원본 점수', value: formatPrimitive(selectedChunk.original_score) },
      { label: '재순위 방법', value: formatPrimitive(selectedChunk.rerank_method) },
      { label: '업로드 일시', value: formatPrimitive(meta.uploaded_at) },
      { label: '파일 전체 경로', value: formatPrimitive(meta.full_path ?? selectedChunk.file_path) },
    ];

    return items;
  }, [selectedChunk]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []);

  // 🔧 세션 동기화 유틸리티 함수
  const synchronizeSessionId = useCallback((newSessionId: string, context: string = '') => {
    if (newSessionId && newSessionId !== sessionId) {
      console.log(`🔄 세션 동기화 (${context}):`, {
        from: sessionId,
        to: newSessionId,
        context
      });
      
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
      
      // 동기화 알림은 중요한 경우에만 표시
      if (context.includes('불일치') || context.includes('복구')) {
        showToast({
          type: 'info',
          message: `세션이 동기화되었습니다. (${context})`,
        });
      }
      
      return true; // 동기화 발생
    }
    return false; // 동기화 불필요
  }, [sessionId, showToast]);


  // 세션 초기화 함수 - useEffect보다 먼저 정의
  const initializeSession = useCallback(async () => {
    try {
      const storedSessionId = localStorage.getItem('chatSessionId');
      if (storedSessionId) {
        console.log('🔄 저장된 세션 ID로 초기화:', storedSessionId);
        setSessionId(storedSessionId);
        
        // 기존 채팅 기록 로드
        try {
          const response = await chatAPI.getChatHistory(storedSessionId);
          
          // 📍 채팅 기록 로드 시에도 세션 ID 동기화 확인
          if (response.data.messages.length > 0) {
            const lastMessage = response.data.messages[response.data.messages.length - 1];
            const historySessionId = lastMessage.session_id;
            
            synchronizeSessionId(historySessionId, '기록 로드 시 불일치');
          }
          
          const historyMessages = Array.isArray(response.data.messages)
            ? response.data.messages.map((msg, index) => mapHistoryEntryToChatMessage(msg, index))
            : [];

          setMessages(historyMessages);
        } catch (historyError) {
          console.warn('채팅 기록을 불러올 수 없습니다:', historyError);
          // 기록을 불러올 수 없으면 세션 유효성 검증
          console.log('📝 세션 유효성 검증을 위해 새 세션 생성');
          
          const newSessionResponse = await chatAPI.startNewSession();
          const validSessionId = newSessionResponse.data.session_id;
          setSessionId(validSessionId);
          localStorage.setItem('chatSessionId', validSessionId);
          
          showToast({
            type: 'info',
            message: '새로운 세션으로 시작합니다.',
          });
        }
      } else {
        console.log('🆕 새 세션 생성');
        const response = await chatAPI.startNewSession();
        const newSessionId = response.data.session_id;
        setSessionId(newSessionId);
        localStorage.setItem('chatSessionId', newSessionId);
        
        console.log('✅ 새 세션 생성 완료:', newSessionId);
      }
    } catch (error) {
      console.error('세션 초기화 실패:', error);
      showToast({
        type: 'error',
        message: '세션 초기화에 실패했습니다.',
      });
      
      // 🔧 실패 시 fallback: 임시 세션 ID 생성
      const fallbackSessionId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆘 Fallback 세션 ID 생성:', fallbackSessionId);
      synchronizeSessionId(fallbackSessionId, '세션 초기화 실패 복구');
    }
  }, [showToast, synchronizeSessionId]);

  // 세션 초기화
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // 메시지 스크롤 및 애니메이션 (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
      // 모든 메시지에 애니메이션 적용 (초기 로드 시)
      const allMessageIds = new Set(messages.map(msg => msg.id));
      setMessageAnimations(allMessageIds);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // API 요청 로그
    const requestLog: ApiLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'request',
      method: 'POST',
      endpoint: '/api/chat',
      data: {
        message: input,
        session_id: sessionId,
      },
    };
    setApiLogs((prev) => [...prev, requestLog]);

    const startTime = Date.now();

    try {
      const response = await chatAPI.sendMessage(input, sessionId);
      
      // 🔄 세션 ID 동기화 - 백엔드 응답의 session_id로 프론트엔드 상태 업데이트
      const backendSessionId = response.data.session_id;
      synchronizeSessionId(backendSessionId, '메시지 응답 불일치 감지');
      
      // API 응답 로그
      const responseLog: ApiLog = {
        id: (Date.now() + 1).toString(),
        timestamp: new Date().toISOString(),
        type: 'response',
        method: 'POST',
        endpoint: '/api/chat',
        data: response.data,
        status: 200,
        duration: Date.now() - startTime,
      };
      setApiLogs((prev) => [...prev, responseLog]);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.answer,
        timestamp: new Date().toISOString(),
        sources: response.data.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // 세션 정보를 백엔드에서 최신 정보로 다시 가져오기
      const currentSessionId = backendSessionId || sessionId;
      try {
        const sessionInfoResponse = await chatAPI.getSessionInfo(currentSessionId);
        console.log('최신 세션 정보 조회 성공:', sessionInfoResponse.data);
        setSessionInfo(sessionInfoResponse.data);
      } catch (sessionInfoError) {
        console.warn('세션 정보 조회 실패, 기본 정보 사용:', sessionInfoError);
        // 백엔드에서 세션 정보를 가져올 수 없으면 기존 방식 사용
        const fallbackSessionInfo: SessionInfo = {
          session_id: currentSessionId,
          messageCount: messages.length + 2,
          tokensUsed: response.data.tokens_used || 0,
          processingTime: response.data.processing_time || 0,
          modelInfo: response.data.model_info || {
            provider: 'unknown',
            model: 'unknown',
            generation_time: 0,
            model_config: {}
          },
          timestamp: new Date().toISOString()
        };
        setSessionInfo(fallbackSessionInfo);
      }
    } catch (error: unknown) {
      console.error('메시지 전송 오류:', error);
      const apiError = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
      
      // API 에러 로그
      const errorLog: ApiLog = {
        id: (Date.now() + 2).toString(),
        timestamp: new Date().toISOString(),
        type: 'response',
        method: 'POST',
        endpoint: '/api/chat',
        data: apiError?.response?.data || { error: apiError?.message || 'Unknown error' },
        status: apiError?.response?.status || 0,
        duration: Date.now() - startTime,
      };
      setApiLogs((prev) => [...prev, errorLog]);
      
      const errorMessage = apiError?.response?.data?.message || '메시지 전송에 실패했습니다.';
      
      showToast({
        type: 'error',
        message: errorMessage,
      });
      
      // 에러 메시지 추가
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewSession = async () => {
    try {
      console.log('🆕 새 세션 시작 요청');
      const response = await chatAPI.startNewSession();
      const newSessionId = response.data.session_id;
      
      // 🔄 새 세션 생성 시 상태 및 저장소 완전 동기화
      console.log('✅ 새 세션 ID 생성:', newSessionId);
      synchronizeSessionId(newSessionId, '새 세션 생성');
      setMessages([]);
      
      // 세션 정보도 초기화
      setSessionInfo(null);
      
      showToast({
        type: 'success',
        message: '새로운 대화를 시작합니다.',
      });
      
      console.log('🎯 새 세션 초기화 완료:', {
        sessionId: newSessionId,
        messagesCleared: true,
        localStorageUpdated: true
      });
    } catch (error) {
      console.error('새 세션 시작 실패:', error);
      showToast({
        type: 'error',
        message: '새 세션 시작에 실패했습니다.',
      });
      
      // 🔧 실패 시 fallback 세션 생성
      const fallbackSessionId = `new-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆘 새 세션 Fallback ID 생성:', fallbackSessionId);
      synchronizeSessionId(fallbackSessionId, '새 세션 생성 실패 복구');
      setMessages([]);
      setSessionInfo(null);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 청크 클릭 핸들러
  const handleChunkClick = (source: SourceType) => {
    setSelectedChunk(source);
    setModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChunk(null);
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const modelConfigEntries = sessionInfo?.modelInfo?.model_config
    ? Object.entries(sessionInfo.modelInfo.model_config).filter(([, value]) => value !== undefined && value !== null)
    : [];

  return (
    <Box sx={{ 
      height: '80vh', // 전체 높이를 70vh에서 80vh로 증가 
      display: 'flex',
      bgcolor: '#F2F2F7', // iOS background secondary
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif'
    }}>
      {/* 왼쪽 사이드바: 개발자 도구 패널 */}
      {showDevTools && (
        <Box sx={{
          width: '320px',
          minWidth: '320px',
          height: '100%',
          bgcolor: 'white',
          borderRight: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)'
        }}>
          {/* 헤더 */}
          <Box sx={{ 
            p: 2.5, 
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            background: 'linear-gradient(to bottom, #fafafa, #fff)'
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center">
                <Settings sx={{ mr: 1.5, fontSize: '20px', color: '#007AFF' }} /> {/* iOS icon medium, iOS blue */}
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: '17px', // iOS headline
                    letterSpacing: '-0.011em',
                    color: '#000000' // iOS label primary
                  }}
                >개발자 도구</Typography>
              </Box>
              <IconButton 
                size="small" 
                onClick={() => setShowDevTools(false)}
                title="개발자 도구 닫기"
                sx={{
                  transition: '0.15s ease-out', // iOS transition fast
                  borderRadius: '10px', // iOS radius medium
                  '&:hover': {
                    bgcolor: 'rgba(0, 122, 255, 0.1)', // iOS blue with opacity
                    transform: 'scale(1.02)' // Subtle iOS-style scale
                  }
                }}
              >
                <VisibilityOff fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          {/* 탭 네비게이션 */}
          <Tabs 
            value={leftPanelTab} 
            onChange={(_, newValue) => setLeftPanelTab(newValue)}
            variant="fullWidth"
            sx={{ 
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.default',
              '& .MuiTab-root': { 
                minHeight: '44px', // iOS touch target
                fontSize: '15px', // iOS subheadline
                fontWeight: 400,
                transition: '0.15s ease-out', // iOS transition fast
                borderRadius: '10px', // iOS radius medium
                margin: '4px',
                color: '#3C3C43', // iOS label secondary
                '&:hover': {
                  bgcolor: 'rgba(0, 122, 255, 0.1)' // iOS blue with opacity
                },
                '&.Mui-selected': {
                  fontWeight: 600,
                  color: '#007AFF', // iOS blue
                  bgcolor: '#FFFFFF' // iOS background primary
                }
              }
            }}
          >
            <Tab icon={<Info sx={{ fontSize: '1rem' }} />} label="세션 정보" iconPosition="start" />
            <Tab icon={<History sx={{ fontSize: '1rem' }} />} label="API 로그" iconPosition="start" />
          </Tabs>
          
          {/* 스크롤 컨텐츠 영역 */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
            {leftPanelTab === 0 ? (
              /* 세션 정보 탭 */
              <Box sx={{ p: 2 }}>
                {/* 현재 세션 카드 */}
                <Card variant="outlined" sx={{ 
                  mb: 2, 
                  borderRadius: '8px', 
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: 2,
                    transform: 'translateY(-1px)'
                  }
                }}>
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <Code sx={{ mr: 1, fontSize: '1.1rem', color: 'primary.main' }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        현재 세션
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontFamily: 'JetBrains Mono, monospace', 
                      bgcolor: 'rgba(0,0,0,0.04)', 
                      p: 1.5, 
                      borderRadius: 1.5,
                      fontSize: '0.85rem',
                      letterSpacing: '0.05em'
                    }}>
                      {sessionId || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
                
                {sessionInfo && (
                  <>
                    {/* 통계 정보 카드 */}
                    <Card variant="outlined" sx={{ 
                      mb: 2,
                      borderRadius: 2,
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 8px rgba(0,0,0,0.08)'
                      }
                    }}>
                      <CardContent sx={{ pb: '16px !important' }}>
                        <Box display="flex" alignItems="center" mb={1.5}>
                          <BarChart sx={{ mr: 1, fontSize: '1.1rem', color: 'success.main' }} />
                          <Typography variant="subtitle2" fontWeight={600}>
                            세션 통계
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'grid', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              메시지
                            </Typography>
                            <Chip label={sessionInfo.messageCount} size="small" sx={{ height: 20, fontWeight: 600 }} />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              토큰
                            </Typography>
                            <Chip label={sessionInfo.tokensUsed} size="small" color="primary" sx={{ height: 20, fontWeight: 600 }} />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              처리시간
                            </Typography>
                            <Chip label={`${sessionInfo.processingTime?.toFixed(2)}s`} size="small" color="success" sx={{ height: 20, fontWeight: 600 }} />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>

                    {sessionInfo?.modelInfo && (
                      <>
                        {/* LLM 모델 정보 카드 */}
                        <Card variant="outlined" sx={{ mb: 2 }}>
                          <CardContent sx={{ pb: '16px !important' }}>
                            <Box display="flex" alignItems="center" mb={1}>
                              <CuteChatbotIcon fontSize="16px" color="#ff6b6b" />
                              <Typography variant="subtitle2" fontWeight={600}>
                                LLM 모델 정보
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'grid', gap: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                LLM 프로바이더: <strong>{sessionInfo.modelInfo.provider || 'N/A'}</strong>
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                모델: <strong>{sessionInfo.modelInfo.model || 'N/A'}</strong>
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                생성시간: <strong>{sessionInfo.modelInfo.generation_time ? `${sessionInfo.modelInfo.generation_time.toFixed(3)}s` : 'N/A'}</strong>
                              </Typography>
                          
                          {modelConfigEntries.length > 0 && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 600 }}>
                                📊 모델 파라미터
                              </Typography>
                              <Box sx={{ display: 'grid', gap: 0.25 }}>
                                {modelConfigEntries.map(([key, value]) => (
                                  <Typography key={key} variant="caption" color="text.secondary">
                                    {`${key}: `}
                                    <strong>{formatModelConfigValue(value)}</strong>
                                  </Typography>
                                ))}
                              </Box>
                            </>
                          )}
                            </Box>
                          </CardContent>
                        </Card>
                      </>
                    )}
                    
                    {/* 디버그 정보 카드 - 접기/펼치기 기능 */}
                    {import.meta.env.DEV && sessionInfo && (
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent sx={{ pb: '16px !important' }}>
                          <Box 
                            onClick={() => setIsDebugExpanded(!isDebugExpanded)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              cursor: 'pointer',
                              p: 0.5,
                              borderRadius: 1,
                              '&:hover': { bgcolor: 'grey.50' }
                            }}
                          >
                            <BugReport sx={{ mr: 1, fontSize: '1rem', color: 'warning.main' }} />
                            <Typography variant="subtitle2" fontWeight={600} sx={{ flexGrow: 1 }}>
                              Debug 정보
                            </Typography>
                            {isDebugExpanded ? <ExpandLess /> : <ExpandMore />}
                          </Box>
                          
                          {isDebugExpanded && (
                            <Box sx={{ 
                              mt: 1,
                              bgcolor: 'grey.50', 
                              p: 1, 
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              border: '1px solid',
                              borderColor: 'grey.200'
                            }}>
                              <Typography variant="caption" component="pre" sx={{ fontSize: 'inherit' }}>
                                {JSON.stringify({
                                  sessionId: sessionInfo.session_id,
                                  messageCount: sessionInfo.messageCount,
                                  tokensUsed: sessionInfo.tokensUsed,
                                  processingTime: sessionInfo.processingTime,
                                  timestamp: sessionInfo.timestamp,
                                  modelInfo: sessionInfo.modelInfo ? {
                                    provider: sessionInfo.modelInfo.provider,
                                    model: sessionInfo.modelInfo.model,
                                    generationTime: sessionInfo.modelInfo.generation_time,
                                    parameters: sessionInfo.modelInfo.model_config,
                                  } : null,
                                }, null, 2)}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
                
                {/* 새 세션 시작 버튼 */}
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={handleNewSession}
                  size="medium"
                  sx={{ 
                    background: 'linear-gradient(135deg, #742DDD 0%, #6210CC 100%)',
                    boxShadow: '0 2px 8px rgba(116, 45, 221, 0.3)',
                    borderRadius: '8px',
                    py: 1.2,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      background: 'linear-gradient(135deg, #6210CC 0%, #491389 100%)',
                      boxShadow: '0 4px 12px rgba(116, 45, 221, 0.4)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  새 세션 시작
                </Button>
              </Box>
            ) : (
              /* API 로그 탭 */
              <Box sx={{ p: 2 }}>
                {apiLogs.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <History sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      API 호출 내역이 없습니다.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {apiLogs.slice().reverse().map((log) => (
                      <Card key={log.id} variant="outlined" sx={{ mb: 1 }}>
                      <Box
                        onClick={() => toggleLogExpansion(log.id)}
                        sx={{
                          cursor: 'pointer',
                          p: 1,
                          borderRadius: 1,
                          bgcolor: log.type === 'request' ? 'primary.50' : log.status === 200 ? 'success.50' : 'error.50',
                          '&:hover': { bgcolor: log.type === 'request' ? 'primary.100' : log.status === 200 ? 'success.100' : 'error.100' },
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight="bold">
                            {log.method} {log.endpoint}
                          </Typography>
                          <Chip
                            label={log.type === 'request' ? 'REQ' : `RES ${log.status}`}
                            size="small"
                            color={log.type === 'request' ? 'primary' : log.status === 200 ? 'success' : 'error'}
                            sx={{ height: 20 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.timestamp).toLocaleTimeString('ko-KR')}
                          {log.duration && ` (${log.duration}ms)`}
                        </Typography>
                      </Box>
                        {expandedLogs.has(log.id) && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                            <Typography variant="caption" component="pre" sx={{ overflow: 'auto', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              {JSON.stringify(log.data, null, 2)}
                            </Typography>
                          </Box>
                        )}
                        </Card>
                      ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}
      
      {/* 메인 콘텐츠 영역 - 채팅 화면 */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'stretch', 
        px: 3,
        pt: 1.5,
        pb: 1.25,
        minHeight: '78vh'
      }}>
        <Box sx={{ 
          width: '100%', 
          maxWidth: '820px', 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: 0, // 중요: 컬럼 컨테이너가 자식 스크롤 영역(메시지 리스트)이 축소될 수 있게 함
          // flex 컨테이너의 기본값(min-height: auto)은 자식의 내용 높이만큼 최소 높이가 커져서
          // 내부 스크롤 영역이 있어도 아래쪽에 여백이 남을 수 있습니다. minHeight: 0으로 무효화합니다.
          bgcolor: 'background.paper',
          borderRadius: '12px',
          boxShadow: 3,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider'
        }}>
          {/* 헤더 */}
          <Box sx={{ 
            p: 3, 
            background: 'linear-gradient(135deg, #742DDD 0%, #6210CC 100%)', // Sendbird purple gradient
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" position="relative" zIndex={1}>
              <Box display="flex" alignItems="center">
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: '14px', // iOS radius large
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  mr: 2,
                  backdropFilter: 'blur(20px) saturate(180%)' // iOS blur light
                }}>
                  <CuteChatbotIcon fontSize="24px" /> {/* iOS icon large */}
                </Box>
                <Box>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '22px', // iOS title 2
                      letterSpacing: '-0.022em',
                      lineHeight: 1.2
                    }}
                  >
                    RAG 챗봇
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      opacity: 0.9,
                      fontSize: '15px', // iOS subheadline
                      fontWeight: 400
                    }}
                  >
                    지능형 대화 시스템
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" gap={1.5} alignItems="center">
                <Chip 
                  label={`세션: ${sessionId.slice(0, 8)}...`} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                  icon={<Code />}
                />
                {!showDevTools && (
                  <IconButton 
                    size="medium" 
                    onClick={() => setShowDevTools(true)}
                    title="개발자 도구 보기"
                    sx={{ 
                      color: 'white', 
                      bgcolor: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s',
                      '&:hover': { 
                        bgcolor: 'rgba(255,255,255,0.2)',
                        transform: 'scale(1.05)'
                      } 
                    }}
                  >
                    <Visibility />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>

          {/* 채팅 메시지 영역 */}
          <Box sx={{ 
            // 핵심: 고정 min/maxHeight 제거하고 유연한 flex 항목으로 전환
            // flex: '1 1 0%' → 남은 공간을 차지하되 필요 시 축소 허용
            flex: '1 1 0%',
            // 중요: 스크롤 영역이 부모의 높이를 넘겨도 아래 여백이 생기지 않도록 최소 높이 0
            minHeight: 0,
            overflow: 'auto', 
            px: 3,
            pt: 3,
            pb: 3,
            bgcolor: 'background.default',
            position: 'relative',
            '&::-webkit-scrollbar': {
              width: '6px'
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'transparent'
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '3px',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }}>
            <List sx={{ p: 0, pb: 0 }}>
          {messages.map((message) => (
            <React.Fragment key={message.id}>
              <ListItem
                sx={{
                  flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  gap: 2,
                  alignItems: 'flex-start',
                  opacity: messageAnimations.has(message.id) ? 1 : 0,
                  transform: messageAnimations.has(message.id) ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  mb: 2
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                    color: message.role === 'user' ? 'white' : 'primary.main',
                    border: message.role === 'user' ? 'none' : 1,
                    borderColor: message.role === 'user' ? 'transparent' : 'divider',
                    boxShadow: 1,
                    width: 32,
                    height: 32,
                    fontSize: '16px'
                  }}
                >
                  {message.role === 'user' ? <Person sx={{ fontSize: '16px' }} /> : <CuteChatbotIcon fontSize="16px" />}
                </Avatar>
                <Box
                  sx={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      px: 2.5,
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #742DDD 0%, #6210CC 100%)' // Sendbird purple gradient
                        : 'background.paper',
                      color: message.role === 'user' ? 'white' : 'text.primary',
                      borderRadius: message.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      boxShadow: message.role === 'user' 
                        ? '0 2px 8px rgba(116, 45, 221, 0.3)' // Purple shadow
                        : 1,
                      border: message.role === 'user' ? 'none' : 1,
                      borderColor: message.role === 'user' ? 'transparent' : 'divider',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: message.role === 'user' 
                          ? '0 4px 12px rgba(116, 45, 221, 0.4)'
                          : 2
                      }
                    }}
                    elevation={0}
                  >
                    {message.role === 'assistant' ? (
                      <MarkdownRenderer
                        content={message.content}
                        sx={{
                          '& p': {
                            margin: 0,
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: 400,
                            lineHeight: 1.5,
                            '&:last-child': {
                              marginBottom: 0
                            }
                          },
                          '& h2, & h3': {
                            marginTop: '12px',
                            marginBottom: '8px',
                            fontSize: message.role === 'assistant' ? '15px' : '14px',
                            '&:first-child': {
                              marginTop: 0
                            }
                          },
                          '& ul, & ol': {
                            marginTop: '8px',
                            marginBottom: '8px',
                            '& li': {
                              fontSize: '14px'
                            }
                          }
                        }}
                      />
                    ) : (
                      <Typography variant="body1" sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        fontSize: '14px',
                        fontWeight: 400
                      }}>
                        {message.content}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        opacity: message.role === 'user' ? 0.8 : 0.6,
                        fontSize: '12px',
                        fontWeight: 400,
                        lineHeight: 1.4
                      }}
                    >
                      {formatTimestamp(message.timestamp)}
                    </Typography>
                  </Paper>

                  {/* 소스 표시 */}
                  {message.sources && message.sources.length > 0 && (
                    <Accordion
                      sx={{
                        mt: 1.5,
                        borderRadius: 2,
                        boxShadow: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        overflow: 'hidden',
                        '&:before': { display: 'none' },
                        '&.Mui-expanded': {
                          mt: 1.5,
                          boxShadow: 4,
                        }
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{
                          px: 2.5,
                          py: 1.5,
                          bgcolor: 'rgba(116, 45, 221, 0.06)',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '& .MuiAccordionSummary-content': {
                            alignItems: 'center',
                            gap: 1.5,
                          }
                        }}
                      > 
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Source sx={{ color: 'primary.main' }} />
                          <Typography variant="subtitle2" color="text.primary" fontWeight={600}>
                            RAG 참고 자료
                          </Typography>
                        </Box>
                        <Chip
                          label={`${message.sources.length}개 문서`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 0, py: 2, bgcolor: 'background.default' }}>
                        <Stack spacing={1.5} sx={{ px: 2.5 }}>
                          {message.sources.map((source, idx) => (
                            <Paper
                              key={`${source.document || 'source'}-${idx}`}
                              variant="outlined"
                              onClick={() => handleChunkClick(source)}
                              sx={{
                                position: 'relative',
                                borderRadius: 2,
                                px: 2,
                                py: 1.75,
                                bgcolor: 'background.paper',
                                borderColor: 'divider',
                                transition: 'all 0.25s ease',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                '&:before': {
                                  content: '""',
                                  position: 'absolute',
                                  inset: 0,
                                  borderRadius: 2,
                                  background: 'linear-gradient(135deg, rgba(116,45,221,0.12), transparent)',
                                  opacity: 0,
                                  transition: 'opacity 0.25s ease',
                                  pointerEvents: 'none'
                                },
                                '&:hover': {
                                  boxShadow: 6,
                                  transform: 'translateY(-2px)'
                                },
                                '&:hover:before': {
                                  opacity: 1
                                }
                              }}
                            >
                              <Stack spacing={1.25}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                  }}
                                >
                                  <Tooltip title={source.document || '문서명 없음'} placement="top-start">
                                    <Typography variant="subtitle2" fontWeight={600}>
                                      {source.document || '알 수 없는 문서'}
                                    </Typography>
                                  </Tooltip>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {source.chunk && (
                                      <Chip
                                        label={`청크 #${source.chunk}`}
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                    {typeof source.relevance === 'number' && (
                                      <Chip
                                        label={`유사도 ${(source.relevance * 100).toFixed(1)}%`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                      />
                                    )}
                                  </Stack>
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    lineHeight: 1.65,
                                    fontStyle: 'italic',
                                  }}
                                >
                                  "{formatSourcePreview(source.content_preview)}"
                                </Typography>
                                {source.page && (
                                  <Typography variant="caption" color="text.disabled">
                                    페이지 {source.page}
                                  </Typography>
                                )}
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Box>
              </ListItem>
            </React.Fragment>
          ))}

          {/* 로딩 인디케이터 */}
          {loading && (
            <ListItem sx={{
              animation: 'fadeIn 0.5s ease-in-out',
              '@keyframes fadeIn': {
                '0%': { opacity: 0, transform: 'translateY(10px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' }
              }
            }}>
              <Avatar sx={{ 
                bgcolor: 'background.paper',
                color: 'primary.main',
                border: 1,
                borderColor: 'divider',
                boxShadow: 1,
                width: 40,
                height: 40
              }}>
                <CuteChatbotIcon fontSize="20px" />
              </Avatar>
              <Box sx={{ 
                ml: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                bgcolor: 'background.default',
                px: 2.5,
                py: 1.5,
                borderRadius: '8px',
                border: 1,
                borderColor: 'divider'
              }}>
                <CircularProgress size={18} thickness={5} sx={{ color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary" fontWeight={400}>
                  AI가 답변을 생성하고 있습니다...
                </Typography>
              </Box>
            </ListItem>
          )}
              <div ref={messagesEndRef} />
            </List>
          </Box>

          {/* 입력 영역 */}
          <Box sx={{ 
            px: 1, 
            pt: 0.75,
            pb: 0.5,
            bgcolor: 'background.paper', 
            borderTop: 1,
            borderColor: 'divider'
          }}>
            <Box display="flex" gap={0.75} alignItems="center">
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="메시지를 입력하세요..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={loading}
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    bgcolor: 'background.default',
                    border: '1.5px solid transparent',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    '&:hover': {
                      borderColor: 'rgba(116, 45, 221, 0.2)'
                    },
                    '&.Mui-focused': {
                      bgcolor: 'background.paper',
                      borderColor: 'primary.main',
                      boxShadow: '0 0 0 3px rgba(116, 45, 221, 0.1)'
                    },
                    '& fieldset': {
                      border: 'none'
                    }
                  },
                  '& .MuiInputBase-input': {
                    px: 1.5,
                    py: 0.6,
                    fontWeight: 400
                  }
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="small"
                sx={{ 
                  background: !input.trim() || loading 
                    ? '#C7C7C7' 
                    : 'linear-gradient(135deg, #742DDD 0%, #6210CC 100%)',
                  color: 'white',
                  boxShadow: !input.trim() || loading 
                    ? 'none' 
                    : '0 2px 8px rgba(116, 45, 221, 0.3)',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    background: !input.trim() || loading 
                      ? '#C7C7C7' 
                      : 'linear-gradient(135deg, #6210CC 0%, #491389 100%)',
                    boxShadow: !input.trim() || loading 
                      ? 'none' 
                      : '0 4px 12px rgba(116, 45, 221, 0.4)',
                    transform: !input.trim() || loading ? 'none' : 'translateY(-1px)'
                  },
                  '&:active': {
                    transform: 'translateY(0)'
                  },
                  '&:disabled': { 
                    background: '#C7C7C7',
                    boxShadow: 'none'
                  }
                }}
              >
                <Send sx={{ fontSize: '20px' }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 청크 상세 내용 모달 */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'primary.main',
            color: 'white',
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Source />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              RAG 참고 자료 상세
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseModal}
            size="small"
            sx={{
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedChunk && (
            <Box>
              {/* 문서 정보 */}
              <Box sx={{ mb: 3 }}>
                {documentInfoItems.length > 0 ? (
                  <Accordion defaultExpanded disableGutters sx={{
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    '&:before': { display: 'none' },
                    '& .MuiAccordionSummary-root': {
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'grey.200',
                    },
                    '& .MuiAccordionDetails-root': {
                      px: 2,
                      py: 1.5,
                    },
                  }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        📄 문서 정보
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                          gap: 1.5,
                        }}
                      >
                        {documentInfoItems.map((item, index) => (
                          <Box
                            key={`document-info-${index}`}
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'grey.50',
                              border: '1px solid',
                              borderColor: 'grey.200',
                              minHeight: 52,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontWeight: 700,
                                letterSpacing: '0.03em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {item.label}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.primary"
                              sx={{
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {item.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    문서 정보를 불러올 수 없습니다.
                  </Typography>
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* 청크 내용 */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  📝 청크 내용
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    bgcolor: 'background.default',
                    borderRadius: 2,
                    maxHeight: '500px',
                    overflow: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      bgcolor: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      bgcolor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '4px',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.3)',
                      },
                    },
                  }}
                >
                  {/* HTML 테이블인 경우 특별 처리 */}
                  {(selectedChunk.content_preview || '').includes('<table') ||
                   (selectedChunk.content_preview || '').includes('<td>') ? (
                    <Box
                      sx={{
                        '& table': {
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '0.875rem',
                        },
                        '& td, & th': {
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px',
                          textAlign: 'left',
                        },
                        '& th': {
                          backgroundColor: '#f5f5f5',
                          fontWeight: 600,
                        },
                        '& tr:nth-of-type(even)': {
                          backgroundColor: '#fafafa',
                        },
                        '& tr:hover': {
                          backgroundColor: '#f0f0f0',
                        },
                      }}
                    >
                      <Typography
                        variant="body1"
                        component="div"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.8,
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                        }}
                      >
                        {formatFullContent(selectedChunk.content_preview)}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.8,
                        fontFamily: '"-apple-system", BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontSize: '0.95rem',
                      }}
                    >
                      {formatFullContent(selectedChunk.content_preview)}
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleCloseModal}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

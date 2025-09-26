import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';

interface MarkdownRendererProps {
  content: string;
  sx?: object;
}

// 마크다운 파싱 인터페이스
interface MarkdownElement {
  type: 'heading' | 'list' | 'paragraph' | 'bold' | 'text' | 'divider' | 'numbered_list';
  level?: number; // 헤딩 레벨 (1-6)
  content?: string;
  children?: MarkdownElement[];
  listType?: 'bullet' | 'numbered'; // 리스트 타입
}

// 마크다운 텍스트를 파싱하는 함수
const parseMarkdown = (text: string): MarkdownElement[] => {
  const lines = text.split('\n');
  const elements: MarkdownElement[] = [];
  let currentListItems: { content: string; type: 'bullet' | 'numbered' }[] = [];
  let currentListType: 'bullet' | 'numbered' | null = null;

  const flushList = () => {
    if (currentListItems.length > 0 && currentListType) {
      elements.push({
        type: 'list',
        listType: currentListType,
        children: currentListItems.map(item => ({
          type: 'text',
          content: item.content
        }))
      });
      currentListItems = [];
      currentListType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 빈 줄 건너뛰기
    if (line === '') {
      flushList();
      continue;
    }

    // 헤딩 처리 (## 또는 ###)
    if (line.startsWith('###')) {
      flushList();
      elements.push({
        type: 'heading',
        level: 3,
        content: line.replace(/^###\s*/, '')
      });
    } else if (line.startsWith('##')) {
      flushList();
      elements.push({
        type: 'heading',
        level: 2,
        content: line.replace(/^##\s*/, '')
      });
    }
    // 번호가 있는 리스트 처리 (1. 2. 3. 등)
    else if (/^\d+\.\s/.test(line)) {
      const listContent = line.replace(/^\d+\.\s*/, '');

      // 리스트 타입이 바뀌면 이전 리스트 플러시
      if (currentListType !== 'numbered') {
        flushList();
        currentListType = 'numbered';
      }

      currentListItems.push({ content: listContent, type: 'numbered' });
    }
    // 불릿 리스트 처리 (- 또는 *)
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const listContent = line.replace(/^[-*]\s*/, '');

      // 리스트 타입이 바뀌면 이전 리스트 플러시
      if (currentListType !== 'bullet') {
        flushList();
        currentListType = 'bullet';
      }

      currentListItems.push({ content: listContent, type: 'bullet' });
    }
    // 일반 텍스트 또는 볼드 텍스트가 포함된 문단
    else {
      flushList();
      elements.push({
        type: 'paragraph',
        content: line
      });
    }
  }

  // 마지막에 남은 리스트 아이템 처리
  flushList();

  return elements;
};

// 볼드 텍스트와 일반 텍스트를 분리하여 렌더링하는 함수
const renderTextWithBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <Typography
          key={index}
          component="span"
          sx={{
            fontWeight: 700,
            color: '#1976d2', // Material-UI 기본 primary 색상
          }}
        >
          {boldText}
        </Typography>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// 마크다운 요소를 React 컴포넌트로 렌더링
const renderElement = (element: MarkdownElement, index: number): React.ReactNode => {
  switch (element.type) {
    case 'heading':
      const HeadingTag = element.level === 2 ? 'h2' : 'h3';
      return (
        <Box key={index} sx={{ mb: 2 }}>
          <Typography
            variant={element.level === 2 ? 'h5' : 'h6'}
            component={HeadingTag}
            sx={{
              fontWeight: 700,
              color: '#1976d2', // Primary color
              mb: 1,
              borderLeft: element.level === 2 ? '4px solid #1976d2' : '3px solid #1976d2',
              pl: 1.5,
              background: element.level === 2 ? 'linear-gradient(90deg, rgba(25,118,210,0.05) 0%, transparent 100%)' : 'rgba(25,118,210,0.03)',
              py: 0.5,
              borderRadius: '0 4px 4px 0'
            }}
          >
            {element.content}
          </Typography>
        </Box>
      );

    case 'list':
      const isNumbered = element.listType === 'numbered';
      return (
        <Box key={index} sx={{ mb: 2 }}>
          <List
            dense
            sx={{
              py: 0.5,
              bgcolor: isNumbered ? 'rgba(25, 118, 210, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: 1,
              border: `1px solid ${isNumbered ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
              pl: isNumbered ? 1 : 0
            }}
          >
            {element.children?.map((child, childIndex) => (
              <ListItem
                key={childIndex}
                sx={{
                  py: 0.5,
                  alignItems: 'flex-start',
                  '&:hover': {
                    bgcolor: isNumbered ? 'rgba(25, 118, 210, 0.06)' : 'rgba(25, 118, 210, 0.04)'
                  }
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    mr: 1,
                    color: '#1976d2',
                    fontWeight: 'bold',
                    fontSize: isNumbered ? '0.9rem' : '1.1rem',
                    minWidth: isNumbered ? '20px' : 'auto'
                  }}
                >
                  {isNumbered ? `${childIndex + 1}.` : '•'}
                </Typography>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {renderTextWithBold(child.content || '')}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      );

    case 'paragraph':
      // 특별한 케이스: "**데이터 내에 명확한 정보가 존재하지 않아 추측한 답변입니다.**" 같은 주의사항
      const isWarning = element.content?.startsWith('**') && element.content?.includes('추측한 답변') && element.content?.endsWith('**');

      return (
        <Typography
          key={index}
          variant="body1"
          sx={{
            mb: 1.5,
            lineHeight: 1.7,
            ...(isWarning && {
              bgcolor: '#fff3e0', // 주황색 배경
              color: '#e65100', // 진한 주황색 텍스트
              p: 1.5,
              borderRadius: 1,
              border: '1px solid #ffb74d',
              fontStyle: 'italic'
            })
          }}
        >
          {renderTextWithBold(element.content || '')}
        </Typography>
      );

    default:
      return null;
  }
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, sx }) => {
  const elements = parseMarkdown(content);

  return (
    <Box sx={{ ...sx }}>
      {elements.map((element, index) => renderElement(element, index))}
    </Box>
  );
};

export default MarkdownRenderer;
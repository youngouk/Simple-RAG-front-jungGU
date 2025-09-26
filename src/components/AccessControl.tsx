import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { setAdminAccess } from '../utils/accessControl';

interface AccessControlProps {
  isOpen: boolean;
  onAccessGranted: () => void;
  onCancel: () => void;
  title?: string;
}

// Railway 환경변수에서 접근코드를 가져오기
// 1. Railway 런타임 설정 (최우선)
// 2. 실패 시 기본값 1127 사용
const getAccessCode = () => {
  // Railway 런타임 설정 확인
  if (typeof window !== 'undefined' && (window as any).RUNTIME_CONFIG?.ACCESS_CODE) {
    console.log('🔑 Railway 환경변수 사용:', (window as any).RUNTIME_CONFIG.ACCESS_CODE);
    return (window as any).RUNTIME_CONFIG.ACCESS_CODE;
  }

  // 개발 환경에서만 .env 파일 사용 (프로덕션에서는 무시됨)
  if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ACCESS_CODE) {
    console.log('🔧 개발 환경변수 사용');
    return import.meta.env.VITE_ACCESS_CODE;
  }

  // 기본값
  console.log('⚠️ 환경변수 없음 - 기본값 사용');
  return '1127';
};

const ACCESS_CODE = getAccessCode();

export function AccessControl({ isOpen, onAccessGranted, onCancel, title = "관리자 접근" }: AccessControlProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code === ACCESS_CODE) {
      // 세션에 접근 권한 저장
      setAdminAccess();
      onAccessGranted();
    } else {
      setError('잘못된 접근코드입니다.');
      setCode('');
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onCancel}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '12px',
              bgcolor: 'primary.light',
              mb: 1,
            }}
          >
            <LockOutlined sx={{ fontSize: 24, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            이 페이지에 접근하려면 접근코드를 입력하세요.
          </Typography>
        </Box>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="접근코드"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            type="password"
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e as React.FormEvent);
              }
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button 
            onClick={onCancel} 
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            취소
          </Button>
          <Button 
            type="submit"
            variant="contained"
            sx={{ minWidth: 100 }}
          >
            확인
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}


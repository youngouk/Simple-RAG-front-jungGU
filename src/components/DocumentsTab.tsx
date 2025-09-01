import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Chip,
  Pagination,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search,
  Delete,
  Info,
  Download,
  Refresh,
  DeleteSweep,
  CheckCircle,
  Error,
  HourglassEmpty,
} from '@mui/icons-material';
import { Document, ToastMessage } from '../types';
import { documentAPI } from '../services/api';

interface DocumentsTabProps {
  showToast: (message: Omit<ToastMessage, 'id'>) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ showToast }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // 문서 삭제 취소 핸들러
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setDocumentToDelete(null);
  }, []);

  // 벌크 삭제 취소 핸들러
  const handleBulkDeleteCancel = useCallback(() => {
    setBulkDeleteConfirmOpen(false);
  }, []);

  const pageSize = 12;

  // 문서 목록 조회
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentAPI.getDocuments({
        page,
        limit: pageSize,
        search: searchQuery,
      });
      setDocuments(response.data.documents);
      setTotalPages(Math.ceil(response.data.total / pageSize));
    } catch {
      showToast({
        type: 'error',
        message: '문서 목록을 불러오는데 실패했습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, showToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]); // fetchDocuments callback으로 의존성 관리

  // 유효한 문서 ID인지 확인하는 함수
  const isValidDocumentId = (id: string): boolean => {
    return id && !id.startsWith('temp-') && id.trim() !== '';
  };

  // 문서 선택/해제
  const toggleDocumentSelection = (id: string) => {
    // 임시 ID나 유효하지 않은 ID는 선택하지 않음
    if (!isValidDocumentId(id)) {
      showToast({
        type: 'warning',
        message: '이 문서는 선택할 수 없습니다.',
      });
      return;
    }
    
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedDocuments(newSelection);
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    const validDocuments = documents.filter(doc => isValidDocumentId(doc.id));
    const validIds = validDocuments.map(doc => doc.id);
    
    if (selectedDocuments.size === validIds.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(validIds));
    }
  };

  // 문서 상세 정보 보기
  const handleViewDetails = (document: Document) => {
    setSelectedDocument(document);
    setDetailsOpen(true);
  };

  // 문서 삭제 확인
  const handleDeleteClick = useCallback((id: string) => {
    setDocumentToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  // 문서 삭제
  const handleDeleteConfirm = useCallback(async () => {
    if (!documentToDelete) return;

    setDeleteLoading(true);
    try {
      await documentAPI.deleteDocument(documentToDelete);
      showToast({
        type: 'success',
        message: '문서가 성공적으로 삭제되었습니다.',
      });
      await fetchDocuments();
    } catch (error: unknown) {
      console.error('Document delete error:', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      showToast({
        type: 'error',
        message: apiError.response?.data?.message || '문서 삭제에 실패했습니다.',
      });
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
      setDocumentToDelete(null);
    }
  }, [documentToDelete, showToast, fetchDocuments]);

  // 일괄 삭제
  const handleBulkDelete = useCallback(async () => {
    if (selectedDocuments.size === 0) {
      setBulkDeleteConfirmOpen(false);
      return;
    }

    setBulkDeleteLoading(true);
    try {
      const documentIds = Array.from(selectedDocuments).filter(isValidDocumentId);
      console.log('Deleting documents:', documentIds);
      
      if (documentIds.length === 0) {
        showToast({
          type: 'warning',
          message: '삭제할 수 있는 유효한 문서가 없습니다.',
        });
        return;
      }
      
      await documentAPI.deleteDocuments(documentIds);
      showToast({
        type: 'success',
        message: `${selectedDocuments.size}개의 문서가 성공적으로 삭제되었습니다.`,
      });
      setSelectedDocuments(new Set());
      await fetchDocuments();
    } catch (error: unknown) {
      console.error('Bulk delete error:', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      showToast({
        type: 'error',
        message: apiError.response?.data?.message || '문서 일괄 삭제에 실패했습니다.',
      });
    } finally {
      setBulkDeleteLoading(false);
      setBulkDeleteConfirmOpen(false);
    }
  }, [selectedDocuments, showToast, fetchDocuments]);

  // 문서 다운로드
  const handleDownload = async (document: Document) => {
    try {
      const response = await documentAPI.downloadDocument(document.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = document.originalName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast({
        type: 'error',
        message: '문서 다운로드에 실패했습니다.',
      });
    }
  };

  // 상태별 아이콘 반환
  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'processing':
        return <HourglassEmpty color="warning" />;
      case 'failed':
        return <Error color="error" />;
      default:
        return null;
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* 검색 및 액션 바 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="문서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedDocuments.size === documents.length && documents.length > 0}
                    indeterminate={selectedDocuments.size > 0 && selectedDocuments.size < documents.length}
                    onChange={toggleSelectAll}
                  />
                }
                label="전체 선택"
              />
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={() => setBulkDeleteConfirmOpen(true)}
                disabled={selectedDocuments.size === 0}
              >
                선택 삭제 ({selectedDocuments.size})
              </Button>
              <IconButton onClick={fetchDocuments} color="primary">
                <Refresh />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 문서 그리드 */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {documents.map((document) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={document.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    position: 'relative',
                    ...(selectedDocuments.has(document.id) && {
                      border: '2px solid',
                      borderColor: 'primary.main',
                    }),
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <Checkbox
                      checked={selectedDocuments.has(document.id)}
                      onChange={() => toggleDocumentSelection(document.id)}
                      color="primary"
                      disabled={!isValidDocumentId(document.id)}
                    />
                  </Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      {getStatusIcon(document.status)}
                      <Typography variant="h6" noWrap>
                        {document.originalName}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      크기: {formatFileSize(document.size)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      업로드: {new Date(document.uploadedAt).toLocaleString()}
                    </Typography>
                    {document.chunks && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        청크: {document.chunks}개
                      </Typography>
                    )}
                    <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                      <Chip 
                        label={document.status} 
                        size="small" 
                        color={
                          document.status === 'completed' ? 'success' :
                          document.status === 'processing' ? 'warning' : 'error'
                        }
                      />
                      {!isValidDocumentId(document.id) && (
                        <Chip 
                          label="로딩 중" 
                          size="small" 
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => handleViewDetails(document)}>
                      <Info fontSize="small" sx={{ mr: 0.5 }} />
                      상세
                    </Button>
                    <Button size="small" onClick={() => handleDownload(document)}>
                      <Download fontSize="small" sx={{ mr: 0.5 }} />
                      다운로드
                    </Button>
                    <Button 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteClick(document.id)}
                      disabled={!isValidDocumentId(document.id)}
                    >
                      <Delete fontSize="small" sx={{ mr: 0.5 }} />
                      삭제
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* 페이지네이션 */}
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      )}

      {/* 문서 상세 정보 다이얼로그 */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>문서 상세 정보</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <List>
              <ListItem>
                <ListItemText primary="파일명" secondary={selectedDocument.originalName} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="ID" secondary={selectedDocument.id} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="크기" secondary={formatFileSize(selectedDocument.size)} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="MIME 타입" secondary={selectedDocument.mimeType} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="업로드 일시" secondary={new Date(selectedDocument.uploadedAt).toLocaleString()} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="상태" secondary={selectedDocument.status} />
              </ListItem>
              {selectedDocument.chunks && (
                <>
                  <Divider />
                  <ListItem>
                    <ListItemText primary="청크 수" secondary={`${selectedDocument.chunks}개`} />
                  </ListItem>
                </>
              )}
              {selectedDocument.metadata && (
                <>
                  {selectedDocument.metadata.pageCount && (
                    <>
                      <Divider />
                      <ListItem>
                        <ListItemText primary="페이지 수" secondary={`${selectedDocument.metadata.pageCount}페이지`} />
                      </ListItem>
                    </>
                  )}
                  {selectedDocument.metadata.wordCount && (
                    <>
                      <Divider />
                      <ListItem>
                        <ListItemText primary="단어 수" secondary={`${selectedDocument.metadata.wordCount}개`} />
                      </ListItem>
                    </>
                  )}
                </>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={!deleteLoading ? handleDeleteCancel : undefined}
        disableEscapeKeyDown={deleteLoading}
      >
        <DialogTitle>문서 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>이 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel}
            color="inherit"
            disabled={deleteLoading}
          >
            취소
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={!documentToDelete || deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : null}
          >
            {deleteLoading ? '삭제 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 일괄 삭제 확인 다이얼로그 */}
      <Dialog 
        open={bulkDeleteConfirmOpen} 
        onClose={!bulkDeleteLoading ? handleBulkDeleteCancel : undefined}
        disableEscapeKeyDown={bulkDeleteLoading}
      >
        <DialogTitle>문서 일괄 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            선택한 {selectedDocuments.size}개의 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleBulkDeleteCancel}
            color="inherit"
            disabled={bulkDeleteLoading}
          >
            취소
          </Button>
          <Button 
            onClick={handleBulkDelete} 
            color="error" 
            variant="contained"
            disabled={selectedDocuments.size === 0 || bulkDeleteLoading}
            startIcon={bulkDeleteLoading ? <CircularProgress size={16} /> : null}
          >
            {bulkDeleteLoading ? '삭제 중...' : `삭제 (${selectedDocuments.size}개)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
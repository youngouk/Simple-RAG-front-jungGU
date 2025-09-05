/**
 * 프롬프트 관리 컴포넌트
 * 시스템 프롬프트를 동적으로 관리할 수 있는 UI 제공
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  Tabs,
  Tab,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Psychology as PromptIcon,
} from '@mui/icons-material';
import promptService, { 
  Prompt, 
  CreatePromptRequest, 
  UpdatePromptRequest,
  PROMPT_CATEGORIES 
} from '../services/promptService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`prompt-tabpanel-${index}`}
      aria-labelledby={`prompt-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PromptManager: React.FC = () => {
  // State 관리
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  
  // Dialog 상태
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // 선택된 프롬프트
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<CreatePromptRequest | UpdatePromptRequest | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 필터 및 검색
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 가져오기/내보내기
  const [importData, setImportData] = useState('');
  const [importOverwrite, setImportOverwrite] = useState(false);

  // 프롬프트 목록 로드
  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await promptService.getPrompts({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        is_active: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
        page_size: 100, // 모든 프롬프트 로드
      });
      setPrompts(response.prompts);
      setError(null);
    } catch (err) {
      console.error('프롬프트 로딩 실패:', err);
      setError('프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, activeFilter]);

  // 초기 로드
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 프롬프트 저장
  const handleSavePrompt = async () => {
    if (!editingPrompt) return;

    try {
      // 클라이언트 검증
      const validationErrors = promptService.validatePrompt(editingPrompt);
      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '));
        return;
      }

      if (isEditMode && selectedPrompt) {
        // 수정
        await promptService.updatePrompt(selectedPrompt.id, editingPrompt as UpdatePromptRequest);
      } else {
        // 생성
        await promptService.createPrompt(editingPrompt as CreatePromptRequest);
      }
      
      setEditDialogOpen(false);
      setEditingPrompt(null);
      await loadPrompts();
    } catch (err: unknown) {
      console.error('프롬프트 저장 실패:', err);
      setError(err.response?.data?.detail || '프롬프트 저장에 실패했습니다.');
    }
  };

  // 프롬프트 삭제
  const handleDeletePrompt = async () => {
    if (!selectedPrompt) return;

    try {
      await promptService.deletePrompt(selectedPrompt.id);
      setDeleteDialogOpen(false);
      setSelectedPrompt(null);
      await loadPrompts();
    } catch (err: unknown) {
      console.error('프롬프트 삭제 실패:', err);
      setError(err.response?.data?.detail || '프롬프트 삭제에 실패했습니다.');
    }
  };

  // 프롬프트 복제
  const handleDuplicatePrompt = async (prompt: Prompt) => {
    try {
      const newName = `${prompt.name}_copy_${Date.now()}`;
      await promptService.duplicatePrompt(prompt.id, newName);
      await loadPrompts();
    } catch (err: unknown) {
      console.error('프롬프트 복제 실패:', err);
      setError(err.response?.data?.detail || '프롬프트 복제에 실패했습니다.');
    }
  };

  // 프롬프트 활성화/비활성화
  const handleToggleActive = async (prompt: Prompt) => {
    try {
      await promptService.togglePrompt(prompt.id, !prompt.is_active);
      await loadPrompts();
    } catch (err: unknown) {
      console.error('프롬프트 상태 변경 실패:', err);
      setError(err.response?.data?.detail || '프롬프트 상태 변경에 실패했습니다.');
    }
  };

  // 프롬프트 내보내기
  const handleExportPrompts = async () => {
    try {
      const exportData = await promptService.exportPrompts();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('프롬프트 내보내기 실패:', err);
      setError('프롬프트 내보내기에 실패했습니다.');
    }
  };

  // 프롬프트 가져오기
  const handleImportPrompts = async () => {
    try {
      const data = JSON.parse(importData);
      const result = await promptService.importPrompts(data, importOverwrite);
      setImportDialogOpen(false);
      setImportData('');
      setImportOverwrite(false);
      await loadPrompts();
      alert(`${result.imported}개의 프롬프트를 성공적으로 가져왔습니다.`);
    } catch (err: unknown) {
      console.error('프롬프트 가져오기 실패:', err);
      setError(err.response?.data?.detail || '프롬프트 가져오기에 실패했습니다.');
    }
  };

  // 새 프롬프트 생성 다이얼로그 열기
  const handleCreateNew = () => {
    setEditingPrompt({
      name: '',
      content: '',
      description: '',
      category: 'custom',
      is_active: true,
    });
    setIsEditMode(false);
    setEditDialogOpen(true);
  };

  // 프롬프트 편집 다이얼로그 열기
  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setEditingPrompt({
      name: prompt.name,
      content: prompt.content,
      description: prompt.description,
      category: prompt.category,
      is_active: prompt.is_active,
      metadata: prompt.metadata,
    });
    setIsEditMode(true);
    setEditDialogOpen(true);
  };

  // 프롬프트 보기 다이얼로그 열기
  const handleViewPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setViewDialogOpen(true);
  };

  // 프롬프트 삭제 다이얼로그 열기
  const handleDeleteClick = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setDeleteDialogOpen(true);
  };

  // 필터링된 프롬프트 목록
  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // 카테고리별 프롬프트 분류
  const promptsByCategory = {
    system: filteredPrompts.filter(p => p.category === 'system'),
    style: filteredPrompts.filter(p => p.category === 'style'),
    custom: filteredPrompts.filter(p => p.category === 'custom'),
  };

  return (
    <Box>
      {/* 헤더 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PromptIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            프롬프트 관리
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="새로고침">
            <IconButton onClick={loadPrompts} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            가져오기
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportPrompts}
          >
            내보내기
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
          >
            새 프롬프트
          </Button>
        </Box>
      </Box>

      {/* 오류 표시 */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="검색"
                placeholder="이름 또는 설명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={categoryFilter}
                  label="카테고리"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">전체</MenuItem>
                  {PROMPT_CATEGORIES.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>상태</InputLabel>
                <Select
                  value={activeFilter}
                  label="상태"
                  onChange={(e) => setActiveFilter(e.target.value)}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                총 {filteredPrompts.length}개
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label={`전체 (${filteredPrompts.length})`} />
          <Tab label={`시스템 (${promptsByCategory.system.length})`} />
          <Tab label={`스타일 (${promptsByCategory.style.length})`} />
          <Tab label={`커스텀 (${promptsByCategory.custom.length})`} />
        </Tabs>
      </Box>

      {/* 로딩 상태 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 프롬프트 목록 탭 */}
      <TabPanel value={currentTab} index={0}>
        <PromptTable 
          prompts={filteredPrompts}
          onEdit={handleEditPrompt}
          onView={handleViewPrompt}
          onDelete={handleDeleteClick}
          onDuplicate={handleDuplicatePrompt}
          onToggleActive={handleToggleActive}
        />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <PromptTable 
          prompts={promptsByCategory.system}
          onEdit={handleEditPrompt}
          onView={handleViewPrompt}
          onDelete={handleDeleteClick}
          onDuplicate={handleDuplicatePrompt}
          onToggleActive={handleToggleActive}
        />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <PromptTable 
          prompts={promptsByCategory.style}
          onEdit={handleEditPrompt}
          onView={handleViewPrompt}
          onDelete={handleDeleteClick}
          onDuplicate={handleDuplicatePrompt}
          onToggleActive={handleToggleActive}
        />
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <PromptTable 
          prompts={promptsByCategory.custom}
          onEdit={handleEditPrompt}
          onView={handleViewPrompt}
          onDelete={handleDeleteClick}
          onDuplicate={handleDuplicatePrompt}
          onToggleActive={handleToggleActive}
        />
      </TabPanel>

      {/* 편집/생성 다이얼로그 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditMode ? '프롬프트 편집' : '새 프롬프트 생성'}
        </DialogTitle>
        <DialogContent>
          {editingPrompt && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="이름"
                value={editingPrompt.name || ''}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                fullWidth
                disabled={isEditMode && selectedPrompt?.category === 'system'}
                helperText="시스템 프롬프트는 이름을 변경할 수 없습니다"
              />
              
              <TextField
                label="설명"
                value={editingPrompt.description || ''}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                fullWidth
              />
              
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={editingPrompt.category || 'custom'}
                  label="카테고리"
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, category: e.target.value as Prompt['category'] })}
                  disabled={isEditMode && selectedPrompt?.category === 'system'}
                >
                  {PROMPT_CATEGORIES.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label} - {category.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="프롬프트 내용"
                value={editingPrompt.content || ''}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                multiline
                rows={10}
                fullWidth
                placeholder="프롬프트 내용을 입력하세요..."
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editingPrompt.is_active !== false}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, is_active: e.target.checked })}
                  />
                }
                label="활성화"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} startIcon={<CancelIcon />}>
            취소
          </Button>
          <Button onClick={handleSavePrompt} variant="contained" startIcon={<SaveIcon />}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 보기 다이얼로그 */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>프롬프트 상세보기</DialogTitle>
        <DialogContent>
          {selectedPrompt && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">이름</Typography>
                <Typography>{selectedPrompt.name}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">설명</Typography>
                <Typography>{selectedPrompt.description}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">카테고리</Typography>
                <Chip label={selectedPrompt.category} size="small" />
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">상태</Typography>
                <Chip 
                  label={selectedPrompt.is_active ? '활성' : '비활성'} 
                  color={selectedPrompt.is_active ? 'success' : 'default'}
                  size="small" 
                />
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">생성일</Typography>
                <Typography>{new Date(selectedPrompt.created_at).toLocaleString()}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">수정일</Typography>
                <Typography>{new Date(selectedPrompt.updated_at).toLocaleString()}</Typography>
              </Box>
              
              <Divider />
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  프롬프트 내용
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedPrompt.content}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>닫기</Button>
          {selectedPrompt && (
            <Button 
              onClick={() => handleEditPrompt(selectedPrompt)} 
              variant="contained"
              startIcon={<EditIcon />}
            >
              편집
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>프롬프트 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            '{selectedPrompt?.name}' 프롬프트를 정말 삭제하시겠습니까?
            {selectedPrompt?.category === 'system' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                시스템 프롬프트 삭제 시 시스템이 불안정해질 수 있습니다.
              </Alert>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeletePrompt} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 가져오기 다이얼로그 */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>프롬프트 가져오기</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="info">
              JSON 형식의 프롬프트 백업 파일을 붙여넣어 주세요.
            </Alert>
            
            <TextField
              label="가져올 데이터"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              multiline
              rows={10}
              fullWidth
              placeholder='{"prompts": [...], "exported_at": "...", "total": 0}'
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={importOverwrite}
                  onChange={(e) => setImportOverwrite(e.target.checked)}
                />
              }
              label="기존 프롬프트 덮어쓰기 (같은 이름의 프롬프트가 있을 경우)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleImportPrompts} 
            variant="contained"
            disabled={!importData.trim()}
          >
            가져오기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// 프롬프트 테이블 컴포넌트
interface PromptTableProps {
  prompts: Prompt[];
  onEdit: (prompt: Prompt) => void;
  onView: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onDuplicate: (prompt: Prompt) => void;
  onToggleActive: (prompt: Prompt) => void;
}

const PromptTable: React.FC<PromptTableProps> = ({
  prompts,
  onEdit,
  onView,
  onDelete,
  onDuplicate,
  onToggleActive,
}) => {
  if (prompts.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          해당하는 프롬프트가 없습니다.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>이름</TableCell>
            <TableCell>설명</TableCell>
            <TableCell>카테고리</TableCell>
            <TableCell>상태</TableCell>
            <TableCell>수정일</TableCell>
            <TableCell>작업</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {prompts.map((prompt) => (
            <TableRow key={prompt.id}>
              <TableCell>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {prompt.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                  {prompt.description}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={PROMPT_CATEGORIES.find(c => c.value === prompt.category)?.label || prompt.category}
                  size="small"
                  color={prompt.category === 'system' ? 'primary' : prompt.category === 'style' ? 'secondary' : 'default'}
                />
              </TableCell>
              <TableCell>
                <Switch
                  checked={prompt.is_active}
                  onChange={() => onToggleActive(prompt)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {new Date(prompt.updated_at).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="보기">
                    <IconButton size="small" onClick={() => onView(prompt)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="편집">
                    <IconButton size="small" onClick={() => onEdit(prompt)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="복제">
                    <IconButton size="small" onClick={() => onDuplicate(prompt)}>
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="삭제">
                    <IconButton 
                      size="small" 
                      onClick={() => onDelete(prompt)}
                      color="error"
                      disabled={prompt.category === 'system' && prompt.name === 'system'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PromptManager;
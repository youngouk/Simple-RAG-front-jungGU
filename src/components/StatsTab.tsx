import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  WarningAmber,
  Storage,
  Hub,
  ScatterPlot,
  Memory,
} from '@mui/icons-material';
import { qdrantService } from '../services/qdrantService';
import {
  QdrantStatusResponse,
  QdrantMetricsResponse,
  QdrantResourceUsageResponse,
  QdrantHealthResponse,
  QdrantCollectionDetailResponse,
  QdrantCollectionsResponse,
  QdrantCollectionSummary,
  QdrantHealthCheck,
} from '../types';

const formatNumber = (value?: number | null, options?: Intl.NumberFormatOptions) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }
  return value.toLocaleString(undefined, options);
};

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }
  return `${value.toFixed(1)}%`;
};

const formatMbToGb = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }
  return `${(value / 1024).toFixed(1)} GB`;
};

const clampPercentage = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  return Math.min(Math.max(value, 0), 100);
};

const toDisplayStatus = (status?: string) => {
  if (!status) {
    return '-';
  }
  return status.toUpperCase();
};

const getStatusChipColor = (status?: string) => {
  const normalized = status?.toLowerCase();
  if (!normalized) {
    return 'default';
  }
  if (['healthy', 'ready', 'ok', 'online', 'active'].includes(normalized)) {
    return 'success';
  }
  if (['warning', 'degraded'].includes(normalized)) {
    return 'warning';
  }
  if (['unhealthy', 'error', 'offline', 'failed'].includes(normalized)) {
    return 'error';
  }
  return 'default';
};

interface FetchCollectionOptions {
  suppressLoading?: boolean;
}

export const StatsTab: React.FC = () => {
  const [statusData, setStatusData] = useState<QdrantStatusResponse | null>(null);
  const [metrics, setMetrics] = useState<QdrantMetricsResponse | null>(null);
  const [resourceUsage, setResourceUsage] = useState<QdrantResourceUsageResponse | null>(null);
  const [health, setHealth] = useState<QdrantHealthResponse | null>(null);
  const [collectionsOverview, setCollectionsOverview] = useState<QdrantCollectionsResponse | null>(null);
  const [collectionDetails, setCollectionDetails] = useState<QdrantCollectionDetailResponse | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveResourceUsage = useMemo(() => {
    if (resourceUsage) {
      return resourceUsage;
    }
    return statusData?.resource_usage ?? null;
  }, [resourceUsage, statusData]);

  const collectionSummaries = useMemo<QdrantCollectionSummary[]>(() => {
    const fromStatus = statusData?.collections;
    if (fromStatus) {
      if (Array.isArray(fromStatus.items)) {
        return fromStatus.items as QdrantCollectionSummary[];
      }
      if (Array.isArray(fromStatus.collections)) {
        return fromStatus.collections as QdrantCollectionSummary[];
      }
    }
    if (Array.isArray(collectionsOverview?.collections)) {
      return collectionsOverview.collections;
    }
    return [];
  }, [collectionsOverview, statusData]);

  const fetchCollectionDetails = useCallback(
    async (collectionName: string, options: FetchCollectionOptions = {}) => {
      if (!collectionName) {
        return;
      }

      setError(null);

      if (!options.suppressLoading) {
        setCollectionLoading(true);
      }

      try {
        const response = await qdrantService.getCollectionDetail(collectionName);
        setCollectionDetails(response.data);
        setSelectedCollection(collectionName);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '컬렉션 정보를 불러오는 중 오류가 발생했습니다.';
        setError(message);
      } finally {
        if (!options.suppressLoading) {
          setCollectionLoading(false);
        }
      }
    },
    [],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statusResponse, metricsResponse, collectionsResponse, resourceResponse, healthResponse] = await Promise.all([
        qdrantService.getStatus(),
        qdrantService.getMetrics(),
        qdrantService.getCollections(),
        qdrantService.getResourceUsage(),
        qdrantService.getHealth(),
      ]);

      setStatusData(statusResponse.data);
      setMetrics(metricsResponse.data);
      setCollectionsOverview(collectionsResponse.data);
      setResourceUsage(resourceResponse.data);
      setHealth(healthResponse.data);

      const detailFromStatus = statusResponse.data?.active_collection_details;
      if (detailFromStatus) {
        setCollectionDetails(detailFromStatus);
        setSelectedCollection(detailFromStatus.name ?? null);
      } else {
        const activeName =
          statusResponse.data?.collections?.active_collection ?? collectionsResponse.data?.active_collection ?? null;
        setSelectedCollection(activeName ?? null);
        if (activeName) {
          await fetchCollectionDetails(activeName, { suppressLoading: true });
        } else {
          setCollectionDetails(null);
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Qdrant 상태 정보를 불러오는 중 문제가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchCollectionDetails]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const totalCollections = statusData?.collections?.total_count ?? collectionsOverview?.total_count;
  const activeCollection = selectedCollection ?? statusData?.collections?.active_collection ?? '-';
  const totalVectors = effectiveResourceUsage?.total_vectors;
  const cpuUsage = useMemo(() => {
    if (typeof effectiveResourceUsage?.cpu_percent === 'number') {
      return effectiveResourceUsage.cpu_percent;
    }
    const raw = metrics?.resources
      ? (metrics.resources['cpu_percent'] as number | string | null | undefined)
      : undefined;
    return typeof raw === 'number' ? raw : undefined;
  }, [effectiveResourceUsage, metrics]);

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      <Paper
        sx={{
          p: 3,
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 3,
          background: 'linear-gradient(135deg, #2b6cb0 0%, #4c51bf 100%)',
          color: 'white',
        }}
        elevation={0}
      >
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Qdrant 상태 모니터링
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            백엔드 Qdrant 클러스터의 상태와 리소스 사용량을 확인합니다.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {health?.status && (
            <Chip
              icon={health.status.toLowerCase() === 'healthy' ? <CheckCircle /> : <WarningAmber />}
              label={`연결 상태: ${toDisplayStatus(health.status)}`}
              color={getStatusChipColor(health.status)}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'inherit' }}
            />
          )}
          <Tooltip title="데이터 새로고침">
            <IconButton onClick={fetchAll} disabled={loading} sx={{ color: 'white' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CheckCircle color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    현재 상태
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {toDisplayStatus(statusData?.cluster?.status ?? health?.status)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Storage color="primary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    총 컬렉션 수
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {formatNumber(totalCollections)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Hub color="info" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    활성 컬렉션
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {activeCollection || '-'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <ScatterPlot color="secondary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    총 벡터 수
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {formatNumber(totalVectors)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {effectiveResourceUsage && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
          <Typography variant="h6" gutterBottom>
            리소스 사용량
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Memory color="primary" />
                  <Typography variant="body2">메모리</Typography>
                </Stack>
                <Typography variant="h6" fontWeight={600}>
                  {formatMbToGb(effectiveResourceUsage.total_memory_mb)}
                </Typography>
                {clampPercentage(effectiveResourceUsage.memory_percent ?? effectiveResourceUsage.usage_percentage) !==
                  undefined && (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={
                        clampPercentage(
                          effectiveResourceUsage.memory_percent ?? effectiveResourceUsage.usage_percentage,
                        )
                      }
                      sx={{ borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatPercent(
                        effectiveResourceUsage.memory_percent ?? effectiveResourceUsage.usage_percentage,
                      )}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Storage color="primary" />
                  <Typography variant="body2">디스크</Typography>
                </Stack>
                <Typography variant="h6" fontWeight={600}>
                  {formatMbToGb(effectiveResourceUsage.total_disk_mb)}
                </Typography>
                {clampPercentage(effectiveResourceUsage.disk_percent) !== undefined && (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={clampPercentage(effectiveResourceUsage.disk_percent)}
                      sx={{ borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatPercent(effectiveResourceUsage.disk_percent)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircle color="success" />
                  <Typography variant="body2">CPU</Typography>
                </Stack>
                <Typography variant="h6" fontWeight={600}>
                  {formatPercent(cpuUsage)}
                </Typography>
                {clampPercentage(cpuUsage) !== undefined && (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={clampPercentage(cpuUsage)}
                      sx={{ borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatPercent(cpuUsage)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      {metrics && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
          <Typography variant="h6" gutterBottom>
            실시간 메트릭
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {['operations', 'performance', 'resources'].map((key) => {
              const data = metrics[key as keyof QdrantMetricsResponse] as Record<string, number | string | null> | undefined;
              const entries = data ? Object.entries(data) : [];
              return (
                <Grid item xs={12} md={4} key={key}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {key === 'operations' && '작업 처리량'}
                    {key === 'performance' && '성능'}
                    {key === 'resources' && '리소스'}
                  </Typography>
                  <List dense disablePadding>
                    {entries.length > 0 ? (
                      entries.map(([entryKey, value]) => (
                        <ListItem key={entryKey} disableGutters>
                          <ListItemText
                            primary={entryKey.replace(/_/g, ' ')}
                            secondary={
                              typeof value === 'number' ? value.toLocaleString() : value ?? '데이터 없음'
                            }
                          />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem disableGutters>
                        <ListItemText primary="데이터 없음" />
                      </ListItem>
                    )}
                  </List>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
            <Typography variant="h6" gutterBottom>
              컬렉션 목록
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {collectionSummaries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                등록된 컬렉션이 없습니다.
              </Typography>
            ) : (
              <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
                {collectionSummaries.map((collection) => (
                  <ListItemButton
                    key={collection.name}
                    onClick={() => fetchCollectionDetails(collection.name)}
                    selected={collection.name === selectedCollection}
                    divider
                  >
                    <ListItemText
                      primary={collection.name}
                      secondary={
                        <Stack direction="row" spacing={1} divider={<Divider orientation="vertical" flexItem />}>
                          <Typography variant="caption" color="text.secondary">
                            상태: {toDisplayStatus(collection.status)}
                          </Typography>
                          {collection.vector_count !== undefined && (
                            <Typography variant="caption" color="text.secondary">
                              벡터 {formatNumber(collection.vector_count)}
                            </Typography>
                          )}
                          {collection.size_mb !== undefined && (
                            <Typography variant="caption" color="text.secondary">
                              {`${formatNumber(collection.size_mb)} MB`}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Typography variant="h6">컬렉션 상세</Typography>
              {selectedCollection && (
                <Chip label={selectedCollection} color="primary" variant="outlined" />
              )}
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {collectionLoading && <LinearProgress sx={{ mb: 2 }} />}
            {collectionDetails ? (
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  {[
                    { label: '상태', value: toDisplayStatus(collectionDetails.status) },
                    { label: '벡터 차원', value: collectionDetails.vectors?.size },
                    { label: '거리 함수', value: collectionDetails.vectors?.distance },
                    { label: '포인트 수', value: collectionDetails.statistics?.vector_count },
                    { label: '색인된 벡터', value: collectionDetails.statistics?.indexed_vectors },
                    { label: '세그먼트 수', value: collectionDetails.statistics?.segments_count },
                  ]
                    .filter((item) => item.value !== undefined && item.value !== null && item.value !== '-')
                    .map((item) => (
                      <Grid item xs={12} sm={6} key={item.label}>
                        <Typography variant="body2" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {typeof item.value === 'number' ? formatNumber(item.value) : item.value}
                        </Typography>
                      </Grid>
                    ))}
                </Grid>
                {collectionDetails.payload_schema && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      페이로드 스키마 키
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {Object.keys(collectionDetails.payload_schema).map((key) => (
                        <Chip key={key} label={key} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}
                {collectionDetails.configuration && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      컬렉션 설정 (JSON)
                    </Typography>
                    <Box
                      sx={{
                        bgcolor: 'grey.900',
                        color: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        maxHeight: 240,
                        overflow: 'auto',
                      }}
                    >
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(collectionDetails.configuration, null, 2)}
                      </pre>
                    </Box>
                  </Box>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                상세 정보를 확인하려면 컬렉션을 선택하세요.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {statusData?.health_checks && statusData.health_checks.length > 0 && (
        <Paper sx={{ mt: 3, p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
          <Typography variant="h6" gutterBottom>
            헬스 체크 결과
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List dense>
            {statusData.health_checks.map((check: QdrantHealthCheck) => (
              <ListItem key={check.name} divider>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 160 }}>
                  <Chip
                    label={toDisplayStatus(check.status)}
                    color={getStatusChipColor(check.status)}
                    size="small"
                  />
                  <Typography variant="body2">{check.name}</Typography>
                </Stack>
                <ListItemText
                  primary={check.message ?? '정상'}
                  secondary={
                    check.latency_ms !== undefined
                      ? `응답 지연: ${formatNumber(check.latency_ms)} ms`
                      : undefined
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default StatsTab;

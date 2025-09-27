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
    // 우선순위: resourceUsage > statusData.resource_usage
    if (resourceUsage?.resource_usage) {
      return resourceUsage.resource_usage;
    }
    if (resourceUsage) {
      return resourceUsage;
    }
    return statusData?.resource_usage ?? null;
  }, [resourceUsage, statusData]);

  const collectionSummaries = useMemo<QdrantCollectionSummary[]>(() => {
    // 우선순위: statusData.collections.list > collectionsOverview.collections
    const fromStatus = statusData?.collections;
    if (fromStatus?.list && Array.isArray(fromStatus.list)) {
      // list 배열의 각 항목을 표준 형식으로 변환
      return fromStatus.list.map((col: QdrantCollectionSummary & { points_count?: number }) => ({
        name: col.name,
        status: col.status,
        is_active: col.is_active,
        vector_count: col.points_count || col.vector_count,
        size_mb: col.size_mb,
      }));
    }
    if (Array.isArray(collectionsOverview?.collections)) {
      return collectionsOverview.collections.map((col: QdrantCollectionSummary & { points_count?: number }) => ({
        name: col.name,
        status: col.status,
        is_active: col.is_active,
        vector_count: col.points_count || col.vector_count,
        size_mb: col.size_mb,
      }));
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
    // CPU 사용량을 여러 소스에서 찾기
    if (metrics?.resources?.cpu_usage_percent !== undefined) {
      return metrics.resources.cpu_usage_percent as number;
    }
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
                {(() => {
                  const memoryPercent = effectiveResourceUsage.usage_percentage?.memory ??
                                       effectiveResourceUsage.memory_percent ??
                                       (metrics?.resources?.memory_usage_percent as number | undefined);
                  return clampPercentage(memoryPercent) !== undefined ? (
                    <Box>
                      <LinearProgress
                        variant="determinate"
                        value={clampPercentage(memoryPercent)}
                        sx={{ borderRadius: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatPercent(memoryPercent)}
                      </Typography>
                    </Box>
                  ) : null;
                })()}
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
                {(() => {
                  const diskPercent = effectiveResourceUsage.usage_percentage?.disk ??
                                     effectiveResourceUsage.disk_percent;
                  return clampPercentage(diskPercent) !== undefined ? (
                    <Box>
                      <LinearProgress
                        variant="determinate"
                        value={clampPercentage(diskPercent)}
                        sx={{ borderRadius: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatPercent(diskPercent)}
                      </Typography>
                    </Box>
                  ) : null;
                })()}
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

      {(metrics?.metrics || metrics) && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
          <Typography variant="h6" gutterBottom>
            실시간 메트릭
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            {/* 작업 처리량 */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="primary.main" fontWeight={600} gutterBottom>
                  작업 처리량
                </Typography>
                {(metrics.metrics?.operations || metrics.operations) ? (
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">초당 검색</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatNumber(metrics.metrics?.operations?.searches_per_second ?? metrics.operations?.searches_per_second)}/s
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">초당 업세트</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {formatNumber(metrics.metrics?.operations?.upserts_per_second ?? metrics.operations?.upserts_per_second)}/s
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">24시간 총 작업</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {formatNumber(metrics.metrics?.operations?.total_operations_24h ?? metrics.operations?.total_operations_24h)}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">데이터 없음</Typography>
                )}
              </Card>
            </Grid>
            {/* 성능 */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="success.main" fontWeight={600} gutterBottom>
                  성능
                </Typography>
                {(metrics.metrics?.performance || metrics.performance) ? (
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">P50 지연시간</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatNumber(metrics.metrics?.performance?.p50_latency_ms ?? metrics.performance?.p50_latency_ms)} ms
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">P95 지연시간</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {formatNumber(metrics.metrics?.performance?.p95_latency_ms ?? metrics.performance?.p95_latency_ms)} ms
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">에러율</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {formatPercent(((metrics.metrics?.performance?.error_rate ?? metrics.performance?.error_rate ?? 0) as number) * 100)}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">데이터 없음</Typography>
                )}
              </Card>
            </Grid>
            {/* 리소스 */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="warning.main" fontWeight={600} gutterBottom>
                  리소스
                </Typography>
                {(metrics.metrics?.resources || metrics.resources) ? (
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">네트워크 In</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatNumber(metrics.metrics?.resources?.network_in_mbps ?? metrics.resources?.network_in_mbps)} Mbps
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">네트워크 Out</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {formatNumber(metrics.metrics?.resources?.network_out_mbps ?? metrics.resources?.network_out_mbps)} Mbps
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">디스크 I/O</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        R: {formatNumber(metrics.metrics?.resources?.disk_io_read_mbps ?? metrics.resources?.disk_io_read_mbps)} / W: {formatNumber(metrics.metrics?.resources?.disk_io_write_mbps ?? metrics.resources?.disk_io_write_mbps)} Mbps
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">데이터 없음</Typography>
                )}
              </Card>
            </Grid>
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
                  {(() => {
                    // 백엔드 응답에 따라 다양한 경로에서 데이터 추출
                    const detail = statusData?.active_collection_details || collectionDetails;
                    const items = [
                      { label: '상태', value: toDisplayStatus(detail.status) },
                      // vectors 정보에서 차원과 거리 함수 가져오기
                      { label: '벡터 차원', value: detail.vectors?.dense?.dimensions || detail.vectors?.size },
                      { label: '거리 함수', value: detail.vectors?.dense?.distance_metric || detail.vectors?.distance },
                      // storage 정보에서 포인트 수 가져오기
                      { label: '포인트 수', value: detail.storage?.points_count || detail.statistics?.vector_count },
                      { label: '세그먼트 수', value: detail.storage?.segments_count || detail.statistics?.segments_count },
                      // storage 정보 추가
                      { label: '메모리 사용량', value: detail.storage?.memory_usage_mb ? `${formatNumber(detail.storage.memory_usage_mb)} MB` : undefined },
                      { label: '디스크 사용량', value: detail.storage?.disk_usage_mb ? `${formatNumber(detail.storage.disk_usage_mb)} MB` : undefined },
                      { label: '벡터 크기', value: detail.storage?.vectors_size_mb ? `${formatNumber(detail.storage.vectors_size_mb)} MB` : undefined },
                      // performance 정보 추가
                      { label: '평균 검색 지연', value: detail.performance?.avg_search_latency_ms ? `${formatNumber(detail.performance.avg_search_latency_ms)} ms` : undefined },
                      { label: '최적화 상태', value: detail.performance?.optimization_status },
                    ];
                    return items
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
                      ));
                  })()}
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

      {(() => {
        // health_checks가 객체 형태인 경우 처리
        const healthChecks = statusData?.health_checks;
        if (!healthChecks) return null;

        // checks 객체가 있는 경우 객체를 배열로 변환
        const checksArray = healthChecks.checks
          ? Object.entries(healthChecks.checks).map(([key, value]) => ({
              name: key.replace(/_/g, ' '),
              status: value,
              message: value === 'pass' ? '정상' : value
            }))
          : Array.isArray(healthChecks) ? healthChecks : [];

        return checksArray.length > 0 ? (
          <Paper sx={{ mt: 3, p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
            <Typography variant="h6" gutterBottom>
              헬스 체크 결과
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List dense>
              {checksArray.map((check: { name?: string; status?: string; message?: string; latency_ms?: number }, index: number) => (
                <ListItem key={check.name || index} divider>
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
        ) : null;
      })()}
    </Box>
  );
};

export default StatsTab;

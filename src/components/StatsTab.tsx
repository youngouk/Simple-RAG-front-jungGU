import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  Storage,
  Speed,
  CheckCircle,
  Description,
  Memory,
  Refresh,
  AccessTime,
} from '@mui/icons-material';
import { Stats } from '../types';
import { statsAPI } from '../services/api';

export const StatsTab: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await statsAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Removed unused formatUptime function

  // Removed unused formatFileSize function

  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">시스템 통계</Typography>
        <Tooltip title="새로고침">
          <IconButton onClick={fetchStats} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {stats && (
        <Grid container spacing={3}>
          {/* 시스템 통계 */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              시스템 상태
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AccessTime color="info" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      가동시간
                    </Typography>
                    <Typography variant="h4">
                      {stats.uptime_human}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Speed color="warning" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      CPU 사용률
                    </Typography>
                    <Typography variant="h4">
                      {stats.cpu_percent.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Memory color="success" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      메모리 사용률
                    </Typography>
                    <Typography variant="h4">
                      {stats.memory_usage.percentage.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats.memory_usage.used_gb.toFixed(1)}GB / {stats.memory_usage.total_gb.toFixed(1)}GB
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Storage color="primary" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      디스크 사용률
                    </Typography>
                    <Typography variant="h4">
                      {stats.disk_usage.percentage.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats.disk_usage.used_gb.toFixed(1)}GB / {stats.disk_usage.total_gb.toFixed(1)}GB
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 시스템 세부 정보 */}
          <Grid item xs={12} sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              시스템 세부 정보
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CheckCircle color="success" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      CPU 코어 수
                    </Typography>
                    <Typography variant="h4">
                      {stats.system_info.cpu_count}개
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Description color="primary" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Python 버전
                    </Typography>
                    <Typography variant="h4">
                      {stats.system_info.python_version}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingUp color="info" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      플랫폼
                    </Typography>
                    <Typography variant="h4">
                      {stats.system_info.platform}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 추가 정보 */}
          <Grid item xs={12} sx={{ mt: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                시스템 정보
              </Typography>
              <Grid item container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      시스템 부팅 시간
                    </Typography>
                    <Typography variant="body1">
                      {new Date(stats.system_info.boot_time).toLocaleString('ko-KR')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      사용 가능한 메모리
                    </Typography>
                    <Typography variant="body1">{stats.memory_usage.available_gb.toFixed(1)}GB</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      여유 디스크 공간
                    </Typography>
                    <Typography variant="body1">{stats.disk_usage.free_gb.toFixed(1)}GB</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      전체 디스크 용량
                    </Typography>
                    <Typography variant="body1">{stats.disk_usage.total_gb.toFixed(1)}GB</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
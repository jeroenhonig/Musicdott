/**
 * Comprehensive Debug Panel for MusicDott Admin
 * Implements suggestions #1-10 from the future-proofing guide
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/lib/i18n';
import {
  Database,
  Users, 
  BookOpen, 
  Music, 
  Layers, 
  Activity,
  Clock,
  Server,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Monitor,
  Wifi
} from 'lucide-react';

interface DebugStats {
  currentUserId: number;
  storageType: 'database' | 'memory';
  connected: boolean;
  counts: {
    students: number;
    lessons: number;
    songs: number;
    categories: number;
    users: number;
  };
}

interface StorageStatus {
  storageType: 'database' | 'memory';
  connected: boolean;
  message: string;
  recommendation: string;
}

export default function DebugPanel() {
  const { t } = useTranslation();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  const [isRealTime, setIsRealTime] = useState(false);

  const { data: debugStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DebugStats>({
    queryKey: ['/api/admin/debug/stats'],
    refetchInterval: isRealTime ? 5000 : refreshInterval,
  });

  const { data: storageStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<StorageStatus>({
    queryKey: ['/api/admin/storage-status'],
    refetchInterval: isRealTime ? 3000 : refreshInterval,
  });

  const getStorageStatusColor = (status: StorageStatus | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    return status.storageType === 'database' && status.connected 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
  };

  const getStorageIcon = (status: StorageStatus | undefined) => {
    if (!status) return <Server className="w-4 h-4" />;
    return status.storageType === 'database' && status.connected 
      ? <CheckCircle className="w-4 h-4" /> 
      : <AlertCircle className="w-4 h-4" />;
  };

  const handleRefresh = () => {
    refetchStats();
    refetchStatus();
  };

  const toggleRealTime = () => {
    setIsRealTime(!isRealTime);
  };

  if (statsLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>{t('debug.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('debug.title')}</h1>
          <p className="text-muted-foreground">
            {t('debug.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isRealTime ? "default" : "outline"}
            size="sm"
            onClick={toggleRealTime}
          >
            <Wifi className="w-4 h-4 mr-2" />
            {isRealTime ? t('debug.realtimeOn') : t('debug.realtimeOff')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <Activity className="w-4 h-4 mr-2" />
            {t('debug.refresh')}
          </Button>
        </div>
      </div>

      {/* Storage Status Alert */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {getStorageIcon(storageStatus)}
            <CardTitle className="text-lg">{t('debug.storageStatus')}</CardTitle>
            <Badge className={getStorageStatusColor(storageStatus)}>
              {storageStatus?.storageType?.toUpperCase() || 'UNKNOWN'} {storageStatus?.connected ? t('debug.connected') : t('debug.fallback')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-2">{storageStatus?.message}</p>
          <p className="text-xs text-muted-foreground">{storageStatus?.recommendation}</p>
        </CardContent>
      </Card>

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{debugStats?.counts.students || 0}</p>
                <p className="text-sm text-muted-foreground">{t('debug.students')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{debugStats?.counts.lessons || 0}</p>
                <p className="text-sm text-muted-foreground">{t('debug.lessons')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{debugStats?.counts.songs || 0}</p>
                <p className="text-sm text-muted-foreground">{t('debug.songs')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{debugStats?.counts.categories || 0}</p>
                <p className="text-sm text-muted-foreground">{t('debug.categories')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{debugStats?.counts.users || 0}</p>
                <p className="text-sm text-muted-foreground">{t('debug.users')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {t('debug.storageInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">{t('debug.currentUserId')}</span>
              <Badge variant="outline">{debugStats?.currentUserId}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">{t('debug.storageType')}</span>
              <Badge className={debugStats?.storageType === 'database' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {debugStats?.storageType?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">{t('debug.connectionStatus')}</span>
              <Badge className={debugStats?.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {debugStats?.connected ? t('debug.connected') : t('debug.disconnected')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              {t('debug.performanceMetrics')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{t('debug.dataLoad')}</span>
                <span>{((debugStats?.counts.students || 0) + (debugStats?.counts.lessons || 0) + (debugStats?.counts.songs || 0))} {t('debug.items')}</span>
              </div>
              <Progress value={Math.min(((debugStats?.counts.students || 0) + (debugStats?.counts.lessons || 0) + (debugStats?.counts.songs || 0)) / 10, 100)} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{t('debug.systemHealth')}</span>
                <span>{storageStatus?.connected ? '100%' : '85%'}</span>
              </div>
              <Progress value={storageStatus?.connected ? 100 : 85} />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>• {t('debug.memoryFallback')}</p>
              <p>• {t('debug.realtimeMonitoring')} {isRealTime ? t('debug.enabled') : t('debug.disabled')}</p>
              <p>• {t('debug.refreshInterval')} {refreshInterval / 1000}s</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Development Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('debug.devStatus')}
          </CardTitle>
          <CardDescription>
            {t('debug.devStatusDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ {t('debug.completedFeatures')}</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {t('debug.feat1')}</li>
                <li>• {t('debug.feat2')}</li>
                <li>• {t('debug.feat3')}</li>
                <li>• {t('debug.feat4')}</li>
                <li>• {t('debug.feat5')}</li>
                <li>• {t('debug.feat6')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🚧 {t('debug.devNotes')}</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {t('debug.note1')}</li>
                <li>• {t('debug.note2')}</li>
                <li>• {t('debug.note3')}</li>
                <li>• {t('debug.note4')}</li>
                <li>• {t('debug.note5')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
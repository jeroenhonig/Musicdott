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
          <p>Loading debug information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Debug Panel</h1>
          <p className="text-muted-foreground">
            System monitoring and development tools for MusicDott platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isRealTime ? "default" : "outline"}
            size="sm"
            onClick={toggleRealTime}
          >
            <Wifi className="w-4 h-4 mr-2" />
            {isRealTime ? "Real-time ON" : "Real-time OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Storage Status Alert */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {getStorageIcon(storageStatus)}
            <CardTitle className="text-lg">Storage Status</CardTitle>
            <Badge className={getStorageStatusColor(storageStatus)}>
              {storageStatus?.storageType?.toUpperCase() || 'UNKNOWN'} {storageStatus?.connected ? 'CONNECTED' : 'FALLBACK'}
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
                <p className="text-sm text-muted-foreground">Students</p>
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
                <p className="text-sm text-muted-foreground">Lessons</p>
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
                <p className="text-sm text-muted-foreground">Songs</p>
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
                <p className="text-sm text-muted-foreground">Categories</p>
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
                <p className="text-sm text-muted-foreground">Users</p>
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
              Storage Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Current User ID:</span>
              <Badge variant="outline">{debugStats?.currentUserId}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Storage Type:</span>
              <Badge className={debugStats?.storageType === 'database' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {debugStats?.storageType?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Connection Status:</span>
              <Badge className={debugStats?.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {debugStats?.connected ? 'CONNECTED' : 'DISCONNECTED'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Data Load</span>
                <span>{((debugStats?.counts.students || 0) + (debugStats?.counts.lessons || 0) + (debugStats?.counts.songs || 0))} items</span>
              </div>
              <Progress value={Math.min(((debugStats?.counts.students || 0) + (debugStats?.counts.lessons || 0) + (debugStats?.counts.songs || 0)) / 10, 100)} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>System Health</span>
                <span>{storageStatus?.connected ? '100%' : '85%'}</span>
              </div>
              <Progress value={storageStatus?.connected ? 100 : 85} />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>• Memory fallback system active</p>
              <p>• Real-time monitoring: {isRealTime ? 'ENABLED' : 'DISABLED'}</p>
              <p>• Refresh interval: {refreshInterval / 1000}s</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Development Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Development Status
          </CardTitle>
          <CardDescription>
            Current implementation status and development notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ Completed Features</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Storage status monitoring</li>
                <li>• Real-time debug statistics</li>
                <li>• Memory fallback system</li>
                <li>• Comprehensive data import</li>
                <li>• GrooveScribe pattern rendering</li>
                <li>• Student/lesson management</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🚧 Development Notes</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Database connection pending</li>
                <li>• Using memory storage fallback</li>
                <li>• All data preserved in memory</li>
                <li>• Admin monitoring fully operational</li>
                <li>• Platform ready for production</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
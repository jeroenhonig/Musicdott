/**
 * Storage Status Banner Component
 * Shows database vs memory storage status to prevent data loss confusion
 * Inspired by original MusicDott teacher environment patterns
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Database, HardDrive, CheckCircle, XCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StorageStatus {
  type: 'database' | 'memory';
  connected: boolean;
  message: string;
  recommendation?: string;
  userCount?: number;
  dataStats?: {
    students: number;
    lessons: number;
    songs: number;
    categories: number;
  };
}

export default function StorageStatusBanner() {
  const { data: status, refetch } = useQuery<StorageStatus>({
    queryKey: ['/api/admin/storage-status'],
    refetchInterval: 10000, // Check every 10 seconds
  });

  if (!status) return null;

  const getStatusIcon = () => {
    if (status.type === 'database' && status.connected) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (status.type === 'memory' && !status.connected) {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    if (status.type === 'database' && status.connected) {
      return 'bg-green-50 border-green-200';
    } else if (status.type === 'memory' && !status.connected) {
      return 'bg-yellow-50 border-yellow-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  const getStatusBadge = () => {
    if (status.type === 'database' && status.connected) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <Database className="w-3 h-3 mr-1" />
          PostgreSQL Connected
        </Badge>
      );
    } else if (status.type === 'memory' && !status.connected) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <HardDrive className="w-3 h-3 mr-1" />
          Memory Storage (Fallback)
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          Storage Error
        </Badge>
      );
    }
  };

  return (
    <Alert className={`mb-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">Storage Status</h4>
              {getStatusBadge()}
            </div>
            <AlertDescription className="text-sm">
              {status.message}
              {status.recommendation && (
                <span className="block mt-1 text-xs opacity-75">
                  💡 {status.recommendation}
                </span>
              )}
            </AlertDescription>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {status.dataStats && (
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>{status.dataStats.students} students</span>
                <span>{status.dataStats.lessons} lessons</span>
                <span>{status.dataStats.songs} songs</span>
                <span>{status.dataStats.categories} categories</span>
              </div>
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="text-xs"
          >
            <Info className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Development Information */}
      {status.type === 'memory' && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">Development Mode Active</p>
              <p>All data is preserved in memory during this session. Original MusicDott data from CSV imports remains available with full GrooveScribe pattern support.</p>
            </div>
          </div>
        </div>
      )}
    </Alert>
  );
}
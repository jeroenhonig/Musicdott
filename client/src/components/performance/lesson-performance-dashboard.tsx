import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3,
  RefreshCw,
  Calendar,
  Users,
  BookOpen
} from 'lucide-react';

interface PerformanceMetrics {
  totalLessons: number;
  averageCreationTime: number;
  successRate: number;
  failureRate: number;
  recentActivity: {
    date: string;
    lessonsCreated: number;
    averageTime: number;
  }[];
  contentBlockDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  userEngagement: {
    activeUsers: number;
    lessonsPerUser: number;
    topCategories: string[];
  };
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  timestamp: string;
}

export function LessonPerformanceDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['/api/performance/lessons', refreshKey],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: realtimeStats } = useQuery({
    queryKey: ['/api/performance/realtime'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  useEffect(() => {
    // Monitor performance and generate alerts
    if (metrics) {
      const newAlerts: PerformanceAlert[] = [];
      
      if (metrics.averageCreationTime > 3000) {
        newAlerts.push({
          id: 'slow-creation',
          type: 'warning',
          title: 'Slow Lesson Creation',
          description: `Average creation time is ${(metrics.averageCreationTime / 1000).toFixed(1)}s. Consider optimizing content blocks.`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (metrics.failureRate > 5) {
        newAlerts.push({
          id: 'high-failure',
          type: 'error',
          title: 'High Failure Rate',
          description: `${metrics.failureRate}% of lesson creations are failing. Check validation rules.`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (metrics.totalLessons > 100) {
        newAlerts.push({
          id: 'milestone',
          type: 'info',
          title: 'Milestone Reached',
          description: `Congratulations! You've created ${metrics.totalLessons} lessons.`,
          timestamp: new Date().toISOString()
        });
      }
      
      setAlerts(newAlerts);
    }
  }, [metrics]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Lesson Performance Dashboard</h2>
          <Button variant="outline" disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load performance metrics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const getPerformanceStatus = (successRate: number) => {
    if (successRate >= 95) return { label: 'Excellent', color: 'bg-green-500 dark:bg-green-600' };
    if (successRate >= 85) return { label: 'Good', color: 'bg-blue-500 dark:bg-blue-600' };
    if (successRate >= 70) return { label: 'Fair', color: 'bg-yellow-500 dark:bg-yellow-600' };
    return { label: 'Poor', color: 'bg-red-500 dark:bg-red-600' };
  };

  const performanceStatus = getPerformanceStatus(metrics?.successRate || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lesson Performance Dashboard</h2>
          <p className="text-muted-foreground">Monitor and optimize your lesson creation workflow</p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              {alert.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
              {alert.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {alert.type === 'info' && <CheckCircle className="h-4 w-4" />}
              <AlertDescription>
                <strong>{alert.title}:</strong> {alert.description}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalLessons || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time lesson count
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Creation Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.averageCreationTime ? `${(metrics.averageCreationTime / 1000).toFixed(1)}s` : '0s'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per lesson creation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.successRate || 0}%</div>
            <div className="flex items-center space-x-2 mt-2">
              <Progress value={metrics?.successRate || 0} className="flex-1" />
              <Badge variant={performanceStatus.label === 'Excellent' ? 'default' : 'secondary'}>
                {performanceStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.userEngagement?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Creating lessons this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Lesson creation activity over the past 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.recentActivity?.length > 0 ? (
            <div className="space-y-4">
              {metrics.recentActivity.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">
                      {day.lessonsCreated} lessons
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {(day.averageTime / 1000).toFixed(1)}s avg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No recent activity data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Content Block Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content Block Distribution</CardTitle>
            <CardDescription>
              Most popular content block types
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.contentBlockDistribution?.length > 0 ? (
              <div className="space-y-3">
                {metrics.contentBlockDistribution.map((block, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium capitalize">
                        {block.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24">
                        <Progress value={block.percentage} />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {block.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No content block data available
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>
              Lesson creation patterns and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lessons per User</span>
                <Badge variant="outline">
                  {metrics?.userEngagement?.lessonsPerUser?.toFixed(1) || '0.0'}
                </Badge>
              </div>
              
              {metrics?.userEngagement?.topCategories?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Popular Categories</h4>
                  <div className="space-y-1">
                    {metrics.userEngagement.topCategories.slice(0, 5).map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{category}</span>
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Stats */}
      {realtimeStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Real-time Statistics
            </CardTitle>
            <CardDescription>
              Live updates from your lesson creation workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {realtimeStats.activeSessions || 0}
                </div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {realtimeStats.lessonsToday || 0}
                </div>
                <p className="text-sm text-muted-foreground">Lessons Today</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {realtimeStats.avgResponseTime || 0}ms
                </div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
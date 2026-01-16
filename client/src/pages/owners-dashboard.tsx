import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PlatformOwnerLayout from "@/components/layouts/platform-owner-layout";
import CustomerService from "@/components/customer-service";
import BillingManagement from "@/components/billing-management";
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Music, 
  BookOpen, 
  Activity,
  Search,
  Eye,
  UserCog,
  GraduationCap
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from "recharts";

interface PlatformStats {
  totalUsers: number;
  totalSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalLessons: number;
  totalSongs: number;
  totalSessions: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  newUsersThisMonth: number;
  growthRate: number;
  churnRate: number;
}

interface SchoolData {
  id: number;
  name: string;
  city: string;
  email: string;
  total_users: number;
  total_teachers: number;
  total_students: number;
  total_lessons: number;
  total_songs: number;
  subscription_status: string;
  plan_type: string;
  monthly_price: number;
  created_at: string;
}

interface UserData {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  school_name: string;
  school_id: number;
  created_at: string;
  last_login_at: string;
}

interface AuditLogEntry {
  id: number;
  actor_username: string;
  actor_name: string;
  target_type: string;
  target_id: number;
  action: string;
  metadata: any;
  created_at: string;
}

export default function OwnersDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ["/api/owners/platform-stats"],
  });

  const { data: schools } = useQuery<SchoolData[]>({
    queryKey: ["/api/owners/all-schools"],
  });

  const { data: allUsers } = useQuery<UserData[]>({
    queryKey: ["/api/owners/all-users"],
  });

  const { data: auditLog } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/platform/audit-log"],
  });

  const { data: revenueData } = useQuery<any[]>({
    queryKey: ["/api/owners/revenue-analytics"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredSchools = schools?.filter(s => 
    s.name?.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.city?.toLowerCase().includes(schoolSearch.toLowerCase())
  ) || [];

  const filteredUsers = allUsers?.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "current":
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case "trial":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Trial</Badge>;
      case "overdue":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Overdue</Badge>;
      case "suspended":
        return <Badge className="bg-red-500 hover:bg-red-600">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "platform_owner":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Platform Owner</Badge>;
      case "school_owner":
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">School Owner</Badge>;
      case "teacher":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Teacher</Badge>;
      case "student":
        return <Badge className="bg-green-500 hover:bg-green-600">Student</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Total Schools</CardTitle>
                  <Building2 className="h-4 w-4 text-indigo-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalSchools || 0}</div>
                  <p className="text-xs text-slate-400">{stats?.activeSubscriptions || 0} active subscriptions</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-slate-400">{stats?.totalTeachers || 0} teachers, {stats?.totalStudents || 0} students</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats ? formatCurrency(stats.monthlyRecurringRevenue) : "€0,00"}</div>
                  <p className="text-xs text-slate-400">+{stats?.growthRate || 0}% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Content Created</CardTitle>
                  <BookOpen className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{(stats?.totalLessons || 0) + (stats?.totalSongs || 0)}</div>
                  <p className="text-xs text-slate-400">{stats?.totalLessons || 0} lessons, {stats?.totalSongs || 0} songs</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Growth</CardTitle>
                  <CardDescription className="text-slate-400">Monthly recurring revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={revenueData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #374151' }}
                        labelStyle={{ color: '#F3F4F6' }}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#6366F1" fill="#6366F140" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Schools</CardTitle>
                  <CardDescription className="text-slate-400">Latest registered schools</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(schools?.slice(0, 5) || []).map((school) => (
                      <div key={school.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">{school.name}</p>
                          <p className="text-xs text-slate-400">{school.total_students || 0} students</p>
                        </div>
                        {getStatusBadge(school.subscription_status)}
                      </div>
                    ))}
                    {(!schools || schools.length === 0) && (
                      <p className="text-slate-400 text-sm">No schools registered yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "schools":
        return (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">All Schools</CardTitle>
                  <CardDescription className="text-slate-400">Manage all registered music schools</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search schools..."
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    data-testid="input-school-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-300">School Name</TableHead>
                    <TableHead className="text-slate-300">Teachers</TableHead>
                    <TableHead className="text-slate-300">Students</TableHead>
                    <TableHead className="text-slate-300">Lessons</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((school) => (
                    <TableRow key={school.id} className="border-slate-700 hover:bg-slate-700/50" data-testid={`row-school-${school.id}`}>
                      <TableCell className="text-white font-medium">{school.name}</TableCell>
                      <TableCell className="text-slate-300">{school.total_teachers || 0}</TableCell>
                      <TableCell className="text-slate-300">{school.total_students || 0}</TableCell>
                      <TableCell className="text-slate-300">{school.total_lessons || 0}</TableCell>
                      <TableCell>{getStatusBadge(school.subscription_status)}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(school.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredSchools.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                        No schools found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "users":
        const allUsersList = allUsers || [];
        const roleStats = {
          platform_owner: allUsersList.filter(u => u.role === 'platform_owner').length,
          school_owner: allUsersList.filter(u => u.role === 'school_owner').length,
          teacher: allUsersList.filter(u => u.role === 'teacher').length,
          student: allUsersList.filter(u => u.role === 'student').length,
        };
        
        const usersWithSchool = filteredUsers.filter(u => u.school_id && u.school_name);
        const usersWithoutSchool = filteredUsers.filter(u => !u.school_id || !u.school_name);
        
        const usersGroupedBySchool: { schoolId: number | null; schoolName: string; users: UserData[] }[] = [];
        
        const schoolMap = new Map<number, UserData[]>();
        for (const user of usersWithSchool) {
          if (!schoolMap.has(user.school_id)) {
            schoolMap.set(user.school_id, []);
          }
          schoolMap.get(user.school_id)!.push(user);
        }
        
        for (const [schoolId, users] of schoolMap) {
          const schoolName = users[0]?.school_name || `School ${schoolId}`;
          usersGroupedBySchool.push({ schoolId, schoolName, users });
        }
        
        usersGroupedBySchool.sort((a, b) => a.schoolName.localeCompare(b.schoolName));
        
        if (usersWithoutSchool.length > 0) {
          usersGroupedBySchool.unshift({ 
            schoolId: null, 
            schoolName: 'Platform Users (No School)', 
            users: usersWithoutSchool 
          });
        }
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-purple-900/30 border-purple-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">{roleStats.platform_owner}</p>
                  <p className="text-xs text-purple-300">Platform Owners</p>
                </CardContent>
              </Card>
              <Card className="bg-indigo-900/30 border-indigo-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-400">{roleStats.school_owner}</p>
                  <p className="text-xs text-indigo-300">School Owners</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-900/30 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{roleStats.teacher}</p>
                  <p className="text-xs text-blue-300">Teachers</p>
                </CardContent>
              </Card>
              <Card className="bg-green-900/30 border-green-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{roleStats.student}</p>
                  <p className="text-xs text-green-300">Students</p>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">All Users by School</CardTitle>
                    <CardDescription className="text-slate-400">View users grouped by their school affiliation</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      data-testid="input-user-search"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {usersGroupedBySchool.map((group) => (
                  <div key={group.schoolId ?? 'no-school'} className="border border-slate-700 rounded-lg overflow-hidden">
                    <div className="bg-slate-700/50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-400" />
                        <span className="font-medium text-white">{group.schoolName}</span>
                        <Badge variant="outline" className="text-xs ml-2">{group.users.length} users</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <UserCog className="h-3 w-3 text-indigo-400" />
                          {group.users.filter(u => u.role === 'school_owner').length} Owners
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-400" />
                          {group.users.filter(u => u.role === 'teacher').length} Teachers
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3 text-green-400" />
                          {group.users.filter(u => u.role === 'student').length} Students
                        </span>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-slate-700/50">
                          <TableHead className="text-slate-300">Name</TableHead>
                          <TableHead className="text-slate-300">Username</TableHead>
                          <TableHead className="text-slate-300">Email</TableHead>
                          <TableHead className="text-slate-300">Role</TableHead>
                          <TableHead className="text-slate-300">Last Login</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.users.slice(0, 20).map((user) => (
                          <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/50" data-testid={`row-user-${user.id}`}>
                            <TableCell className="text-white font-medium">{user.name}</TableCell>
                            <TableCell className="text-slate-300">{user.username}</TableCell>
                            <TableCell className="text-slate-300">{user.email}</TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell className="text-slate-400">{formatDate(user.last_login_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {group.users.length > 20 && (
                      <div className="px-4 py-2 text-center text-xs text-slate-400 bg-slate-700/30">
                        Showing 20 of {group.users.length} users in this school
                      </div>
                    )}
                  </div>
                ))}
                {usersGroupedBySchool.length === 0 && (
                  <p className="text-center text-slate-400 py-8">No users found</p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "customer-service":
        return (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <CustomerService />
          </div>
        );

      case "billing":
        return (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <BillingManagement />
          </div>
        );

      case "audit-log":
        return (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Admin Audit Log</CardTitle>
              <CardDescription className="text-slate-400">Track all administrative actions on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-300">Date/Time</TableHead>
                    <TableHead className="text-slate-300">Actor</TableHead>
                    <TableHead className="text-slate-300">Action</TableHead>
                    <TableHead className="text-slate-300">Target</TableHead>
                    <TableHead className="text-slate-300">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditLog || []).map((entry) => (
                    <TableRow key={entry.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="text-slate-400">
                        {new Date(entry.created_at).toLocaleString('nl-NL')}
                      </TableCell>
                      <TableCell className="text-white">{entry.actor_name || entry.actor_username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">{entry.action}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{entry.target_type} #{entry.target_id}</TableCell>
                      <TableCell className="text-slate-400 max-w-xs truncate">
                        {entry.metadata ? JSON.stringify(entry.metadata).slice(0, 50) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!auditLog || auditLog.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                        No audit log entries yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case "overview": return "Platform Overview";
      case "schools": return "Schools Management";
      case "users": return "Users Management";
      case "customer-service": return "Customer Service";
      case "billing": return "Billing Management";
      case "audit-log": return "Audit Log";
      default: return "Platform Dashboard";
    }
  };

  return (
    <PlatformOwnerLayout 
      title={getTitle()} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
    >
      {renderContent()}
    </PlatformOwnerLayout>
  );
}

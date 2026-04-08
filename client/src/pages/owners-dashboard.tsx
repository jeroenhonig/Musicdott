import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlatformOwnerLayout from "@/components/layouts/platform-owner-layout";
import CustomerService from "@/components/customer-service";
import BillingManagement from "@/components/billing-management";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
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
  GraduationCap,
  Plus,
  AlertTriangle,
  UserPlus,
  Trash2,
  Edit
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
  address: string;
  phone: string;
  website: string;
  owner_id: number;
  owner_name: string;
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
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Dialog states
  const [createSchoolOpen, setCreateSchoolOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [assignOwnerOpen, setAssignOwnerOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);

  // Form states
  const [newSchool, setNewSchool] = useState({ name: "", city: "", address: "", phone: "", website: "", ownerId: "" });
  const [newUser, setNewUser] = useState({ username: "", email: "", name: "", password: "", role: "school_owner", schoolId: "" });

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ["/api/owners/platform-stats"],
  });

  const { data: schools, isLoading: schoolsLoading } = useQuery<SchoolData[]>({
    queryKey: ["/api/owners/all-schools"],
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ["/api/owners/all-users"],
  });

  const { data: auditLog } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/platform/audit-log"],
  });

  const { data: revenueData } = useQuery<any[]>({
    queryKey: ["/api/owners/revenue-analytics"],
  });

  // Mutations
  const createSchoolMutation = useMutation({
    mutationFn: async (data: typeof newSchool) => {
      const res = await fetch("/api/platform/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          city: data.city || undefined,
          address: data.address || undefined,
          phone: data.phone || undefined,
          website: data.website || undefined,
          ownerId: data.ownerId ? parseInt(data.ownerId) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create school");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('ownersDashboard.toastSchoolCreated'), description: t('ownersDashboard.toastSchoolCreatedDesc') });
      setCreateSchoolOpen(false);
      setNewSchool({ name: "", city: "", address: "", phone: "", website: "", ownerId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/owners/all-schools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owners/platform-stats"] });
    },
    onError: (error: Error) => {
      toast({ title: t('ownersDashboard.toastError'), description: error.message, variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      const res = await fetch("/api/platform/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          name: data.name,
          password: data.password,
          role: data.role,
          schoolId: data.schoolId ? parseInt(data.schoolId) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('ownersDashboard.toastUserCreated'), description: t('ownersDashboard.toastUserCreatedDesc') });
      setCreateUserOpen(false);
      setNewUser({ username: "", email: "", name: "", password: "", role: "school_owner", schoolId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/owners/all-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owners/platform-stats"] });
    },
    onError: (error: Error) => {
      toast({ title: t('ownersDashboard.toastError'), description: error.message, variant: "destructive" });
    },
  });

  const assignOwnerMutation = useMutation({
    mutationFn: async ({ schoolId, ownerId }: { schoolId: number; ownerId: number }) => {
      const res = await fetch(`/api/platform/schools/${schoolId}/assign-owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to assign owner");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('ownersDashboard.toastOwnerAssigned'), description: t('ownersDashboard.toastOwnerAssignedDesc') });
      setAssignOwnerOpen(false);
      setSelectedSchool(null);
      queryClient.invalidateQueries({ queryKey: ["/api/owners/all-schools"] });
    },
    onError: (error: Error) => {
      toast({ title: t('ownersDashboard.toastError'), description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/platform/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('ownersDashboard.toastUserDeleted'), description: t('ownersDashboard.toastUserDeletedDesc') });
      queryClient.invalidateQueries({ queryKey: ["/api/owners/all-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owners/platform-stats"] });
    },
    onError: (error: Error) => {
      toast({ title: t('ownersDashboard.toastError'), description: error.message, variant: "destructive" });
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      const res = await fetch(`/api/platform/schools/${schoolId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete school");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('ownersDashboard.toastSchoolDeleted'), description: t('ownersDashboard.toastSchoolDeletedDesc') });
      queryClient.invalidateQueries({ queryKey: ["/api/owners/all-schools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owners/platform-stats"] });
    },
    onError: (error: Error) => {
      toast({ title: t('ownersDashboard.toastError'), description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return t('ownersDashboard.never');
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get available school owners (users with school_owner role who don't have a school yet)
  const availableSchoolOwners = allUsers?.filter(u => u.role === 'school_owner') || [];

  const filteredSchools = schools?.filter(s =>
    s.name?.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.city?.toLowerCase().includes(schoolSearch.toLowerCase())
  ) || [];

  const filteredUsers = allUsers?.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  // Helper to check if school has issues
  const getSchoolWarnings = (school: SchoolData) => {
    const warnings: string[] = [];
    if (!school.owner_id) warnings.push(t('ownersDashboard.warningNoOwner'));
    if (!school.name) warnings.push(t('ownersDashboard.warningNoName'));
    if (!school.city && !school.address) warnings.push(t('ownersDashboard.warningNoLocation'));
    return warnings;
  };

  // Helper to check if user has issues
  const getUserWarnings = (user: UserData) => {
    const warnings: string[] = [];
    if (!user.email) warnings.push(t('ownersDashboard.warningNoEmail'));
    if ((user.role === 'school_owner' || user.role === 'teacher') && !user.school_id) {
      warnings.push(t('ownersDashboard.warningNoSchool'));
    }
    return warnings;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "current":
        return <Badge className="bg-green-500 hover:bg-green-600">{t('ownersDashboard.statusActive')}</Badge>;
      case "trial":
        return <Badge className="bg-blue-500 hover:bg-blue-600">{t('ownersDashboard.statusTrial')}</Badge>;
      case "overdue":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{t('ownersDashboard.statusOverdue')}</Badge>;
      case "suspended":
        return <Badge className="bg-red-500 hover:bg-red-600">{t('ownersDashboard.statusSuspended')}</Badge>;
      default:
        return <Badge variant="outline">{status || t('ownersDashboard.statusUnknown')}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "platform_owner":
        return <Badge className="bg-purple-500 hover:bg-purple-600">{t('ownersDashboard.rolePlatformOwner')}</Badge>;
      case "school_owner":
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">{t('ownersDashboard.roleSchoolOwner')}</Badge>;
      case "teacher":
        return <Badge className="bg-blue-500 hover:bg-blue-600">{t('ownersDashboard.roleTeacher')}</Badge>;
      case "student":
        return <Badge className="bg-green-500 hover:bg-green-600">{t('ownersDashboard.roleStudent')}</Badge>;
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
                  <CardTitle className="text-sm font-medium text-slate-300">{t('ownersDashboard.statTotalSchools')}</CardTitle>
                  <Building2 className="h-4 w-4 text-indigo-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalSchools || 0}</div>
                  <p className="text-xs text-slate-400">{stats?.activeSubscriptions || 0} {t('ownersDashboard.statActiveSubscriptions')}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">{t('ownersDashboard.statTotalUsers')}</CardTitle>
                  <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-slate-400">{stats?.totalTeachers || 0} {t('ownersDashboard.roleTeacher').toLowerCase()}, {stats?.totalStudents || 0} {t('ownersDashboard.roleStudent').toLowerCase()}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">{t('ownersDashboard.statMonthlyRevenue')}</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats ? formatCurrency(stats.monthlyRecurringRevenue) : "€0,00"}</div>
                  <p className="text-xs text-slate-400">+{stats?.growthRate || 0}% {t('ownersDashboard.statGrowthRate')}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">{t('ownersDashboard.statContentCreated')}</CardTitle>
                  <BookOpen className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{(stats?.totalLessons || 0) + (stats?.totalSongs || 0)}</div>
                  <p className="text-xs text-slate-400">{stats?.totalLessons || 0} {t('nav.lessons').toLowerCase()}, {stats?.totalSongs || 0} {t('nav.search').toLowerCase()}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">{t('ownersDashboard.revenueGrowth')}</CardTitle>
                  <CardDescription className="text-slate-400">{t('ownersDashboard.monthlyRecurringRevenue')}</CardDescription>
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
                        formatter={(value: number) => [formatCurrency(value), t('ownersDashboard.revenueTooltip')]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#6366F1" fill="#6366F140" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">{t('ownersDashboard.recentSchools')}</CardTitle>
                  <CardDescription className="text-slate-400">{t('ownersDashboard.latestRegisteredSchools')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(schools?.slice(0, 5) || []).map((school) => {
                      const warnings = getSchoolWarnings(school);
                      return (
                        <div key={school.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {warnings.length > 0 && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" title={warnings.join(", ")} />
                            )}
                            <div>
                              <p className="text-sm font-medium text-white">{school.name || `School #${school.id}`}</p>
                              <p className="text-xs text-slate-400">{school.total_students || 0} {t('ownersDashboard.roleStudent').toLowerCase()}</p>
                            </div>
                          </div>
                          {getStatusBadge(school.subscription_status)}
                        </div>
                      );
                    })}
                    {(!schools || schools.length === 0) && (
                      <p className="text-slate-400 text-sm">{t('ownersDashboard.noSchoolsRegistered')}</p>
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
                  <CardTitle className="text-white">{t('ownersDashboard.allSchoolsTitle')}</CardTitle>
                  <CardDescription className="text-slate-400">{t('ownersDashboard.allSchoolsDescription')}</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder={t('ownersDashboard.searchSchoolsPlaceholder')}
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      data-testid="input-school-search"
                    />
                  </div>
                  <Dialog open={createSchoolOpen} onOpenChange={setCreateSchoolOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('ownersDashboard.newSchool')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">{t('ownersDashboard.createSchoolTitle')}</DialogTitle>
                        <DialogDescription className="text-slate-400">
                          {t('ownersDashboard.createSchoolDescription')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="school-name" className="text-slate-300">{t('ownersDashboard.schoolFieldName')}</Label>
                          <Input
                            id="school-name"
                            value={newSchool.name}
                            onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                            placeholder="Muziekschool Naam"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="school-city" className="text-slate-300">{t('ownersDashboard.schoolFieldCity')}</Label>
                            <Input
                              id="school-city"
                              value={newSchool.city}
                              onChange={(e) => setNewSchool({ ...newSchool, city: e.target.value })}
                              placeholder="Amsterdam"
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="school-phone" className="text-slate-300">{t('ownersDashboard.schoolFieldPhone')}</Label>
                            <Input
                              id="school-phone"
                              value={newSchool.phone}
                              onChange={(e) => setNewSchool({ ...newSchool, phone: e.target.value })}
                              placeholder="+31 20 123 4567"
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="school-address" className="text-slate-300">{t('ownersDashboard.schoolFieldAddress')}</Label>
                          <Input
                            id="school-address"
                            value={newSchool.address}
                            onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                            placeholder="Straatnaam 123"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="school-website" className="text-slate-300">{t('ownersDashboard.schoolFieldWebsite')}</Label>
                          <Input
                            id="school-website"
                            value={newSchool.website}
                            onChange={(e) => setNewSchool({ ...newSchool, website: e.target.value })}
                            placeholder="https://www.muziekschool.nl"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="school-owner" className="text-slate-300">{t('ownersDashboard.schoolFieldOwner')}</Label>
                          <Select
                            value={newSchool.ownerId || "none"}
                            onValueChange={(value) => setNewSchool({ ...newSchool, ownerId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder={t('ownersDashboard.schoolOwnerPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="none">{t('ownersDashboard.schoolNoOwner')}</SelectItem>
                              {availableSchoolOwners.map((owner) => (
                                <SelectItem key={owner.id} value={owner.id.toString()}>
                                  {owner.name} ({owner.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setCreateSchoolOpen(false)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          {t('ownersDashboard.cancel')}
                        </Button>
                        <Button
                          onClick={() => createSchoolMutation.mutate(newSchool)}
                          disabled={!newSchool.name || createSchoolMutation.isPending}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {createSchoolMutation.isPending ? t('ownersDashboard.creating') : t('ownersDashboard.create')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {schoolsLoading ? (
                <p className="text-center text-slate-400 py-8">{t('ownersDashboard.loading')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-700/50">
                      <TableHead className="text-slate-300">{t('ownersDashboard.tableSchoolName')}</TableHead>
                      <TableHead className="text-slate-300">{t('ownersDashboard.tableOwner')}</TableHead>
                      <TableHead className="text-slate-300">{t('ownersDashboard.tableCity')}</TableHead>
                      <TableHead className="text-slate-300">{t('ownersDashboard.tableTeachers')}</TableHead>
                      <TableHead className="text-slate-300">{t('ownersDashboard.tableStudents')}</TableHead>
                      <TableHead className="text-slate-300">{t('ownersDashboard.tableStatus')}</TableHead>
                      <TableHead className="text-slate-300">{t('ownersDashboard.tableActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.map((school) => {
                      const warnings = getSchoolWarnings(school);
                      return (
                        <TableRow key={school.id} className="border-slate-700 hover:bg-slate-700/50" data-testid={`row-school-${school.id}`}>
                          <TableCell className="text-white font-medium">
                            <div className="flex items-center gap-2">
                              {warnings.length > 0 && (
                                <AlertTriangle
                                  className="h-4 w-4 text-yellow-500 flex-shrink-0"
                                  title={warnings.join(", ")}
                                />
                              )}
                              <span>{school.name || <span className="text-slate-500 italic">{t('ownersDashboard.noName')}</span>}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {school.owner_name || (
                              <span className="text-yellow-500 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {t('ownersDashboard.notAssigned')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-300">{school.city || "-"}</TableCell>
                          <TableCell className="text-slate-300">{school.total_teachers || 0}</TableCell>
                          <TableCell className="text-slate-300">{school.total_students || 0}</TableCell>
                          <TableCell>{getStatusBadge(school.subscription_status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {!school.owner_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedSchool(school);
                                    setAssignOwnerOpen(true);
                                  }}
                                  className="h-8 border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  {t('ownersDashboard.assignOwnerButton')}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm(t('ownersDashboard.confirmDeleteSchool').replace('{name}', school.name || ''))) {
                                    deleteSchoolMutation.mutate(school.id);
                                  }
                                }}
                                className="h-8 border-red-600 text-red-400 hover:bg-red-900/50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredSchools.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                          {t('ownersDashboard.noSchoolsFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>

            {/* Assign Owner Dialog */}
            <Dialog open={assignOwnerOpen} onOpenChange={setAssignOwnerOpen}>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">{t('ownersDashboard.assignOwnerTitle')}</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {t('ownersDashboard.assignOwnerDescription').replace('{school}', selectedSchool?.name || '')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">{t('ownersDashboard.selectOwnerLabel')}</Label>
                    <Select
                      onValueChange={(value) => {
                        if (selectedSchool && value) {
                          assignOwnerMutation.mutate({
                            schoolId: selectedSchool.id,
                            ownerId: parseInt(value),
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder={t('ownersDashboard.selectOwnerPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {availableSchoolOwners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id.toString()}>
                            {owner.name} ({owner.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {availableSchoolOwners.length === 0 && (
                    <p className="text-sm text-yellow-500">
                      {t('ownersDashboard.noOwnersAvailable')}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAssignOwnerOpen(false);
                      setSelectedSchool(null);
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {t('ownersDashboard.cancel')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            schoolName: t('ownersDashboard.platformUsersNoSchool'),
            users: usersWithoutSchool
          });
        }

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-purple-900/30 border-purple-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">{roleStats.platform_owner}</p>
                  <p className="text-xs text-purple-300">{t('ownersDashboard.rolePlatformOwner')}</p>
                </CardContent>
              </Card>
              <Card className="bg-indigo-900/30 border-indigo-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-400">{roleStats.school_owner}</p>
                  <p className="text-xs text-indigo-300">{t('ownersDashboard.roleSchoolOwner')}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-900/30 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{roleStats.teacher}</p>
                  <p className="text-xs text-blue-300">{t('ownersDashboard.roleTeacher')}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-900/30 border-green-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{roleStats.student}</p>
                  <p className="text-xs text-green-300">{t('ownersDashboard.roleStudent')}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{t('ownersDashboard.allUsersTitle')}</CardTitle>
                    <CardDescription className="text-slate-400">{t('ownersDashboard.allUsersDescription')}</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder={t('ownersDashboard.searchUsersPlaceholder')}
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        data-testid="input-user-search"
                      />
                    </div>
                    <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                          <Plus className="h-4 w-4 mr-2" />
                          {t('ownersDashboard.newUser')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-800 border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">{t('ownersDashboard.createUserTitle')}</DialogTitle>
                          <DialogDescription className="text-slate-400">
                            {t('ownersDashboard.createUserDescription')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="user-name" className="text-slate-300">{t('ownersDashboard.userFieldName')}</Label>
                            <Input
                              id="user-name"
                              value={newUser.name}
                              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                              placeholder="Volledige naam"
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="user-username" className="text-slate-300">{t('ownersDashboard.userFieldUsername')}</Label>
                              <Input
                                id="user-username"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                placeholder="gebruikersnaam"
                                className="bg-slate-700 border-slate-600 text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="user-email" className="text-slate-300">{t('ownersDashboard.userFieldEmail')}</Label>
                              <Input
                                id="user-email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="email@voorbeeld.nl"
                                className="bg-slate-700 border-slate-600 text-white"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="user-password" className="text-slate-300">{t('ownersDashboard.userFieldPassword')}</Label>
                            <Input
                              id="user-password"
                              type="password"
                              value={newUser.password}
                              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                              placeholder="Minimaal 8 karakters"
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="user-role" className="text-slate-300">{t('ownersDashboard.userFieldRole')}</Label>
                              <Select
                                value={newUser.role}
                                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                              >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  <SelectItem value="school_owner">{t('ownersDashboard.roleSchoolOwner')}</SelectItem>
                                  <SelectItem value="teacher">{t('ownersDashboard.userRoleTeacher')}</SelectItem>
                                  <SelectItem value="student">{t('ownersDashboard.userRoleStudent')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="user-school" className="text-slate-300">{t('ownersDashboard.userFieldSchool')}</Label>
                              <Select
                                value={newUser.schoolId || "none"}
                                onValueChange={(value) => setNewUser({ ...newUser, schoolId: value === "none" ? "" : value })}
                              >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder={t('ownersDashboard.userNoSchool')} />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  <SelectItem value="none">{t('ownersDashboard.userNoSchool')}</SelectItem>
                                  {schools?.map((school) => (
                                    <SelectItem key={school.id} value={school.id.toString()}>
                                      {school.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setCreateUserOpen(false)}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            {t('ownersDashboard.cancel')}
                          </Button>
                          <Button
                            onClick={() => createUserMutation.mutate(newUser)}
                            disabled={!newUser.name || !newUser.username || !newUser.email || !newUser.password || createUserMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            {createUserMutation.isPending ? t('ownersDashboard.creating') : t('ownersDashboard.create')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {usersLoading ? (
                  <p className="text-center text-slate-400 py-8">{t('ownersDashboard.loading')}</p>
                ) : (
                  <>
                    {usersGroupedBySchool.map((group) => (
                      <div key={group.schoolId ?? 'no-school'} className="border border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-slate-700/50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {group.schoolId === null && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            <Building2 className="h-4 w-4 text-indigo-400" />
                            <span className="font-medium text-white">{group.schoolName}</span>
                            <Badge variant="outline" className="text-xs ml-2">{group.users.length} {t('ownersDashboard.usersLabel')}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <UserCog className="h-3 w-3 text-indigo-400" />
                              {group.users.filter(u => u.role === 'school_owner').length} {t('ownersDashboard.roleSchoolOwner')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-blue-400" />
                              {group.users.filter(u => u.role === 'teacher').length} {t('ownersDashboard.roleTeacher')}
                            </span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3 text-green-400" />
                              {group.users.filter(u => u.role === 'student').length} {t('ownersDashboard.roleStudent')}
                            </span>
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700 hover:bg-slate-700/50">
                              <TableHead className="text-slate-300">{t('ownersDashboard.tableUserName')}</TableHead>
                              <TableHead className="text-slate-300">{t('ownersDashboard.tableUsername')}</TableHead>
                              <TableHead className="text-slate-300">{t('ownersDashboard.tableEmail')}</TableHead>
                              <TableHead className="text-slate-300">{t('ownersDashboard.tableRole')}</TableHead>
                              <TableHead className="text-slate-300">{t('ownersDashboard.tableLastLogin')}</TableHead>
                              <TableHead className="text-slate-300">{t('ownersDashboard.tableActions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.users.slice(0, 20).map((user) => {
                              const warnings = getUserWarnings(user);
                              return (
                                <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/50" data-testid={`row-user-${user.id}`}>
                                  <TableCell className="text-white font-medium">
                                    <div className="flex items-center gap-2">
                                      {warnings.length > 0 && (
                                        <AlertTriangle
                                          className="h-4 w-4 text-yellow-500 flex-shrink-0"
                                          title={warnings.join(", ")}
                                        />
                                      )}
                                      {user.name || <span className="text-slate-500 italic">{t('ownersDashboard.noUserName')}</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-300">{user.username}</TableCell>
                                  <TableCell className="text-slate-300">{user.email || <span className="text-yellow-500">-</span>}</TableCell>
                                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                                  <TableCell className="text-slate-400">{formatDate(user.last_login_at)}</TableCell>
                                  <TableCell>
                                    {user.role !== 'platform_owner' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          if (confirm(t('ownersDashboard.confirmDeleteUser').replace('{name}', user.name || ''))) {
                                            deleteUserMutation.mutate(user.id);
                                          }
                                        }}
                                        className="h-8 border-red-600 text-red-400 hover:bg-red-900/50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {group.users.length > 20 && (
                          <div className="px-4 py-2 text-center text-xs text-slate-400 bg-slate-700/30">
                            {t('ownersDashboard.showingUsersOf').replace('{total}', String(group.users.length))}
                          </div>
                        )}
                      </div>
                    ))}
                    {usersGroupedBySchool.length === 0 && (
                      <p className="text-center text-slate-400 py-8">{t('ownersDashboard.noUsersFound')}</p>
                    )}
                  </>
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
              <CardTitle className="text-white">{t('ownersDashboard.auditLogTitle')}</CardTitle>
              <CardDescription className="text-slate-400">{t('ownersDashboard.auditLogDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-300">{t('ownersDashboard.auditTableDateTime')}</TableHead>
                    <TableHead className="text-slate-300">{t('ownersDashboard.auditTableActor')}</TableHead>
                    <TableHead className="text-slate-300">{t('ownersDashboard.auditTableAction')}</TableHead>
                    <TableHead className="text-slate-300">{t('ownersDashboard.auditTableTarget')}</TableHead>
                    <TableHead className="text-slate-300">{t('ownersDashboard.auditTableDetails')}</TableHead>
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
                        {t('ownersDashboard.noAuditEntries')}
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
      case "overview": return t('ownersDashboard.tabOverview');
      case "schools": return t('ownersDashboard.tabSchools');
      case "users": return t('ownersDashboard.tabUsers');
      case "customer-service": return t('ownersDashboard.tabCustomerService');
      case "billing": return t('ownersDashboard.tabBilling');
      case "audit-log": return t('ownersDashboard.tabAuditLog');
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

import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import Layout from "@/components/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Mail, 
  Phone, 
  Calendar, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Crown, 
  GraduationCap, 
  Shield,
  UserCog
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import RequireRole, { RequireSchoolOwner } from "@/components/rbac/require-role";
import RoleIndicator from "@/components/rbac/role-indicator";

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["teacher", "school_owner"], {
    required_error: "Role is required"
  })
});

type InviteMemberData = z.infer<typeof inviteMemberSchema>;

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  lastActive?: string;
  avatar?: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'platform_owner':
      return <Crown className="h-4 w-4 text-purple-600" />;
    case 'school_owner':
      return <Shield className="h-4 w-4 text-blue-600" />;
    case 'teacher':
      return <GraduationCap className="h-4 w-4 text-green-600" />;
    case 'student':
      return <UserCog className="h-4 w-4 text-gray-600" />;
    default:
      return <UserCog className="h-4 w-4 text-gray-600" />;
  }
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'platform_owner':
      return 'default';
    case 'school_owner':
      return 'secondary';
    case 'teacher':
      return 'outline';
    case 'student':
      return 'outline';
    default:
      return 'outline';
  }
};

export default function SchoolMembers() {
  const { currentSchool, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  // Get school members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['/api/school/members'],
    enabled: !!currentSchool
  });

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteMemberData) => {
      const response = await fetch('/api/school/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to invite member');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school/members'] });
      setInviteDialogOpen(false);
      form.reset();
      toast({
        title: t('schoolMembers.toast.inviteSentTitle'),
        description: t('schoolMembers.toast.inviteSentDescription')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('schoolMembers.toast.inviteFailedTitle'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await fetch(`/api/school/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to remove member');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school/members'] });
      toast({
        title: t('schoolMembers.toast.removedTitle'),
        description: t('schoolMembers.toast.removedDescription')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('schoolMembers.toast.removeFailedTitle'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const form = useForm<InviteMemberData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "teacher"
    }
  });

  const onSubmit = (data: InviteMemberData) => {
    inviteMemberMutation.mutate(data);
  };

  const handleRemoveMember = (memberId: number, memberName: string) => {
    if (window.confirm(t('schoolMembers.confirmRemove', { name: memberName }))) {
      removeMemberMutation.mutate(memberId);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!currentSchool) {
    return (
      <Layout title={t('schoolMembers.title')}>
        <div className="text-center py-8">
          <p>{t('schoolMembers.noSchoolSelected')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <RequireSchoolOwner>
      <Layout title={t('schoolMembers.title')}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('schoolMembers.title')}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t('schoolMembers.subtitle', { school: currentSchool.name })}
              </p>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-invite-member">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('schoolMembers.inviteMember')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('schoolMembers.dialog.inviteTitle')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('schoolMembers.form.firstName')}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('schoolMembers.form.lastName')}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('schoolMembers.form.email')}</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('schoolMembers.form.role')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder={t('schoolMembers.form.selectRole')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="teacher">{t('schoolMembers.role.teacher')}</SelectItem>
                              <SelectItem value="school_owner">{t('schoolMembers.role.schoolOwner')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInviteDialogOpen(false)}
                      >
                        {t('schoolMembers.form.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        disabled={inviteMemberMutation.isPending}
                        data-testid="button-send-invitation"
                      >
                        {inviteMemberMutation.isPending ? t('schoolMembers.form.sending') : t('schoolMembers.form.sendInvitation')}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('schoolMembers.teamMembers')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8">
                  <UserCog className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-muted-foreground">
                    {t('schoolMembers.noMembers')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('schoolMembers.table.member')}</TableHead>
                      <TableHead>{t('schoolMembers.table.role')}</TableHead>
                      <TableHead>{t('schoolMembers.table.status')}</TableHead>
                      <TableHead>{t('schoolMembers.table.joined')}</TableHead>
                      <TableHead>{t('schoolMembers.table.lastActive')}</TableHead>
                      <TableHead className="text-right">{t('schoolMembers.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(members as Member[]).map((member) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>
                                {getInitials(member.firstName, member.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.firstName} {member.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(member.role)}
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.isActive ? "default" : "secondary"}>
                            {member.isActive ? t('schoolMembers.status.active') : t('schoolMembers.status.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(member.joinedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.lastActive ? formatDate(member.lastActive) : t('schoolMembers.never')}
                        </TableCell>
                        <TableCell className="text-right">
                          {member.id !== user?.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-member-actions-${member.id}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(member.id, `${member.firstName} ${member.lastName}`)}
                                  className="text-red-600"
                                  data-testid={`button-remove-member-${member.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('schoolMembers.removeFromSchool')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('schoolMembers.stats.totalMembers')}</CardTitle>
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(members as Member[]).length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('schoolMembers.stats.activeMembers')}</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(members as Member[]).filter(m => m.isActive).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('schoolMembers.stats.teachers')}</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(members as Member[]).filter(m => m.role === 'teacher').length}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </RequireSchoolOwner>
  );
}
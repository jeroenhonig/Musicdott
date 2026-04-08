import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from "@/lib/i18n";
import { securePasswordSchema } from '@shared/auth-validation';
import AppLayout from '@/components/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Settings,
  User,
  School,
  Bell,
  Shield,
  Palette,
  Globe,
  Music,
  Save,
  Upload,
  Eye,
  EyeOff,
  Plug,
  Building2,
  CalendarX,
  Trash2,
  Plus,
} from "lucide-react";
import DrumSchoolIntegration from "@/components/integrations/drumschool-integration";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Studio, SchoolVacation } from "@shared/schema";

// Schema for profile settings
const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  bio: z.string().optional(),
  instruments: z.string().optional(),
  avatar: z.string().optional(),
});

// Schema for school settings
const schoolSchema = z.object({
  name: z.string().min(1, "School name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  instruments: z.string().optional(),
});

// Schema for notification settings
const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  lessonReminders: z.boolean(),
  assignmentDeadlines: z.boolean(),
  achievementAlerts: z.boolean(),
  weeklyReports: z.boolean(),
});

// Schema for system preferences
const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  timezone: z.string(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  language: z.string(),
  defaultView: z.enum(['dashboard', 'students', 'lessons', 'schedule']),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SchoolFormValues = z.infer<typeof schoolSchema>;
type NotificationFormValues = z.infer<typeof notificationSchema>;
type PreferencesFormValues = z.infer<typeof preferencesSchema>;

export default function SettingsPage() {
  const { t } = useTranslation();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();
  const { user, canManageSchool } = useAuth();

  // Only school owners and platform owners can edit school settings
  const canEditSchool = canManageSchool();

  // Fetch current settings
  const { data: userProfile } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!user
  });

  const { data: schoolSettings } = useQuery({
    queryKey: ['/api/school/settings'],
    enabled: !!user
  });

  const { data: notifications } = useQuery({
    queryKey: ['/api/user/notifications'],
    enabled: !!user
  });

  const { data: preferences } = useQuery({
    queryKey: ['/api/user/preferences'],
    enabled: !!user
  });

  // Form instances
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: (userProfile as any)?.name || user?.name || '',
      email: (userProfile as any)?.email || user?.email || '',
      bio: (userProfile as any)?.bio || '',
      instruments: (userProfile as any)?.instruments || '',
      avatar: (userProfile as any)?.avatar || '',
    }
  });

  const schoolForm = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: schoolSettings?.name || '',
      address: schoolSettings?.address || '',
      city: schoolSettings?.city || '',
      phone: schoolSettings?.phone || '',
      website: schoolSettings?.website || '',
      description: schoolSettings?.description || '',
      instruments: schoolSettings?.instruments || '',
    }
  });

  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: notifications?.emailNotifications ?? true,
      pushNotifications: notifications?.pushNotifications ?? true,
      lessonReminders: notifications?.lessonReminders ?? true,
      assignmentDeadlines: notifications?.assignmentDeadlines ?? true,
      achievementAlerts: notifications?.achievementAlerts ?? true,
      weeklyReports: notifications?.weeklyReports ?? false,
    }
  });

  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      theme: preferences?.theme || 'system',
      timezone: preferences?.timezone || 'UTC',
      dateFormat: preferences?.dateFormat || 'MM/DD/YYYY',
      language: preferences?.language || 'en',
      defaultView: preferences?.defaultView || 'dashboard',
    }
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const res = await apiRequest('PUT', '/api/user/profile', values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: t('settings.profile.updated'),
        description: t('settings.profile.updatedDescription'),
      });
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: async (values: SchoolFormValues) => {
      const res = await apiRequest('PUT', '/api/school/settings', values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school/settings'] });
      toast({
        title: t('settings.school.updated'),
        description: t('settings.school.updatedDescription'),
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (values: NotificationFormValues) => {
      const res = await apiRequest('PUT', '/api/user/notifications', values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/notifications'] });
      toast({
        title: t('settings.notifications.updated'),
        description: t('settings.notifications.updatedDescription'),
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (values: PreferencesFormValues) => {
      const res = await apiRequest('PUT', '/api/user/preferences', values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: t('settings.preferences.updated'),
        description: t('settings.preferences.updatedDescription'),
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('PATCH', '/api/user/password', data);
      return res.json();
    },
    onSuccess: () => {
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: t('settings.security.passwordChanged'),
        description: t('settings.security.passwordChangedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.security.passwordChangeFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: t('settings.security.passwordMismatch'),
        description: t('settings.security.passwordMismatchDescription'),
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = securePasswordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      toast({
        title: t('settings.security.weakPassword'),
        description: passwordValidation.error.issues[0]?.message || "Use a stronger password.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <AppLayout title={t('settings.title')}>
      <div className="space-y-6">
        {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-gray-600">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full ${canEditSchool ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('settings.tab.profile')}
          </TabsTrigger>
          {canEditSchool && (
            <TabsTrigger value="school" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              {t('settings.tab.school')}
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('settings.tab.notifications')}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('settings.tab.preferences')}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('settings.tab.security')}
          </TabsTrigger>
          {canEditSchool && (
            <TabsTrigger value="studios" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('settings.tab.studios')}
            </TabsTrigger>
          )}
          {canEditSchool && (
            <TabsTrigger value="vacations" className="flex items-center gap-2">
              <CalendarX className="h-4 w-4" />
              {t('settings.tab.vacations')}
            </TabsTrigger>
          )}
          {canEditSchool && (
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              {t('settings.tab.integrations')}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('settings.profile.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((values) => updateProfileMutation.mutate(values))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.profile.fullName')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.profile.emailAddress')}</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={profileForm.control}
                    name="instruments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.profile.instruments')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('settings.profile.instrumentsPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          {t('settings.profile.instrumentsDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.profile.bio')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('settings.profile.bioPlaceholder')}
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateProfileMutation.isPending ? t('settings.profile.saving') : t('settings.profile.saveProfile')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* School Settings - Only visible to school owners and platform owners */}
        {canEditSchool && (
        <TabsContent value="school">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                {t('settings.school.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...schoolForm}>
                <form onSubmit={schoolForm.handleSubmit((values) => updateSchoolMutation.mutate(values))} className="space-y-4">
                  <FormField
                    control={schoolForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.school.name')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={schoolForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.school.address')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={schoolForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.school.city')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={schoolForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.school.phone')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={schoolForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.school.website')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('settings.school.websitePlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={schoolForm.control}
                    name="instruments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.school.instruments')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('settings.school.instrumentsPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          {t('settings.school.instrumentsDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={schoolForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.school.description')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('settings.school.descriptionPlaceholder')}
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={updateSchoolMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateSchoolMutation.isPending ? t('settings.school.saving') : t('settings.school.save')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('settings.notifications.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit((values) => updateNotificationsMutation.mutate(values))} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('settings.notifications.email')}</FormLabel>
                            <FormDescription>
                              {t('settings.notifications.emailDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="lessonReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('settings.notifications.lessonReminders')}</FormLabel>
                            <FormDescription>
                              {t('settings.notifications.lessonRemindersDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="assignmentDeadlines"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('settings.notifications.assignmentDeadlines')}</FormLabel>
                            <FormDescription>
                              {t('settings.notifications.assignmentDeadlinesDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="achievementAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('settings.notifications.achievementAlerts')}</FormLabel>
                            <FormDescription>
                              {t('settings.notifications.achievementAlertsDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="weeklyReports"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('settings.notifications.weeklyReports')}</FormLabel>
                            <FormDescription>
                              {t('settings.notifications.weeklyReportsDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={updateNotificationsMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateNotificationsMutation.isPending ? t('settings.notifications.saving') : t('settings.notifications.save')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Preferences */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('settings.preferences.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...preferencesForm}>
                <form onSubmit={preferencesForm.handleSubmit((values) => updatePreferencesMutation.mutate(values))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={preferencesForm.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.preferences.theme')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="light">{t('settings.preferences.themeLight')}</SelectItem>
                              <SelectItem value="dark">{t('settings.preferences.themeDark')}</SelectItem>
                              <SelectItem value="system">{t('settings.preferences.themeSystem')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={preferencesForm.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.preferences.language')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="en">{t('settings.preferences.langEnglish')}</SelectItem>
                              <SelectItem value="es">{t('settings.preferences.langSpanish')}</SelectItem>
                              <SelectItem value="fr">{t('settings.preferences.langFrench')}</SelectItem>
                              <SelectItem value="de">{t('settings.preferences.langGerman')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={preferencesForm.control}
                      name="dateFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.preferences.dateFormat')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={preferencesForm.control}
                      name="defaultView"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.preferences.defaultView')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="dashboard">{t('settings.preferences.viewDashboard')}</SelectItem>
                              <SelectItem value="students">{t('settings.preferences.viewStudents')}</SelectItem>
                              <SelectItem value="lessons">{t('settings.preferences.viewLessons')}</SelectItem>
                              <SelectItem value="schedule">{t('settings.preferences.viewSchedule')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={updatePreferencesMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updatePreferencesMutation.isPending ? t('settings.preferences.saving') : t('settings.preferences.save')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('settings.security.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Change Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{t('settings.security.changePassword')}</h3>
                    <p className="text-sm text-gray-600">{t('settings.security.changePasswordSubtitle')}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                  >
                    {showPasswordChange ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showPasswordChange ? t('settings.security.cancel') : t('settings.security.changePasswordBtn')}
                  </Button>
                </div>
                
                {showPasswordChange && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="current-password">{t('settings.security.currentPassword')}</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">{t('settings.security.newPassword')}</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('settings.security.newPasswordPlaceholder')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">{t('settings.security.confirmPassword')}</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {changePasswordMutation.isPending ? t('settings.security.updatingPassword') : t('settings.security.updatePassword')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-medium">{t('settings.security.accountInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600">{t('settings.security.role')}</Label>
                    <p className="font-medium">{user?.role || 'Teacher'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">{t('settings.security.accountStatus')}</Label>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {t('settings.security.accountActive')}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-600">{t('settings.security.memberSince')}</Label>
                    <p className="font-medium">January 2024</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">{t('settings.security.lastLogin')}</Label>
                    <p className="font-medium">{t('settings.security.lastLoginValue')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Studios */}
        {canEditSchool && (
          <TabsContent value="studios">
            <StudiosTab />
          </TabsContent>
        )}

        {/* Vakanties */}
        {canEditSchool && (
          <TabsContent value="vacations">
            <VacationsTab />
          </TabsContent>
        )}

        {/* Integrations – DrumSchool Manager */}
        {canEditSchool && (
          <TabsContent value="integrations">
            <DrumSchoolIntegration />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// StudiosTab — manage physical rooms per school
// ---------------------------------------------------------------------------
function StudiosTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const { data: studiosList = [], isLoading } = useQuery<Studio[]>({
    queryKey: ["/api/studios"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/studios", { name: newName.trim(), location: newLocation.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studios"] });
      setNewName("");
      setNewLocation("");
      toast({ title: t('settings.studios.created') });
    },
    onError: (err: Error) => toast({ title: t('settings.studios.error'), description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/studios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studios"] });
      toast({ title: t('settings.studios.deleted') });
    },
    onError: (err: Error) => toast({ title: t('settings.studios.error'), description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t('settings.studios.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('settings.studios.loading')}</p>
        ) : studiosList.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.studios.empty')}</p>
        ) : (
          <div className="space-y-2">
            {studiosList.map(studio => (
              <div key={studio.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{studio.name}</p>
                  {studio.location && <p className="text-xs text-muted-foreground">{studio.location}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(studio.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium">{t('settings.studios.addNew')}</p>
          <div className="flex gap-2">
            <Input
              placeholder={t('settings.studios.namePlaceholder')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={t('settings.studios.locationPlaceholder')}
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('settings.studios.addButton')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// VacationsTab — manage vacation periods that block lessons in the agenda
// ---------------------------------------------------------------------------
function VacationsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const { data: vacationsList = [], isLoading } = useQuery<SchoolVacation[]>({
    queryKey: ["/api/school/vacations"],
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/school/vacations", {
        title: newTitle.trim(),
        startDate: newStart,
        endDate: newEnd,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/vacations"] });
      setNewTitle("");
      setNewStart("");
      setNewEnd("");
      toast({ title: t('settings.vacations.saved') });
    },
    onError: (err: Error) => toast({ title: t('settings.vacations.error'), description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/school/vacations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/vacations"] });
      toast({ title: t('settings.vacations.deleted') });
    },
    onError: (err: Error) => toast({ title: t('settings.vacations.error'), description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="h-5 w-5" />
          {t('settings.vacations.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('settings.vacations.subtitle')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('settings.vacations.loading')}</p>
        ) : vacationsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.vacations.empty')}</p>
        ) : (
          <div className="space-y-2">
            {vacationsList.map(v => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{v.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.startDate} → {v.endDate}
                    {v.isBlackout && <span className="ml-2 text-red-500">{t('settings.vacations.blackout')}</span>}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(v.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium">{t('settings.vacations.addNew')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder={t('settings.vacations.namePlaceholder')}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Input
              type="date"
              value={newStart}
              onChange={e => setNewStart(e.target.value)}
            />
            <Input
              type="date"
              value={newEnd}
              onChange={e => setNewEnd(e.target.value)}
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!newTitle.trim() || !newStart || !newEnd || createMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('settings.vacations.addButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

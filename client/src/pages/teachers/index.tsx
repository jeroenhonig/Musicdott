import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Users, Mail, Music } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { RequireSchoolOwner } from "@/components/rbac/require-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layouts/app-layout";

// Create teacher form schema
const teacherFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  instruments: z.string().optional(),
  bio: z.string().optional(),
});

// Update teacher form schema (no password required)
const updateTeacherFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  instruments: z.string().optional(),
  bio: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;
type UpdateTeacherFormValues = z.infer<typeof updateTeacherFormSchema>;

export default function TeachersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, currentSchool, canManageSchool } = useAuth();

  const createForm = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      instruments: "",
      bio: "",
    },
  });

  const updateForm = useForm<UpdateTeacherFormValues>({
    resolver: zodResolver(updateTeacherFormSchema),
    defaultValues: {
      name: "",
      email: "",
      instruments: "",
      bio: "",
    },
  });

  // Fetch teachers
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["/api/teachers"],
    enabled: canManageSchool(),
  });

  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormValues) => {
      const res = await apiRequest("POST", "/api/teachers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: t('teachers.toast.created'),
        description: t('teachers.toast.createdDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('teachers.toast.createFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update teacher mutation
  const updateTeacherMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTeacherFormValues }) => {
      const res = await apiRequest("PUT", `/api/teachers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      setIsUpdateDialogOpen(false);
      setSelectedTeacher(null);
      toast({
        title: t('teachers.toast.updated'),
        description: t('teachers.toast.updatedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('teachers.toast.updateFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete teacher mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/teachers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      setIsDeleteDialogOpen(false);
      setSelectedTeacher(null);
      toast({
        title: t('teachers.toast.deleted'),
        description: t('teachers.toast.deletedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('teachers.toast.deleteFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter teachers by search term
  const filteredTeachers = teachers.filter((teacher: any) =>
    teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.instruments?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditTeacher = (teacher: any) => {
    setSelectedTeacher(teacher);
    updateForm.reset({
      name: teacher.name || "",
      email: teacher.email || "",
      instruments: teacher.instruments || "",
      bio: teacher.bio || "",
    });
    setIsUpdateDialogOpen(true);
  };

  const handleDeleteTeacher = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const onCreateSubmit = (data: TeacherFormValues) => {
    createTeacherMutation.mutate(data);
  };

  const onUpdateSubmit = (data: UpdateTeacherFormValues) => {
    if (selectedTeacher) {
      updateTeacherMutation.mutate({ id: selectedTeacher.id, data });
    }
  };

  return (
    <RequireSchoolOwner>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('teachers.title')}</h1>
              <p className="text-muted-foreground">
                {t('teachers.subtitle')}
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('teachers.addTeacher')}
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('teachers.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Teachers Grid */}
          {isLoading ? (
            <div className="text-center py-8">{t('teachers.loading')}</div>
          ) : filteredTeachers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('teachers.noTeachersFound')}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? t('teachers.noTeachersSearch')
                    : t('teachers.noTeachersEmpty')}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('teachers.addTeacher')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map((teacher: any) => (
                <Card key={teacher.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{teacher.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {teacher.email}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTeacher(teacher)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTeacher(teacher)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {teacher.instruments && (
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{teacher.instruments}</span>
                      </div>
                    )}
                    {teacher.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {teacher.bio}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {t('teachers.roleBadge')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Teacher Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('teachers.dialog.addTitle')}</DialogTitle>
                <DialogDescription>
                  {t('teachers.dialog.addDescription')}
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('teachers.form.fullName')}</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('teachers.form.email')}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('teachers.form.username')}</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('teachers.form.password')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="instruments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('teachers.form.instruments')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('teachers.form.instrumentsPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          {t('teachers.form.instrumentsDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('teachers.form.bio')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('teachers.form.bioPlaceholder')}
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      {t('teachers.form.cancel')}
                    </Button>
                    <Button type="submit" disabled={createTeacherMutation.isPending}>
                      {createTeacherMutation.isPending ? t('teachers.form.creating') : t('teachers.form.createButton')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Update Teacher Dialog */}
          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('teachers.dialog.editTitle')}</DialogTitle>
                <DialogDescription>
                  {t('teachers.dialog.editDescription')}
                </DialogDescription>
              </DialogHeader>
              <Form {...updateForm}>
                <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={updateForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('teachers.form.fullName')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={updateForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('teachers.form.email')}</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={updateForm.control}
                    name="instruments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('teachers.form.instruments')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={updateForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('teachers.form.bio')}</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUpdateDialogOpen(false)}
                    >
                      {t('teachers.form.cancel')}
                    </Button>
                    <Button type="submit" disabled={updateTeacherMutation.isPending}>
                      {updateTeacherMutation.isPending ? t('teachers.form.saving') : t('teachers.form.saveChanges')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('teachers.dialog.deleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('teachers.dialog.deleteDescription', { name: selectedTeacher?.name ?? '' })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('teachers.form.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => selectedTeacher && deleteTeacherMutation.mutate(selectedTeacher.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteTeacherMutation.isPending ? t('teachers.form.deleting') : t('teachers.form.deleteButton')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AppLayout>
    </RequireSchoolOwner>
  );
}

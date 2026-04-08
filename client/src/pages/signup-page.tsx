import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { securePasswordSchema, usernameSchema } from "@shared/auth-validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, School, User, Mail, Lock, Building, MapPin, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import musicdottLogo from "../assets/musicdott-logo.png";

const signupSchema = z.object({
  // Account basics
  username: usernameSchema,
  email: z.string().email("Invalid email address"),
  password: securePasswordSchema,
  confirmPassword: z.string(),
  
  // School/Organization info
  schoolName: z.string().min(2, "School name is required"),
  schoolAddress: z.string().optional(),
  schoolPhone: z.string().optional(),
  schoolWebsite: z.string().url().optional().or(z.literal("")),
  
  // Personal info
  ownerName: z.string().min(2, "Your name is required"),
  role: z.enum(["school_owner", "teacher"], {
    required_error: "Please select your role",
  }),
  
  // Music focus
  primaryInstruments: z.string().min(1, "Please specify your primary instruments"),
  studentCapacity: z.string().min(1, "Please estimate your student capacity"),
  
  // Experience
  yearsTeaching: z.string().min(1, "Teaching experience is required"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      schoolName: "",
      schoolAddress: "",
      schoolPhone: "",
      schoolWebsite: "",
      ownerName: "",
      role: undefined,
      primaryInstruments: "",
      studentCapacity: "",
      yearsTeaching: "",
      bio: "",
    },
  });

  const onSubmit = async (data: SignupForm) => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/register", {
        // Account data
        username: data.username,
        email: data.email,
        password: data.password,
        name: data.ownerName,
        role: data.role,
        
        // School data
        schoolName: data.schoolName,
        address: data.schoolAddress,
        phone: data.schoolPhone,
        website: data.schoolWebsite,
        
        // Professional data
        instruments: data.primaryInstruments,
        bio: data.bio,
        metadata: {
          studentCapacity: data.studentCapacity,
          yearsTeaching: data.yearsTeaching,
        }
      });

      toast({
        title: t('signup.toast.successTitle'),
        description: t('signup.toast.successDescription'),
      });

      navigate("/auth");
    } catch (error: any) {
      toast({
        title: t('signup.toast.errorTitle'),
        description: error.message || t('signup.toast.errorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={musicdottLogo} 
            alt="MusicDott" 
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('signup.pageTitle')}
          </h1>
          <p className="text-gray-600">
            {t('signup.pageSubtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              {t('signup.cardTitle')}
            </CardTitle>
            <CardDescription>
              {t('signup.cardDescription')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Account Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('signup.section.accountInfo')}
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.fullName')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('signup.placeholder.fullName')} {...field} />
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
                          <FormLabel>{t('signup.field.role')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('signup.placeholder.selectRole')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="school_owner">{t('signup.role.schoolOwner')}</SelectItem>
                              <SelectItem value="teacher">{t('signup.role.teacher')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.username')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('signup.placeholder.username')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.emailAddress')}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder={t('signup.placeholder.email')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.password')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder={t('signup.placeholder.password')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.confirmPassword')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder={t('signup.placeholder.confirmPassword')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* School Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {t('signup.section.schoolInfo')}
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.field.schoolName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('signup.placeholder.schoolName')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="schoolAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.address')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('signup.placeholder.address')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="schoolPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.phone')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('signup.placeholder.phone')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="schoolWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.field.website')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('signup.placeholder.website')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Teaching Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('signup.section.teachingInfo')}
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryInstruments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.primaryInstruments')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('signup.placeholder.instruments')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="yearsTeaching"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.field.yearsTeaching')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('signup.placeholder.selectExperience')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0-1">{t('signup.experience.lessThan1')}</SelectItem>
                              <SelectItem value="1-3">{t('signup.experience.1to3')}</SelectItem>
                              <SelectItem value="3-5">{t('signup.experience.3to5')}</SelectItem>
                              <SelectItem value="5-10">{t('signup.experience.5to10')}</SelectItem>
                              <SelectItem value="10+">{t('signup.experience.10plus')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="studentCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.field.studentCapacity')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('signup.placeholder.studentCapacity')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1-10">{t('signup.capacity.1to10')}</SelectItem>
                            <SelectItem value="11-25">{t('signup.capacity.11to25')}</SelectItem>
                            <SelectItem value="26-50">{t('signup.capacity.26to50')}</SelectItem>
                            <SelectItem value="51-100">{t('signup.capacity.51to100')}</SelectItem>
                            <SelectItem value="100+">{t('signup.capacity.100plus')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.field.bio')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('signup.placeholder.bio')}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit */}
                <div className="flex flex-col gap-4">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('signup.button.creatingAccount')}
                      </>
                    ) : (
                      t('signup.button.createAccount')
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/auth")}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('signup.button.backToLogin')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            {t('signup.footer.terms')}
          </p>
          <p className="mt-2">
            🇳🇱 {t('footer.proudlyBuilt')}
          </p>
        </div>
      </div>
    </div>
  );
}

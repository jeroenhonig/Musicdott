import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Music, Star, Users, Calendar, Award, ArrowRight, CheckCircle, MessageCircle, BarChart, Settings, Trophy, CreditCard } from "lucide-react";
import musicdottLogo from "../assets/musicdott-logo.png";
import { DevelopmentNotice } from "@/components/dev-notice";
import { getPricingText } from "@/lib/currency-utils";
import { useTranslation } from "@/lib/i18n";
import { CompactLanguageSelector } from "@/components/language/language-selector";
import { PasswordChangeDialog } from "@/components/password-change-dialog";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const pricing = getPricingText(29.95, 49.95);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // Handle authentication and password change flow
  useEffect(() => {
    console.log("🔍 Auth page useEffect - user state:", user);
    if (user) {
      if (user.mustChangePassword) {
        console.log("🔑 User must change password");
        setShowPasswordChange(true);
      } else {
        // Redirect platform owners to their separate dashboard
        if (user.role === 'platform_owner' || user.role === 'admin') {
          console.log("🚀 Platform owner logged in, navigating to owners dashboard...");
          navigate("/owners-dashboard");
        } else {
          console.log("🚀 User logged in, navigating to dashboard...");
          navigate("/");
        }
      }
    }
  }, [user, navigate]);

  // Close password change dialog when password is successfully changed
  const handlePasswordChangeClose = () => {
    setShowPasswordChange(false);
    if (user && !user.mustChangePassword) {
      // Redirect platform owners to their separate dashboard
      if (user.role === 'platform_owner' || user.role === 'admin') {
        navigate("/owners-dashboard");
      } else {
        navigate("/");
      }
    }
  };

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle login form submission
  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    console.log("🎯 Form submitted with values:", { username: values.username });
    loginMutation.mutate({
      username: values.username,
      password: values.password,
    });
  }

  return (
    <>
      <DevelopmentNotice />
      <div className="flex min-h-screen">
        {/* Left column: Login form */}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 flex items-center justify-center">
                  <img 
                    src={musicdottLogo} 
                    alt="Musicdott Logo" 
                    className="h-12 sm:h-16 w-auto" 
                  />
                </div>
                <CompactLanguageSelector />
              </div>
              <CardDescription className="text-center">
                {t('auth.welcome')} - {t('auth.loginPrompt')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Login Form */}
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.username')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.username').toLowerCase()} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.password')}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
{t('auth.login')}
                  </Button>
                </form>
              </Form>
              
              {/* Sign Up Button */}
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/signup")}
                >
{t('auth.newAccount')}
                </Button>
              </div>

              {/* Learn More Button */}
              <div className="mt-4 text-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full text-sm">
                      Learn More About MusicDott
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-medium text-center mb-2">
                        MusicDott
                      </DialogTitle>
                      <DialogDescription className="text-center text-gray-600 mb-8">
                        Thoughtfully designed for music educators
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-16">
                      {/* Hero Section */}
                      <div className="text-center">
                        <h1 className="text-4xl font-light mb-6 text-gray-900 leading-tight">
                          The Complete Music Education Platform
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
                          Designed specifically for music schools, private teachers, and students who want to focus on what truly matters: creating beautiful music together.
                        </p>
                        <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>Used by 100+ music schools</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>Built by music educators</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>GDPR compliant</span>
                          </div>
                        </div>
                      </div>

                      {/* Problem Section */}
                      <div className="bg-gray-50/50 p-8 rounded-2xl">
                        <h2 className="text-2xl font-light text-center mb-8 text-gray-900">
                          Music education shouldn't be complicated by technology
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Calendar className="h-6 w-6 text-gray-600" />
                            </div>
                            <h3 className="font-medium text-gray-900 mb-2">Scheduling Complexity</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Juggling multiple calendars, missed appointments, and endless coordination between teachers, students, and parents.
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <BarChart className="h-6 w-6 text-gray-600" />
                            </div>
                            <h3 className="font-medium text-gray-900 mb-2">Progress Tracking</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Scattered notes, forgotten assignments, and no clear overview of each student's musical journey and development.
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CreditCard className="h-6 w-6 text-gray-600" />
                            </div>
                            <h3 className="font-medium text-gray-900 mb-2">Administrative Burden</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Manual invoicing, payment tracking, and administrative tasks that take time away from actual teaching.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Solution Section */}
                      <div>
                        <h2 className="text-2xl font-light text-center mb-12 text-gray-900">
                          Everything you need, thoughtfully integrated
                        </h2>
                        
                        {/* For School Owners */}
                        <div className="mb-12">
                          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                              <Settings className="h-4 w-4 text-blue-600" />
                            </div>
                            For School Owners
                          </h3>
                          <div className="grid md:grid-cols-2 gap-6 pl-11">
                            <div className="space-y-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Users className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Complete Overview</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Monitor all teachers, students, and revenue from a single dashboard with real-time insights.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <BarChart className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Growth Analytics</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Track enrollment trends, teacher performance, and identify opportunities for expansion.
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <CreditCard className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Automated Billing</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Subscription management that scales automatically with your student count.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Settings className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Multi-Location Support</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Manage multiple locations and teaching rooms with unified scheduling and reporting.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* For Teachers */}
                        <div className="mb-12">
                          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center mr-3">
                              <Music className="h-4 w-4 text-green-600" />
                            </div>
                            For Teachers
                          </h3>
                          <div className="grid md:grid-cols-2 gap-6 pl-11">
                            <div className="space-y-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Music className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Interactive Lessons</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Create multimedia lessons with sheet music, audio files, videos, and practice exercises.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Calendar className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Smart Scheduling</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Visual calendar with conflict detection and automated reminders for students.
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <MessageCircle className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Student Communication</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Direct messaging with progress updates and assignment feedback for students and parents.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Trophy className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Progress Tracking</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Achievement milestones and detailed analytics to celebrate student progress.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* For Students */}
                        <div className="mb-12">
                          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                            <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center mr-3">
                              <Award className="h-4 w-4 text-purple-600" />
                            </div>
                            For Students
                          </h3>
                          <div className="grid md:grid-cols-2 gap-6 pl-11">
                            <div className="space-y-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Award className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Gamified Learning</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Earn achievement badges and XP points as you progress through your musical journey.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Music className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Practice Resources</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Access all your lesson materials, sheet music, and practice tracks in one place.
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <MessageCircle className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Teacher Connection</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    Ask questions, receive feedback, and stay connected with your teacher between lessons.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                  <BarChart className="h-3 w-3 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">Progress Visualization</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                    See your improvement over time with clear charts and milestone celebrations.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Social Proof */}
                      <div className="bg-gray-50/50 p-8 rounded-2xl">
                        <h2 className="text-xl font-light text-center mb-8 text-gray-900">
                          Trusted by music educators across Europe
                        </h2>
                        <div className="grid md:grid-cols-3 gap-8">
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-3">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <blockquote className="text-gray-700 italic mb-3 text-sm leading-relaxed">
                              "Our students are more engaged than ever. The achievement system keeps them motivated to practice."
                            </blockquote>
                            <p className="text-xs text-gray-500">Stefan van de Brug<br />Drum School Owner, Netherlands</p>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-3">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <blockquote className="text-gray-700 italic mb-3 text-sm leading-relaxed">
                              "The administrative features save us hours every week. Finally, we can focus on teaching."
                            </blockquote>
                            <p className="text-xs text-gray-500">Modern Music Institute<br />Rotterdam, Netherlands</p>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-3">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <blockquote className="text-gray-700 italic mb-3 text-sm leading-relaxed">
                              "The platform understands how music schools actually work. It's perfectly designed for us."
                            </blockquote>
                            <p className="text-xs text-gray-500">Guitar Academy Brussels<br />Brussels, Belgium</p>
                          </div>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div>
                        <h2 className="text-2xl font-light text-center mb-4 text-gray-900">
                          Simple, transparent pricing
                        </h2>
                        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
                          Choose the plan that fits your school size. Easily upgrade as you grow, with automatic billing that scales with your student count.
                        </p>
                        
                        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                          <div className="p-8 border border-gray-200 rounded-2xl bg-white">
                            <h3 className="font-medium mb-2 text-gray-900">Standard</h3>
                            <div className="text-4xl font-light text-gray-900 mb-6">
                              {pricing.standard}<span className="text-lg text-gray-500">/month</span>
                            </div>
                            <ul className="space-y-4 text-sm text-gray-600 mb-8">
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Up to 25 students</span>
                              </li>
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>1 teacher account</span>
                              </li>
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Unlimited lessons & content</span>
                              </li>
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Student progress tracking</span>
                              </li>
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Basic reporting & analytics</span>
                              </li>
                            </ul>
                            <Button variant="outline" className="w-full">Choose Standard</Button>
                          </div>
                          
                          <div className="p-8 border border-primary/20 rounded-2xl bg-primary/5 relative">
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <span className="bg-primary text-white text-xs px-3 py-1 rounded-full">Most Popular</span>
                            </div>
                            <h3 className="font-medium mb-2 text-gray-900">Pro</h3>
                            <div className="text-4xl font-light text-gray-900 mb-6">
                              {pricing.pro}<span className="text-lg text-gray-500">/month</span>
                            </div>
                            <ul className="space-y-4 text-sm text-gray-600 mb-8">
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Up to 50 students</span>
                              </li>
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Unlimited teacher accounts</span>
                              </li>
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Advanced analytics & insights</span>
                              </li>
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Priority support</span>
                              </li>
                              <li className="flex items-center space-x-3">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>Custom branding options</span>
                              </li>
                            </ul>
                            <Button className="w-full bg-primary hover:bg-primary/90">Choose Pro</Button>
                          </div>
                        </div>
                        
                        <div className="text-center mt-8">
                          <p className="text-sm text-gray-500 mb-2">
                            Need more students? Additional capacity: {pricing.extraStudents} per 5 students/month
                          </p>
                          <p className="text-sm text-gray-500">
                            All plans include 30-day money-back guarantee • No setup fees • Cancel anytime
                          </p>
                        </div>
                      </div>

                      {/* FAQ */}
                      <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-light text-center mb-12 text-gray-900">
                          Frequently asked questions
                        </h2>
                        <div className="space-y-6">
                          <div className="border-b border-gray-100 pb-6">
                            <h3 className="font-medium text-gray-900 mb-2">How quickly can we get started?</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              Setup takes less than 30 minutes. We'll help you import your existing student data and you can start creating lessons immediately. Our onboarding team provides personal guidance to ensure a smooth transition.
                            </p>
                          </div>
                          
                          <div className="border-b border-gray-100 pb-6">
                            <h3 className="font-medium text-gray-900 mb-2">Can we migrate from our current system?</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              Yes, we provide migration assistance for most common music school platforms. Our team will help transfer your student information, lesson content, and schedule data seamlessly.
                            </p>
                          </div>
                          
                          <div className="border-b border-gray-100 pb-6">
                            <h3 className="font-medium text-gray-900 mb-2">Is my data secure and compliant?</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              Absolutely. We're GDPR compliant and use enterprise-grade security. All data is encrypted and stored on secure European servers. You maintain full control over your school's information.
                            </p>
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-gray-900 mb-2">What support do you provide?</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              We offer comprehensive onboarding, video tutorials, and ongoing email support. Pro plan customers receive priority support with faster response times.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Final CTA */}
                      <div className="text-center bg-gray-50/50 p-12 rounded-2xl">
                        <h2 className="text-2xl font-light mb-4 text-gray-900">
                          Ready to elevate your music education?
                        </h2>
                        <p className="text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                          Join hundreds of music educators who have streamlined their teaching and administration with MusicDott. Start your free trial today.
                        </p>
                        <div className="space-y-4">
                          <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg rounded-lg">
                            Start Your Free 30-Day Trial
                          </Button>
                          <p className="text-sm text-gray-500">
                            No credit card required • Full access • Cancel anytime
                          </p>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Netherlands Footer */}
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-400">
                  Proudly built in The Netherlands 🇳🇱
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Marketing content */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary/5 to-primary/10 items-center justify-center p-8">
          <div className="max-w-lg">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold mb-4 text-gray-900">
                Transform Your Music Teaching
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                The comprehensive platform designed by music educators, for music educators. Streamline your school, engage your students, and focus on what you love: teaching music.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Student Management</h3>
                  <p className="text-gray-600">Track progress, assignments, and achievements effortlessly</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Interactive Lessons</h3>
                  <p className="text-gray-600">Create multimedia content with embedded resources</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Achievement System</h3>
                  <p className="text-gray-600">Gamified learning with badges and milestones</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Automated Billing</h3>
                  <p className="text-gray-600">Streamlined subscription management</p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flex items-center space-x-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-gray-600 ml-2">4.8/5 from 100+ educators</span>
              </div>
              <p className="text-sm text-gray-500">
                "MusicDott has transformed how we manage our music school. The student engagement features are incredible."
              </p>
              <p className="text-xs text-gray-400 mt-1">— Stefan van de Brug, Drum School Owner</p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Dialog */}
      <PasswordChangeDialog
        isOpen={showPasswordChange}
        onClose={handlePasswordChangeClose}
        isForced={!!user?.mustChangePassword}
      />
    </>
  );
}
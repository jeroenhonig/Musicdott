import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Calendar,
  Clock,
  Euro,
  CheckCircle,
  AlertTriangle,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import AppLayout from "@/components/layouts/app-layout";

interface SubscriptionStatus {
  hasAccess: boolean;
  subscriptionType: string;
  status: string;
  planName?: string;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  pricing?: {
    basePlan: {
      name: string;
      price: number;
      includedTeachers?: number;
      includedStudents: number;
    };
    additionalCosts: Array<{
      type: string;
      description: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice: number;
    }>;
    total: number;
  };
  licenseStatus?: {
    teachers?: {
      used: number;
      available: number;
      hasCapacity: boolean;
    };
    students: {
      used: number;
      available: number;
      hasCapacity: boolean;
    };
  };
}

interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  teacherLicenses: number;
  studentLicenses: number;
  features: string[];
}

interface PaymentRecord {
  id: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  billingMonth: string;
  paymentDate: string;
}

export default function BillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscriptions/status"],
  });

  // Fetch available plans
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  // Fetch billing summary
  const { data: summary, isLoading: summaryLoading } = useQuery<{
    paymentHistory: PaymentRecord[];
    user: any;
  }>({
    queryKey: ["/api/subscriptions/summary"],
  });

  // Mutation to upgrade plan
  const upgradePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await apiRequest("PUT", "/api/subscriptions/plan", { planId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/status"] });
      toast({
        title: "Plan Updated",
        description: "Your subscription plan has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update subscription plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to add extra licenses
  const addLicensesMutation = useMutation({
    mutationFn: async (extraLicenses: number) => {
      const response = await apiRequest("POST", "/api/subscriptions/extra-licenses", { extraLicenses });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/status"] });
      toast({
        title: "Licenses Added",
        description: "Extra student licenses have been added to your subscription.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Add Licenses",
        description: "Could not add extra licenses. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string, isTrialActive: boolean) => {
    if (isTrialActive) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Trial Active</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (statusLoading || plansLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Billing & Subscription">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your MusicDott subscription and billing preferences
          </p>
          </div>
          {subscriptionStatus?.isTrialActive && (
            <Alert className="max-w-md">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>{subscriptionStatus.trialDaysRemaining} days</strong> remaining in your free trial
              </AlertDescription>
            </Alert>
          )}
        </div>

      {/* Current Subscription Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionStatus?.planName || 'No Plan'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {subscriptionStatus && getStatusBadge(subscriptionStatus.status, subscriptionStatus.isTrialActive)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionStatus?.pricing ? formatPrice(subscriptionStatus.pricing.total) : '€0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on current usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">License Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscriptionStatus?.licenseStatus?.teachers && (
                <div className="flex justify-between text-sm">
                  <span>Teachers:</span>
                  <span>
                    {subscriptionStatus.licenseStatus.teachers.used}/
                    {subscriptionStatus.licenseStatus.teachers.available === -1 
                      ? '∞' 
                      : subscriptionStatus.licenseStatus.teachers.available}
                  </span>
                </div>
              )}
              {subscriptionStatus?.licenseStatus?.students && (
                <div className="flex justify-between text-sm">
                  <span>Students:</span>
                  <span>
                    {subscriptionStatus.licenseStatus.students.used}/
                    {subscriptionStatus.licenseStatus.students.available}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Pricing Breakdown */}
          {subscriptionStatus?.pricing && (
            <Card>
              <CardHeader>
                <CardTitle>Current Month Pricing</CardTitle>
                <CardDescription>
                  Your billing is automatically calculated based on actual usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <div>
                      <span className="font-medium">{subscriptionStatus.pricing.basePlan.name}</span>
                      <div className="text-sm text-muted-foreground">
                        {subscriptionStatus.pricing.basePlan.includedTeachers === -1 
                          ? 'Unlimited teachers' 
                          : `${subscriptionStatus.pricing.basePlan.includedTeachers} teachers`} • {subscriptionStatus.pricing.basePlan.includedStudents} students
                      </div>
                    </div>
                    <span className="font-medium">{formatPrice(subscriptionStatus.pricing.basePlan.price)}</span>
                  </div>

                  {subscriptionStatus.pricing.additionalCosts.map((cost, index) => (
                    <div key={index} className="flex justify-between py-2 border-b">
                      <div>
                        <span className="font-medium">{cost.description}</span>
                        {cost.quantity && (
                          <div className="text-sm text-muted-foreground">
                            {cost.quantity} × {formatPrice(cost.unitPrice || 0)}
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{formatPrice(cost.totalPrice)}</span>
                    </div>
                  ))}

                  <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
                    <span>Total Monthly</span>
                    <span>{formatPrice(subscriptionStatus.pricing.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* License Capacity Warnings */}
          {subscriptionStatus?.licenseStatus && (
            <div className="space-y-4">
              {!subscriptionStatus.licenseStatus.students?.hasCapacity && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You're at your student license limit. Consider adding extra licenses or upgrading your plan.
                  </AlertDescription>
                </Alert>
              )}

              {subscriptionStatus.licenseStatus.teachers && !subscriptionStatus.licenseStatus.teachers.hasCapacity && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You've exceeded your teacher license limit. We've automatically upgraded you to the Pro plan.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans?.map((plan) => (
              <Card key={plan.id} className={subscriptionStatus?.planName === plan.name ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{plan.displayName}</CardTitle>
                      <CardDescription className="mt-2">{plan.description}</CardDescription>
                    </div>
                    {subscriptionStatus?.planName === plan.name && (
                      <Badge>Current Plan</Badge>
                    )}
                  </div>
                  <div className="text-3xl font-bold">{formatPrice(plan.priceMonthly)}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {subscriptionStatus?.planName !== plan.name && (
                    <Button 
                      onClick={() => upgradePlanMutation.mutate(plan.id)}
                      disabled={upgradePlanMutation.isPending}
                      className="w-full"
                    >
                      {upgradePlanMutation.isPending ? 'Updating...' : 'Switch to this plan'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Extra Licenses */}
          <Card>
            <CardHeader>
              <CardTitle>Extra Student Licenses</CardTitle>
              <CardDescription>
                Add more student licenses beyond your plan's limit at €4.50 per 5 students per month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => addLicensesMutation.mutate(5)}
                  disabled={addLicensesMutation.isPending}
                >
                  Add 5 licenses (+€4.50/month)
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => addLicensesMutation.mutate(10)}
                  disabled={addLicensesMutation.isPending}
                >
                  Add 10 licenses (+€9.00/month)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Your recent billing and payment records</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : summary?.paymentHistory?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.paymentHistory.map((payment: PaymentRecord) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>{formatPrice(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'succeeded' ? 'default' : 'destructive'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payment history available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}
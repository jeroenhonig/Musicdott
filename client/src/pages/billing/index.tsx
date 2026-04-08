import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
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
  const { t } = useTranslation();
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
        title: t('billing.toast.planUpdated'),
        description: t('billing.toast.planUpdatedDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('billing.toast.planUpdateFailed'),
        description: t('billing.toast.planUpdateFailedDescription'),
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
        title: t('billing.toast.licensesAdded'),
        description: t('billing.toast.licensesAddedDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('billing.toast.licensesAddFailed'),
        description: t('billing.toast.licensesAddFailedDescription'),
        variant: "destructive",
      });
    },
  });

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string, isTrialActive: boolean) => {
    if (isTrialActive) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">{t('billing.status.trialActive')}</Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t('billing.status.active')}</Badge>;
      case 'past_due':
        return <Badge variant="destructive">{t('billing.status.pastDue')}</Badge>;
      case 'canceled':
        return <Badge variant="secondary">{t('billing.status.canceled')}</Badge>;
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
    <AppLayout title={t('billing.title')}>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold">{t('billing.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('billing.subtitle')}
          </p>
          </div>
          {subscriptionStatus?.isTrialActive && (
            <Alert className="max-w-md">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>{subscriptionStatus.trialDaysRemaining} days</strong> {t('billing.trialRemaining')}
              </AlertDescription>
            </Alert>
          )}
        </div>

      {/* Current Subscription Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('billing.currentPlan')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionStatus?.planName || t('billing.noPlan')}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {subscriptionStatus && getStatusBadge(subscriptionStatus.status, subscriptionStatus.isTrialActive)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('billing.monthlyCost')}</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionStatus?.pricing ? formatPrice(subscriptionStatus.pricing.total) : '€0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('billing.basedOnUsage')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('billing.licenseUsage')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscriptionStatus?.licenseStatus?.teachers && (
                <div className="flex justify-between text-sm">
                  <span>{t('billing.teachers')}</span>
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
                  <span>{t('billing.students')}</span>
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
          <TabsTrigger value="overview">{t('billing.tab.overview')}</TabsTrigger>
          <TabsTrigger value="plans">{t('billing.tab.plans')}</TabsTrigger>
          <TabsTrigger value="history">{t('billing.tab.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Pricing Breakdown */}
          {subscriptionStatus?.pricing && (
            <Card>
              <CardHeader>
                <CardTitle>{t('billing.overview.pricingTitle')}</CardTitle>
                <CardDescription>
                  {t('billing.overview.pricingDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <div>
                      <span className="font-medium">{subscriptionStatus.pricing.basePlan.name}</span>
                      <div className="text-sm text-muted-foreground">
                        {subscriptionStatus.pricing.basePlan.includedTeachers === -1
                          ? t('billing.overview.unlimitedTeachers')
                          : `${subscriptionStatus.pricing.basePlan.includedTeachers} ${t('billing.overview.teachers')}`} • {subscriptionStatus.pricing.basePlan.includedStudents} {t('billing.overview.studentsLabel')}
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
                    <span>{t('billing.overview.totalMonthly')}</span>
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
                    {t('billing.overview.studentLimitWarning')}
                  </AlertDescription>
                </Alert>
              )}

              {subscriptionStatus.licenseStatus.teachers && !subscriptionStatus.licenseStatus.teachers.hasCapacity && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('billing.overview.teacherLimitWarning')}
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
                      <Badge>{t('billing.plans.currentPlanBadge')}</Badge>
                    )}
                  </div>
                  <div className="text-3xl font-bold">{formatPrice(plan.priceMonthly)}</div>
                  <div className="text-sm text-muted-foreground">{t('billing.plans.perMonth')}</div>
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
                      {upgradePlanMutation.isPending ? t('billing.plans.updating') : t('billing.plans.switchTo')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Extra Licenses */}
          <Card>
            <CardHeader>
              <CardTitle>{t('billing.plans.extraLicensesTitle')}</CardTitle>
              <CardDescription>
                {t('billing.plans.extraLicensesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => addLicensesMutation.mutate(5)}
                  disabled={addLicensesMutation.isPending}
                >
                  {t('billing.plans.add5Licenses')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => addLicensesMutation.mutate(10)}
                  disabled={addLicensesMutation.isPending}
                >
                  {t('billing.plans.add10Licenses')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('billing.history.title')}</CardTitle>
              <CardDescription>{t('billing.history.description')}</CardDescription>
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
                      <TableHead>{t('billing.history.colDate')}</TableHead>
                      <TableHead>{t('billing.history.colDescription')}</TableHead>
                      <TableHead>{t('billing.history.colAmount')}</TableHead>
                      <TableHead>{t('billing.history.colStatus')}</TableHead>
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
                  {t('billing.history.empty')}
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
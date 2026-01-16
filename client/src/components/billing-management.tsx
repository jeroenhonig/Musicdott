import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  CreditCard, 
  DollarSign,
  Activity,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Play,
  Zap,
  XCircle,
  FileText,
  Send,
  Download,
  Edit,
  Plus,
  RotateCcw,
  Euro
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BillingHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'error';
  message: string;
  lastBilling?: string;
  nextBilling: string;
  alerts: number;
  stripeStatus: 'connected' | 'not_configured';
}

interface BillingAlert {
  id: number;
  schoolId?: number;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  isResolved: boolean;
  createdAt: string;
  metadata?: any;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  dueDate: string;
  createdAt: string;
  paidAt: string | null;
  invoicePdf: string;
  hostedInvoiceUrl: string;
}

interface SchoolPricing {
  schoolId: number;
  schoolName: string;
  currentPlan: string;
  monthlyPrice: number;
  status: string;
  stripeCustomerId: string;
  creditBalance: number;
  nextBillingDate: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  description: string;
  refundable: boolean;
}

interface Refund {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  paymentIntentId: string;
  createdAt: string;
}

export default function BillingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(12);
  const [priceDialog, setPriceDialog] = useState(false);
  const [creditDialog, setCreditDialog] = useState(false);
  const [refundDialog, setRefundDialog] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [refundPaymentId, setRefundPaymentId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [selectedPricing, setSelectedPricing] = useState<SchoolPricing | null>(null);
  
  const { data: billingHealth, isLoading: healthLoading } = useQuery<BillingHealth>({
    queryKey: ["/api/admin/billing/health"],
    refetchInterval: 30000,
  });

  const { data: billingAlerts } = useQuery<BillingAlert[]>({
    queryKey: ["/api/admin/billing/alerts"],
    refetchInterval: 10000,
  });

  const { data: invoicesData } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["/api/admin/billing/invoices"],
  });

  const { data: pricingData } = useQuery<{ pricing: SchoolPricing[] }>({
    queryKey: ["/api/admin/billing/pricing"],
  });

  const { data: paymentsData } = useQuery<{ payments: Payment[] }>({
    queryKey: ["/api/admin/billing/payments"],
  });

  const { data: refundsData } = useQuery<{ refunds: Refund[] }>({
    queryKey: ["/api/admin/billing/refunds"],
  });

  const manualBillingMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      const res = await apiRequest("POST", `/api/admin/billing/manual-trigger/${schoolId}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "Billing Successful" : "Billing Failed",
        description: data.success ? `Processed €${(data.amount / 100).toFixed(2)}` : data.error,
        variant: data.success ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("POST", `/api/admin/billing/invoices/${invoiceId}/send`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Sent", description: "Invoice has been sent to the customer" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices"] });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ schoolId, monthlyPrice, reason }: { schoolId: number; monthlyPrice: number; reason: string }) => {
      const res = await apiRequest("PUT", `/api/admin/billing/pricing/${schoolId}`, { monthlyPrice, reason });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Price Updated",
        description: `Price changed from €${data.oldPrice?.toFixed(2) || '0'} to €${data.newPrice?.toFixed(2) || '0'}`,
      });
      setPriceDialog(false);
      setNewPrice("");
      setPriceReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/pricing"] });
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Could not update price", variant: "destructive" });
    },
  });

  const applyCreditMutation = useMutation({
    mutationFn: async ({ schoolId, amount, reason }: { schoolId: number; amount: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/billing/pricing/${schoolId}/credit`, { amount, reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Credit Applied", description: `€${creditAmount} credit has been applied` });
      setCreditDialog(false);
      setCreditAmount("");
      setCreditReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/pricing"] });
    },
    onError: (error: any) => {
      toast({ title: "Credit Failed", description: error.message || "Could not apply credit", variant: "destructive" });
    },
  });

  const issueRefundMutation = useMutation({
    mutationFn: async ({ paymentIntentId, amount, reason }: { paymentIntentId: string; amount: number | null; reason: string }) => {
      const res = await apiRequest("POST", "/api/admin/billing/refunds", { paymentIntentId, amount, reason });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Refund Issued", description: `Refunded €${data.amount?.toFixed(2) || '0'}` });
      setRefundDialog(false);
      setRefundPaymentId("");
      setRefundAmount("");
      setRefundReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/refunds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/payments"] });
    },
    onError: (error: any) => {
      toast({ title: "Refund Failed", description: error.message || "Could not issue refund", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'paid': case 'succeeded': return 'bg-green-100 text-green-800';
      case 'degraded': case 'open': case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'critical': case 'uncollectible': case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className={`h-5 w-5 ${billingHealth?.status === 'healthy' ? 'text-green-500' : 'text-yellow-500'}`} />
              <div>
                <p className="text-sm font-medium">System Status</p>
                <p className="text-xs text-muted-foreground capitalize">{billingHealth?.status || 'Loading...'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Invoices</p>
                <p className="text-xs text-muted-foreground">{invoicesData?.invoices?.length || 0} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Payments</p>
                <p className="text-xs text-muted-foreground">{paymentsData?.payments?.length || 0} recent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Active Alerts</p>
                <p className="text-xs text-muted-foreground">{billingAlerts?.filter(a => !a.isResolved).length || 0} unresolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
          <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="refunds" data-testid="tab-refunds">Refunds</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Stripe Invoices</span>
              </CardTitle>
              <CardDescription>View and manage all invoices from Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesData?.invoices?.length ? (
                <div className="space-y-3">
                  {invoicesData.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`invoice-${invoice.id}`}>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{invoice.number || invoice.id}</span>
                          <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{invoice.customerName || invoice.customerEmail}</p>
                        <p className="text-xs text-muted-foreground">Created: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-medium text-lg">{formatCurrency(invoice.amountDue)}</p>
                        <div className="flex space-x-2">
                          {invoice.invoicePdf && (
                            <Button size="sm" variant="outline" onClick={() => window.open(invoice.invoicePdf, '_blank')}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => sendInvoiceMutation.mutate(invoice.id)} disabled={sendInvoiceMutation.isPending}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No invoices found. Stripe may not be configured or no invoices exist.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>School Pricing</CardTitle>
              <CardDescription>Manage subscription pricing for each school</CardDescription>
            </CardHeader>
            <CardContent>
              {pricingData?.pricing?.length ? (
                <div className="space-y-3">
                  {pricingData.pricing.map((school) => (
                    <div key={school.schoolId} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`pricing-${school.schoolId}`}>
                      <div className="space-y-1">
                        <p className="font-medium">{school.schoolName}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{school.currentPlan}</Badge>
                          <Badge className={getStatusColor(school.status)}>{school.status}</Badge>
                        </div>
                        {school.creditBalance > 0 && (
                          <p className="text-xs text-green-600">Credit balance: {formatCurrency(school.creditBalance)}</p>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-medium text-lg">{formatCurrency(school.monthlyPrice || 0)}<span className="text-sm text-muted-foreground">/mo</span></p>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedPricing(school); setNewPrice(String(school.monthlyPrice || 0)); setPriceDialog(true); }}>
                            <Edit className="h-4 w-4 mr-1" /> Price
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedPricing(school); setCreditDialog(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Credit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No school pricing found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Payments</span>
                <Button size="sm" variant="outline" onClick={() => setRefundDialog(true)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Issue Refund
                </Button>
              </CardTitle>
              <CardDescription>View payment history from Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsData?.payments?.length ? (
                <div className="space-y-3">
                  {paymentsData.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`payment-${payment.id}`}>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">{payment.id.slice(0, 20)}...</span>
                          <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{payment.description || 'No description'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-medium text-lg">{formatCurrency(payment.amount)}</p>
                        {payment.refundable && (
                          <Button size="sm" variant="outline" onClick={() => { setRefundPaymentId(payment.id); setRefundAmount(String(payment.amount)); setRefundDialog(true); }}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No payments found. Stripe may not be configured.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Refund History</CardTitle>
              <CardDescription>View all refunds issued through Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              {refundsData?.refunds?.length ? (
                <div className="space-y-3">
                  {refundsData.refunds.map((refund) => (
                    <div key={refund.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`refund-${refund.id}`}>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">{refund.id.slice(0, 20)}...</span>
                          <Badge className={getStatusColor(refund.status)}>{refund.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{refund.reason || 'No reason provided'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(refund.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg text-red-600">-{formatCurrency(refund.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No refunds found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Alerts</CardTitle>
              <CardDescription>Monitor and resolve billing issues</CardDescription>
            </CardHeader>
            <CardContent>
              {billingAlerts && billingAlerts.length > 0 ? (
                <div className="space-y-3">
                  {billingAlerts.map((alert) => (
                    <div key={alert.id} className={`p-4 border rounded-lg ${alert.isResolved ? 'opacity-50' : ''}`} data-testid={`alert-${alert.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(alert.severity)}>{alert.severity}</Badge>
                          <span className="font-medium">{alert.title}</span>
                        </div>
                        {alert.isResolved && <Badge variant="outline">Resolved</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No billing alerts</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={priceDialog} onOpenChange={setPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Pricing</DialogTitle>
            <DialogDescription>Change the monthly price for {selectedPricing?.schoolName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Monthly Price (EUR)</Label>
              <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="49.95" data-testid="input-new-price" />
            </div>
            <div className="space-y-2">
              <Label>Reason for Change</Label>
              <Input value={priceReason} onChange={(e) => setPriceReason(e.target.value)} placeholder="Plan upgrade, discount, etc." data-testid="input-price-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedPricing && updatePriceMutation.mutate({ schoolId: selectedPricing.schoolId, monthlyPrice: parseFloat(newPrice), reason: priceReason })} disabled={updatePriceMutation.isPending} data-testid="button-update-price">
              {updatePriceMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creditDialog} onOpenChange={setCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Credit</DialogTitle>
            <DialogDescription>Add account credit for {selectedPricing?.schoolName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Credit Amount (EUR)</Label>
              <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="10.00" data-testid="input-credit-amount" />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="Service issue compensation, etc." data-testid="input-credit-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedPricing && applyCreditMutation.mutate({ schoolId: selectedPricing.schoolId, amount: parseFloat(creditAmount), reason: creditReason })} disabled={applyCreditMutation.isPending} data-testid="button-apply-credit">
              {applyCreditMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialog} onOpenChange={setRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>Refund a payment through Stripe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Intent ID</Label>
              <Input value={refundPaymentId} onChange={(e) => setRefundPaymentId(e.target.value)} placeholder="pi_xxxxxxxxxxxxx" data-testid="input-refund-payment-id" />
            </div>
            <div className="space-y-2">
              <Label>Amount (EUR) - leave empty for full refund</Label>
              <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="Optional - partial refund" data-testid="input-refund-amount" />
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Customer requested, service issue, etc." data-testid="input-refund-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(false)}>Cancel</Button>
            <Button onClick={() => issueRefundMutation.mutate({ paymentIntentId: refundPaymentId, amount: refundAmount ? parseFloat(refundAmount) : null, reason: refundReason })} disabled={issueRefundMutation.isPending || !refundPaymentId || !refundReason} variant="destructive" data-testid="button-issue-refund">
              {issueRefundMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

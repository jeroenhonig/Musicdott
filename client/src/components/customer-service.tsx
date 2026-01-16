import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, KeyRound, CreditCard, Activity, Search, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  school_name?: string;
  school_id?: number;
  student_count?: number;
  lesson_count?: number;
}

interface Invoice {
  id: number;
  school_id: number;
  school_name: string;
  school_email: string;
  payment_status: string;
  current_plan: string;
  last_billing_amount: number;
  next_billing_amount: number;
  next_billing_date: string;
}

interface AuditLog {
  id: number;
  actor_username: string;
  actor_name: string;
  target_type: string;
  target_id: number;
  action: string;
  metadata: any;
  created_at: string;
}

export default function CustomerService() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [passwordResetDialog, setPasswordResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("all");

  // Fetch users
  const { data: usersData, refetch: refetchUsers } = useQuery<{ users: User[] }>({
    queryKey: ["/api/owners/users", { search: searchQuery }],
    enabled: searchQuery.length >= 2,
  });

  // Fetch invoices
  const { data: invoicesData } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["/api/platform/billing", { status: invoiceFilter !== "all" ? invoiceFilter : undefined }],
  });

  // Fetch audit log
  const { data: auditData } = useQuery<{ auditLog: AuditLog[] }>({
    queryKey: ["/api/platform/audit-log", { limit: 50 }],
  });

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (data: { userId: number; newPassword: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/platform/users/${data.userId}/reset-password`, { 
        newPassword: data.newPassword, 
        reason: data.reason 
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Password Reset Successful",
        description: `Password reset for user ${data.username || selectedUser?.username}. They must change it on next login.`,
      });
      setPasswordResetDialog(false);
      setNewPassword("");
      setResetReason("");
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Password Reset Failed",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update billing status mutation
  const updateBillingMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/platform/billing/${data.id}/status`, { status: data.status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Billing Status Updated",
        description: "Payment status has been updated successfully.",
      });
    },
  });

  const handlePasswordReset = () => {
    if (!selectedUser || !newPassword || newPassword.length < 8) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    passwordResetMutation.mutate({
      userId: selectedUser.id,
      newPassword,
      reason: resetReason,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount / 100);
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      current: "default",
      overdue: "destructive",
      suspended: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-user-management">
            <Users className="h-4 w-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing-invoices">
            <CreditCard className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit-log">
            <Activity className="h-4 w-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management & Password Reset</CardTitle>
              <CardDescription>Search for users and perform customer service actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="search">Search Users</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="search"
                      placeholder="Search by name, username, or email (min 2 characters)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-user-search"
                    />
                    <Button variant="outline" size="icon" data-testid="button-search">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {usersData?.users?.map((user: User) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`user-item-${user.id}`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium">{user.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        @{user.username} • {user.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role}</Badge>
                        {user.school_name && (
                          <span className="text-xs text-muted-foreground">{user.school_name}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setPasswordResetDialog(true);
                      }}
                      data-testid={`button-reset-password-${user.id}`}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                  </div>
                ))}

                {searchQuery.length >= 2 && !usersData?.users?.length && (
                  <p className="text-center text-muted-foreground py-8">
                    No users found matching "{searchQuery}"
                  </p>
                )}

                {searchQuery.length < 2 && (
                  <p className="text-center text-muted-foreground py-8">
                    Enter at least 2 characters to search for users
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice & Payment Management</CardTitle>
              <CardDescription>View and manage school invoices and payment statuses</CardDescription>
              <div className="flex gap-2 mt-4">
                <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-invoice-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Invoices</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoicesData?.invoices?.map((invoice: Invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`invoice-item-${invoice.id}`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium">{invoice.school_name}</h4>
                      <p className="text-sm text-muted-foreground">{invoice.school_email}</p>
                      <div className="flex items-center gap-2">
                        {getPaymentStatusBadge(invoice.payment_status)}
                        <span className="text-xs text-muted-foreground">
                          Next billing: {new Date(invoice.next_billing_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="font-medium">{formatCurrency(invoice.next_billing_amount)}</div>
                      <Select
                        value={invoice.payment_status}
                        onValueChange={(status) =>
                          updateBillingMutation.mutate({ id: invoice.id, status })
                        }
                      >
                        <SelectTrigger className="w-[140px]" data-testid={`select-payment-status-${invoice.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">Current</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                {!invoicesData?.invoices?.length && (
                  <p className="text-center text-muted-foreground py-8">No invoices found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Action Audit Log</CardTitle>
              <CardDescription>Track all platform owner actions and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditData?.auditLog?.map((log: AuditLog) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                    data-testid={`audit-item-${log.id}`}
                  >
                    <div className="p-2 bg-blue-100 rounded-full mt-1">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="text-sm text-muted-foreground">{log.target_type}</span>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">{log.actor_name}</span> performed {log.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}

                {!auditData?.auditLog?.length && (
                  <p className="text-center text-muted-foreground py-8">No audit logs found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Reset Dialog */}
      <Dialog open={passwordResetDialog} onOpenChange={setPasswordResetDialog}>
        <DialogContent data-testid="dialog-password-reset">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.name} (@{selectedUser?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="Customer support ticket #..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                data-testid="input-reset-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordResetDialog(false)} data-testid="button-cancel-reset">
              Cancel
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={passwordResetMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {passwordResetMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

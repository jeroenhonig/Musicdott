import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Activity, 
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCog,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PlatformOwnerLayoutProps {
  children: ReactNode;
  title: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/owners-dashboard" },
  { id: "schools", label: "Schools", icon: Building2, href: "/owners-dashboard?tab=schools" },
  { id: "users", label: "Users", icon: Users, href: "/owners-dashboard?tab=users" },
  { id: "customer-service", label: "Customer Service", icon: UserCog, href: "/owners-dashboard?tab=customer-service" },
  { id: "billing", label: "Billing", icon: CreditCard, href: "/owners-dashboard?tab=billing" },
  { id: "audit-log", label: "Audit Log", icon: History, href: "/owners-dashboard?tab=audit-log" },
];

export default function PlatformOwnerLayout({ 
  children, 
  title, 
  activeTab = "overview",
  onTabChange
}: PlatformOwnerLayoutProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      setLocation("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    if (onTabChange) {
      onTabChange(item.id);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden lg:flex lg:flex-shrink-0 lg:w-64 bg-slate-800 border-r border-slate-700">
          <div className="flex flex-col w-full">
            <div className="flex items-center h-16 px-4 border-b border-slate-700">
              <ShieldCheck className="h-8 w-8 text-indigo-400 mr-2" />
              <div>
                <span className="text-lg font-bold text-white">MusicDott</span>
                <span className="text-xs text-indigo-400 block">Platform Admin</span>
              </div>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    )}
                    data-testid={`nav-${item.id}`}
                  >
                    <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-slate-400")} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-700">
              <Link href="/dashboard">
                <Button variant="outline" className="w-full mb-2 border-slate-600 text-slate-300 hover:bg-slate-700" data-testid="btn-back-to-app">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Back to App
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={handleLogout}
                data-testid="btn-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="lg:hidden bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <ShieldCheck className="h-6 w-6 text-indigo-400 mr-2" />
              <span className="text-lg font-bold text-white">Platform Admin</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-300 hover:text-white"
              data-testid="btn-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </header>

          {mobileMenuOpen && (
            <div className="lg:hidden bg-slate-800 border-b border-slate-700 px-2 py-2">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg mb-1",
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
              <div className="border-t border-slate-700 mt-2 pt-2">
                <Link href="/dashboard">
                  <Button variant="ghost" className="w-full justify-start text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Back to App
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-y-auto bg-slate-900">
            <div className="py-6 px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">{title}</h1>
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

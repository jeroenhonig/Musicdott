/**
 * AI Dashboard Page
 */

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { AIDashboard } from "@/components/ai/ai-dashboard";

export default function AIDashboardPage() {
  const { user } = useAuth();
  
  return (
    <div>
      {!user ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access AI features</p>
          </div>
        </div>
      ) : (
        <AIDashboard userRole={user.role as any} userId={user.id} />
      )}
    </div>
  );
}
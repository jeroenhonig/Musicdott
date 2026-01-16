import React from 'react';
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layouts/app-layout";

// Simple test component to isolate React error #310
export default function TestLessonView() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Test Lesson View</h1>
        <p>This is a test component to verify basic functionality.</p>
        <Button>Test Button</Button>
      </div>
    </AppLayout>
  );
}
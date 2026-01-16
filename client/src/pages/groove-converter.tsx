/**
 * GrooveScribe Converter Page
 * Comprehensive GrooveScribe link/query to iframe converter
 */

import React from "react";
import { GrooveConverter } from "@/components/groove/groove-auto-embed";

export default function GrooveConverterPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GrooveScribe Auto-Embed Tool
          </h1>
          <p className="text-gray-600">
            Convert GrooveScribe links and patterns to safe, embeddable iframes
          </p>
        </div>
        
        <GrooveConverter />
        
        <div className="mt-12 bg-white rounded-lg p-6 border">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900">✅ Automatic Paste Detection</h3>
              <p>Paste GrooveScribe links anywhere in MusicDott and they auto-convert to interactive embeds</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">🔒 Safe URL Encoding</h3>
              <p>Automatically encodes pipes (|) and special characters to prevent iframe breaks</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">🎯 Multi-Format Support</h3>
              <p>Supports full URLs, query strings, and bare parameters from multiple GrooveScribe hosts</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">📱 Responsive Design</h3>
              <p>Generated embeds work perfectly on desktop, tablet, and mobile devices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
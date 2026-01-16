import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cookie, Settings, X } from "lucide-react";

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: false,
      preferences: true,
      timestamp: new Date().toISOString()
    }));
    setShowConsent(false);
  };

  const handleDeclineAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString()
    }));
    setShowConsent(false);
  };

  const handleCustomSettings = () => {
    setShowSettings(true);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="border-2 border-blue-500/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <Cookie className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-sm mb-1">Cookie Settings</h3>
              <p className="text-xs text-muted-foreground">
                We use cookies to enhance your experience and analyze platform usage. 
                You can manage your preferences below.
              </p>
            </div>
          </div>

          {!showSettings ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Necessary
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                  Analytics
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                  Preferences
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAcceptAll}
                  size="sm" 
                  className="flex-1"
                >
                  Accept All
                </Button>
                <Button 
                  onClick={handleDeclineAll}
                  variant="outline" 
                  size="sm"
                >
                  Decline
                </Button>
                <Button 
                  onClick={handleCustomSettings}
                  variant="ghost" 
                  size="sm"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span>Necessary Cookies</span>
                  <Badge variant="default" className="text-xs">Required</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Analytics Cookies</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Preference Cookies</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAcceptAll}
                  size="sm" 
                  className="flex-1"
                >
                  Save Settings
                </Button>
                <Button 
                  onClick={() => setShowSettings(false)}
                  variant="ghost" 
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
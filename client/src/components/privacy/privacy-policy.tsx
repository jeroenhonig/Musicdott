import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Trash2, Download, AlertCircle } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Privacy Policy & GDPR Compliance
          </CardTitle>
          <CardDescription>
            Last updated: {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Data We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge variant="outline" className="mb-2">Account Information</Badge>
                <p className="text-sm text-muted-foreground">
                  Username, email address, name, role (teacher/student/school owner), 
                  and encrypted password for authentication purposes.
                </p>
              </div>
              
              <div>
                <Badge variant="outline" className="mb-2">Educational Content</Badge>
                <p className="text-sm text-muted-foreground">
                  Lessons, songs, assignments, and practice session data to provide 
                  music education services.
                </p>
              </div>

              <div>
                <Badge variant="outline" className="mb-2">Usage Data</Badge>
                <p className="text-sm text-muted-foreground">
                  Login times, platform usage analytics, and interaction data to 
                  improve our services.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                How We Use Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm">Provide music education platform services</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm">Manage user accounts and authentication</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm">Enable teacher-student communication</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm">Process payments and manage subscriptions</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights Under GDPR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Eye className="w-4 h-4 mt-1 text-blue-600" />
                <div>
                  <p className="font-medium">Right to Access</p>
                  <p className="text-sm text-muted-foreground">
                    Request a copy of your personal data we process
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Download className="w-4 h-4 mt-1 text-green-600" />
                <div>
                  <p className="font-medium">Right to Portability</p>
                  <p className="text-sm text-muted-foreground">
                    Export your data in a machine-readable format
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Trash2 className="w-4 h-4 mt-1 text-red-600" />
                <div>
                  <p className="font-medium">Right to Erasure</p>
                  <p className="text-sm text-muted-foreground">
                    Request deletion of your personal data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 mt-1 text-orange-600" />
                <div>
                  <p className="font-medium">Right to Rectification</p>
                  <p className="text-sm text-muted-foreground">
                    Correct inaccurate personal data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 mt-1 text-green-600" />
                <p className="text-sm">All data encrypted in transit and at rest</p>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 mt-1 text-blue-600" />
                <p className="text-sm">Secure authentication with session management</p>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 mt-1 text-orange-600" />
                <p className="text-sm">Regular security audits and monitoring</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Controller</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">
                <strong>MusicDott B.V.</strong><br />
                Registered in The Netherlands<br />
                Email: privacy@musicdott.app<br />
                Data Protection Officer: dpo@musicdott.app
              </p>
              <p className="text-sm text-muted-foreground">
                For any privacy-related questions or to exercise your rights, 
                contact us at the above email address.
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
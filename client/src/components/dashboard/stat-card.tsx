import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Link } from "wouter";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  linkText: string;
  linkHref: string;
  color: 'primary' | 'secondary' | 'accent' | 'success';
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  linkText, 
  linkHref,
  color
}: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary text-white',
    secondary: 'bg-blue-500 text-white',
    accent: 'bg-amber-500 text-white',
    success: 'bg-emerald-500 text-white'
  };
  
  const linkColorClasses = {
    primary: 'text-primary hover:text-primary-700',
    secondary: 'text-blue-500 hover:text-blue-700',
    accent: 'text-amber-500 hover:text-amber-700',
    success: 'text-emerald-500 hover:text-emerald-700'
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-3 ${colorClasses[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {title}
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">{value}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-4 py-3 sm:px-6">
        <div className="text-sm">
          <Link href={linkHref}>
            <a className={`font-medium ${linkColorClasses[color]}`}>
              {linkText}<span className="sr-only"> {title}</span>
            </a>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';

export interface MetadataBadge {
  icon?: LucideIcon;
  label: string;
  variant?: 'secondary' | 'outline' | 'default';
}

interface StudentContentHeaderProps {
  title: string;
  subtitle?: string;
  badges?: MetadataBadge[];
  backHref?: string;
}

export default function StudentContentHeader({
  title,
  subtitle,
  badges = [],
  backHref,
}: StudentContentHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 mt-1 text-base">{subtitle}</p>
          )}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {badges.map((badge, i) => {
                const Icon = badge.icon;
                return (
                  <Badge key={i} variant={badge.variant ?? 'outline'} className="text-xs">
                    {Icon && <Icon className="h-3 w-3 mr-1" />}
                    {badge.label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="flex-shrink-0 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
    </div>
  );
}

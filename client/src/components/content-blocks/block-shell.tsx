import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBlockContext } from './block-context';

interface BlockShellProps {
  title?: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;   // e.g. 'text-blue-600'
  accentBorder: string;  // e.g. 'border-blue-200'
  borderLeft?: string;   // e.g. 'border-l-blue-500' for lesson context
  children: React.ReactNode;
  id?: string;
}

export default function BlockShell({
  title,
  description,
  icon: Icon,
  accentColor,
  accentBorder,
  borderLeft,
  children,
  id,
}: BlockShellProps) {
  const context = useBlockContext();

  if (context === 'song') {
    return (
      <div
        id={id}
        className={`mb-6 pb-6 border-b last:border-b-0 border-gray-200`}
      >
        {title && (
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`h-5 w-5 ${accentColor}`} />
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          </div>
        )}
        {description && (
          <p className="text-sm text-gray-600 mb-3">{description}</p>
        )}
        {children}
      </div>
    );
  }

  // Lesson context: Card with colored border accent
  return (
    <Card
      id={id}
      className={`border-2 ${accentBorder} shadow-sm ${borderLeft ? `border-l-4 ${borderLeft}` : ''}`}
    >
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`h-5 w-5 ${accentColor}`} />
            {title}
          </CardTitle>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className={title ? '' : 'pt-6'}>
        {children}
      </CardContent>
    </Card>
  );
}

import { Check, ChevronsUpDown, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

interface SchoolPickerProps {
  className?: string;
  placeholder?: string;
  showRoleBadge?: boolean;
}

export default function SchoolPicker({ 
  className, 
  placeholder = "Select school...",
  showRoleBadge = true 
}: SchoolPickerProps) {
  const [open, setOpen] = useState(false);
  const { schools, currentSchool, switchSchool, schoolsLoading } = useAuth();

  // Don't show picker if user has no schools or only one school
  if (schoolsLoading || schools.length <= 1) {
    return null;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default' as const;
      case 'teacher':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'teacher':
        return 'Teacher';
      default:
        return role;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[300px] justify-between', className)}
          data-testid="school-picker-trigger"
        >
          <div className="flex items-center gap-2 truncate">
            <Building className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {currentSchool?.name || placeholder}
            </span>
            {showRoleBadge && currentSchool?.membership && (
              <Badge 
                variant={getRoleBadgeVariant(currentSchool.membership.role)}
                className="text-xs"
              >
                {getRoleDisplay(currentSchool.membership.role)}
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search schools..." />
          <CommandEmpty>No schools found.</CommandEmpty>
          <CommandGroup>
            {schools.map((school) => (
              <CommandItem
                key={school.id}
                value={school.name}
                onSelect={() => {
                  switchSchool(school.id);
                  setOpen(false);
                }}
                className="flex items-center justify-between"
                data-testid={`school-option-${school.id}`}
              >
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="truncate">{school.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {showRoleBadge && (
                    <Badge 
                      variant={getRoleBadgeVariant(school.membership.role)}
                      className="text-xs"
                    >
                      {getRoleDisplay(school.membership.role)}
                    </Badge>
                  )}
                  <Check
                    className={cn(
                      'h-4 w-4',
                      currentSchool?.id === school.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
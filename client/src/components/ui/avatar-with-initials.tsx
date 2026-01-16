import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarWithInitialsProps {
  name: string;
  imageSrc?: string;
  size?: 'sm' | 'md' | 'lg';
  bgColor?: string;
}

export default function AvatarWithInitials({ 
  name, 
  imageSrc, 
  size = 'md',
  bgColor
}: AvatarWithInitialsProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };
  
  const initials = getInitials(name);
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg'
  };
  
  const avatarClasses = `${sizeClasses[size]} ${bgColor ? '' : ''}`;
  const fallbackClasses = bgColor ? `bg-${bgColor} text-white` : '';
  
  return (
    <Avatar className={avatarClasses}>
      <AvatarImage src={imageSrc} alt={name} />
      <AvatarFallback className={fallbackClasses}>{initials}</AvatarFallback>
    </Avatar>
  );
}

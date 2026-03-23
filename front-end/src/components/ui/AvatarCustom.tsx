import { memo } from 'react';
import { Avatar as ShadcnAvatar, AvatarFallback, AvatarImage } from './avatar';
import './AvatarCustom.css';

interface AvatarCustomProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizeClasses = {
  sm: 'avatar-custom--sm',
  md: 'avatar-custom--md',
  lg: 'avatar-custom--lg',
  xl: 'avatar-custom--xl',
} as const;

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AvatarCustom = memo(({ 
  name, 
  src, 
  size = 'md', 
  status,
  className = '' 
}: AvatarCustomProps) => {
  const initials = getInitials(name);

  return (
    <div className={`avatar-custom-wrapper ${sizeClasses[size]} ${className}`}>
      <ShadcnAvatar className="avatar-custom">
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback className="avatar-custom__fallback">
          {initials}
        </AvatarFallback>
      </ShadcnAvatar>
      {status && (
        <span className={`avatar-custom__status avatar-custom__status--${status}`} />
      )}
    </div>
  );
});

AvatarCustom.displayName = 'AvatarCustom';

export default AvatarCustom;

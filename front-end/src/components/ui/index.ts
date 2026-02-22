// Custom components with default exports
export { default as Icon } from './Icon';
export { default as Spinner } from './Spinner';
export { default as Modal } from './Modal';
export { default as EmptyState } from './EmptyState';
export { default as Toggle } from './Toggle';
export { default as Dropdown } from './Dropdown';
export { default as Avatar } from './AvatarCustom';
export { ToastProvider, useToast } from './Toast';

// Re-export shadcn components (named exports)
export { Badge, badgeVariants } from './badge';
export { Button, buttonVariants } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Input } from './input';
export { Avatar as ShadcnAvatar, AvatarImage, AvatarFallback } from './avatar';
export { Skeleton } from './skeleton';
export { Separator } from './separator';

// Import CSS for custom component styles
import './Button.css';
import './Input.css';
import './Card.css';
import './Skeleton.css';
import './Dropdown.css';
import './Badge.css';
import './Avatar.css';
import './EmptyState.css';
import './Modal.css';
import './Spinner.css';
import './Toggle.css';
import './Toast.css';

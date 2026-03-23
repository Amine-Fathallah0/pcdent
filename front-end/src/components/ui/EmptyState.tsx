import { memo, type ReactNode } from 'react';
import Icon from './Icon';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = memo(({ icon, title, description, action }: EmptyStateProps) => (
  <div className="empty-state">
    {icon && (
      <div className="empty-state__icon">
        <Icon name={icon} size={48} />
      </div>
    )}
    <h3 className="empty-state__title">{title}</h3>
    {description && <p className="empty-state__description">{description}</p>}
    {action && <div className="empty-state__action">{action}</div>}
  </div>
));

EmptyState.displayName = 'EmptyState';

export default EmptyState;

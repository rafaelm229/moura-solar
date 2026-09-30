import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Skeleton } from './Skeleton';

export interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  change?: {
    value: string;
    trend: 'positive' | 'negative' | 'neutral';
  };
  subtitle?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon,
  loading = false,
  className = '',
}: MetricCardProps) {
  return (
    <Card padding="md" className={`ui-metric-card ${className}`.trim()}>
      <div className="ui-metric-card__header">
        <h3 className="ui-metric-card__title">{title}</h3>
        {icon && (
          <span className="ui-metric-card__icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton height="36px" width="60%" className="ui-metric-card__skeleton" />
      ) : (
        <p className="ui-metric-card__value">{value}</p>
      )}

      {(change || subtitle) && (
        <div className="ui-metric-card__footer">
          {change && (
            <Badge
              variant={
                change.trend === 'positive'
                  ? 'success'
                  : change.trend === 'negative'
                    ? 'danger'
                    : 'neutral'
              }
              size="sm"
            >
              {change.trend === 'positive' && !change.value.startsWith('+')
                ? `+${change.value}`
                : change.value}
            </Badge>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}

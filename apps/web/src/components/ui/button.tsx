'use client';
import React from 'react';
import { Icon, type IconName } from '../icons/material-symbol';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      icon,
      iconPosition = 'start',
      loading = false,
      loadingText,
      disabled,
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    const variantClass =
      variant === 'primary'
        ? 'btn--primary'
        : variant === 'secondary'
          ? 'btn--secondary'
          : variant === 'danger'
            ? 'btn--danger'
            : variant === 'success'
              ? 'btn--success'
              : 'btn--subtle';

    const sizeStyles: React.CSSProperties =
      size === 'sm'
        ? { padding: '0.35rem 0.65rem', fontSize: '0.75rem', minHeight: 'auto' }
        : size === 'lg'
          ? { padding: '0.75rem 1.5rem', fontSize: '1rem', minHeight: 'auto' }
          : { padding: '0.5rem 1rem', fontSize: '0.875rem', minHeight: 'auto' };

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`btn ${variantClass} ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          ...sizeStyles,
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <>
            <Icon name="sync" size={iconSize} className="animate-spin" />
            <span>{loadingText || children || 'Carregando…'}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'start' && <Icon name={icon} size={iconSize} />}
            {children && <span>{children}</span>}
            {icon && iconPosition === 'end' && <Icon name={icon} size={iconSize} />}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

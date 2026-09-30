import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'compact' | 'default' | 'field';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'default',
      isLoading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      disabled = false,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isEffectivelyDisabled = disabled || isLoading;

    const classNames = [
      'ui-button',
      `ui-button--${variant}`,
      `ui-button--${size}`,
      fullWidth ? 'ui-button--full-width' : '',
      isEffectivelyDisabled ? 'ui-button--disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        disabled={isEffectivelyDisabled}
        aria-busy={isLoading ? 'true' : undefined}
        className={classNames}
        {...props}
      >
        {isLoading && (
          <span className="ui-button__spinner" role="status" aria-label="Carregando..." />
        )}
        {!isLoading && iconLeft && <span className="ui-button__icon-left">{iconLeft}</span>}
        {children && <span>{children}</span>}
        {!isLoading && iconRight && <span className="ui-button__icon-right">{iconRight}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';

export interface IconButtonProps extends Omit<ButtonProps, 'iconLeft' | 'iconRight' | 'children'> {
  /**
   * Accessible description of the button action for screen readers.
   * Required for accessibility (WCAG 2.2 AA).
   */
  'aria-label': string;
  icon: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className = '', size = 'default', 'aria-label': ariaLabel, ...props }, ref) => {
    const classNames = ['ui-icon-button', `ui-icon-button--${size}`, className]
      .filter(Boolean)
      .join(' ');

    return (
      <Button ref={ref} size={size} aria-label={ariaLabel} className={classNames} {...props}>
        {icon}
      </Button>
    );
  },
);

IconButton.displayName = 'IconButton';

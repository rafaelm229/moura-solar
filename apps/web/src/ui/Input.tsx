import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className = '', type = 'text', disabled, ...props }, ref) => {
    const classNames = ['ui-input', hasError ? 'ui-input--error' : '', className]
      .filter(Boolean)
      .join(' ');

    return (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : undefined}
        className={classNames}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

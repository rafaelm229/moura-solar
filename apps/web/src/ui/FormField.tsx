import React, { cloneElement, isValidElement } from 'react';

export interface FormFieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children:
    | React.ReactElement<Record<string, unknown>>
    | ((props: {
        id: string;
        hasError: boolean;
        'aria-describedby'?: string;
        required?: boolean;
      }) => React.ReactNode);
}

export function FormField({
  id,
  label,
  description,
  error,
  required = false,
  className = '',
  children,
}: FormFieldProps) {
  const descId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [descId, errorId].filter(Boolean).join(' ') || undefined;

  const childProps = {
    id,
    hasError: Boolean(error),
    'aria-describedby': describedBy,
    required,
  };

  return (
    <div className={`ui-form-field ${className}`.trim()}>
      <div className="ui-form-field__label-row">
        <label htmlFor={id} className="ui-form-field__label">
          {label}
          {required && (
            <>
              <span className="ui-form-field__required" aria-hidden="true">
                *
              </span>
              <span className="ui-sr-only">(campo obrigatório)</span>
            </>
          )}
        </label>
      </div>

      {description && (
        <span id={descId} className="ui-form-field__description">
          {description}
        </span>
      )}

      {typeof children === 'function'
        ? children(childProps)
        : isValidElement(children)
          ? cloneElement(children, {
              ...childProps,
              ...(children.props as Record<string, unknown>),
              // Ensure aria-describedby and error flags are merged
              id: (children.props as { id?: string }).id || id,
              'aria-describedby':
                [
                  childProps['aria-describedby'],
                  (children.props as { 'aria-describedby'?: string })['aria-describedby'],
                ]
                  .filter(Boolean)
                  .join(' ') || undefined,
              hasError:
                Boolean(error) || Boolean((children.props as { hasError?: boolean }).hasError),
            })
          : children}

      {error && (
        <div id={errorId} role="alert" className="ui-form-field__error">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

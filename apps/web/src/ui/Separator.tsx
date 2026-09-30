import React from 'react';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  subtle?: boolean;
}

export function Separator({
  orientation = 'horizontal',
  subtle = false,
  className = '',
  ...props
}: SeparatorProps) {
  const classNames = [
    'ui-separator',
    `ui-separator--${orientation}`,
    subtle ? 'ui-separator--subtle' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div role="separator" aria-orientation={orientation} className={classNames} {...props} />;
}

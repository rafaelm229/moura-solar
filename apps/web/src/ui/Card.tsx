import React, { forwardRef } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = 'md',
      interactive = false,
      as: Component = 'div',
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const classNames = [
      'ui-card',
      `ui-card--padding-${padding}`,
      interactive ? 'ui-card--interactive' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Component ref={ref} className={classNames} {...props}>
        {children}
      </Component>
    );
  },
);

Card.displayName = 'Card';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  pulse?: boolean;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius,
  pulse = true,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const dynamicStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius,
    ...style,
  };

  const classNames = ['ui-skeleton', pulse ? 'ui-skeleton--pulse' : '', className]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames} style={dynamicStyle} aria-hidden="true" {...props} />;
}

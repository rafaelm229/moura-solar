import React from 'react';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  path: string;
  section: string;
  permission?: string;
  organization?: boolean;
  badge?: string | number;
}

export interface NavGroupConfig {
  title: string;
  items: NavItemConfig[];
}

export interface ShellUser {
  name: string;
  email?: string;
  role?: string;
  organizationName?: string;
  initials?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

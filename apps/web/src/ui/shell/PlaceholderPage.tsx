import React from 'react';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div
      className="shell-placeholder-wrapper"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 480,
        padding: '24px 16px',
      }}
    >
      <div
        className="shell-placeholder-card"
        style={{
          textAlign: 'center',
          maxWidth: 420,
          width: '100%',
          padding: '40px 32px',
          background: 'var(--surface-card, #161A17)',
          border: '1px solid var(--border-subtle, #29302B)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          className="shell-placeholder-icon"
          style={{
            width: 72,
            height: 72,
            background: 'rgba(255, 212, 0, 0.08)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--color-solar, #FFD400)',
          }}
        >
          {icon}
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-ink-50, #F5F7F5)',
            margin: '0 0 8px',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--color-ink-300, #9BA49E)',
            margin: '0 0 20px',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
        <span
          className="shell-placeholder-badge"
          style={{
            display: 'inline-block',
            padding: '5px 14px',
            background: 'rgba(255, 212, 0, 0.1)',
            border: '1px solid rgba(255, 212, 0, 0.2)',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-solar, #FFD400)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Em desenvolvimento
        </span>
      </div>
    </div>
  );
}

export default PlaceholderPage;

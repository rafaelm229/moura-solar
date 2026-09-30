import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const C = {
  card: '#161A17', border: '#29302B', solar: '#FFD400',
  text: '#F5F7F5', textSec: '#9BA49E', textDis: '#626A65',
};

export default function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 480 }}>
      <div style={{ textAlign: 'center', maxWidth: 380, padding: '40px 32px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
        <div style={{ width: 72, height: 72, background: 'rgba(255,212,0,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: C.solar }}>
          {icon}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>{title}</h2>
        <p style={{ fontSize: 14, color: C.textSec, margin: '0 0 20px', lineHeight: 1.6 }}>{description}</p>
        <span style={{ display: 'inline-block', padding: '5px 14px', background: 'rgba(255,212,0,0.1)', border: '1px solid rgba(255,212,0,0.2)', borderRadius: 20, fontSize: 12, fontWeight: 700, color: C.solar, letterSpacing: 0.5 }}>
          Em desenvolvimento
        </span>
      </div>
    </div>
  );
}

'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons/material-symbol';

export default function PreviewsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/previews', label: 'Hub de Previews', icon: 'home' as const },
    { href: '/previews/cliente', label: '1. Ficha do Cliente', icon: 'person' as const },
    {
      href: '/previews/oportunidade',
      label: '2. Detalhe da Oportunidade',
      icon: 'trending_up' as const,
    },
    {
      href: '/previews/instalacao',
      label: '3. Execução da Instalação',
      icon: 'engineering' as const,
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f7f5',
        color: '#102a23',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          backgroundColor: '#087443',
          color: '#ffffff',
          padding: '0.75rem 1rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#087443',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
              }}
            >
              M
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                Moura Solar — Pilotos de UX (Lote 1)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#e2f3e9' }}>
                Ambiente de Homologação Visual Isolado
              </div>
            </div>
          </div>

          <nav
            aria-label="Navegação dos previews"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 500,
                    textDecoration: 'none',
                    color: active ? '#087443' : '#ffffff',
                    backgroundColor: active ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '1rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
    </div>
  );
}

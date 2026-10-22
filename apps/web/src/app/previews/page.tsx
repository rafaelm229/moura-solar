'use client';
import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons/material-symbol';

export default function PreviewsIndexPage() {
  const pilots = [
    {
      id: 'cliente',
      title: '1. Ficha do Cliente',
      href: '/previews/cliente',
      icon: 'person' as const,
      tag: 'SPEC-013 / SPEC-014',
      description:
        'Visão 360° do cliente com identificação fiscal completa, contatos comerciais e financeiros múltiplos, unidades consumidoras (UCs) vinculadas, histórico de consumo dos últimos 12 meses e fluxo assistido de importação de conta de energia.',
      highlights: [
        'Identificação completa (Razão Social, CNPJ, Inscrição Estadual, Representante Legal)',
        'Múltiplos contatos categorizados (WhatsApp, financeiro, e-mail)',
        'UCs vinculadas com concessionária (Cemig) e dados tarifários',
        'Histórico de consumo anual e cálculo de média mensal (kWh)',
        'Modal de importação assistida de faturas com validação documental',
      ],
    },
    {
      id: 'oportunidade',
      title: '2. Detalhe da Oportunidade',
      href: '/previews/oportunidade',
      icon: 'trending_up' as const,
      tag: 'SPEC-013 / SPEC-015',
      description:
        'Visão unificada da negociação solar com esteira de estágios visível, status em tempo real de frentes operacionais paralelas, resumo financeiro/margem, histórico de versões de propostas e contratos, pendências da Central de Atenção e dossiê documental.',
      highlights: [
        'Esteira operacional visível (Novo → Qualificado → ... → Contratação → Vendido)',
        '5 Frentes paralelas com status independente (Contrato, Finanças, Engenharia, Materiais, Instalação)',
        'Resumo financeiro claro: valor, entrada, parcelas e margem bruta projetada',
        'Histórico integrado de propostas comerciais e contratos emitidos',
        'Alertas da Central de Atenção com ações de resolução auditada',
      ],
    },
    {
      id: 'instalacao',
      title: '3. Execução da Instalação',
      href: '/previews/instalacao',
      icon: 'engineering' as const,
      tag: 'SPEC-010 / SPEC-015',
      description:
        'Painel operacional de campo para engenharia e instaladores com ordem de serviço detalhada, checklist obrigatório com fotos por etapa, galeria antes/durante/depois, pendências de campo e termo de entrega comissionado.',
      highlights: [
        'Identificação da OS, equipe técnica e cronograma de campo',
        'Checklist técnico interativo com fotos obrigatórias por etapa',
        'Galeria documental de evidências de instalação (antes, durante e depois)',
        'Pendências e alertas de conformidade técnica em campo',
        'Termo de entrega técnica e comissionamento com aceite do cliente',
      ],
    },
  ];

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Hero Card */}
      <section
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '1.25rem',
          border: '1px solid #d9e2de',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
        >
          <Icon name="verified" size={20} style={{ color: '#087443' }} />
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102a23' }}>
            Pilotos Visuais de UX — Lote 1 (Moura Solar)
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#52645c', lineHeight: 1.5 }}>
          Ambiente isolado de validação e homologação dos três pilotos visuais da evolução de UX
          (SPEC-013, SPEC-014 e SPEC-015). Construído estritamente sobre a identidade visual
          institucional White & Green (fundo claro, verde Moura `#087443`), com ícones Google
          Material Symbols Outlined, hierarquia tipográfica restrita (máximo de 3 tamanhos de fonte)
          e total responsividade para mobile (360px), tablet (768px) e desktop (1440px).
        </p>
      </section>

      {/* Grid of Pilots */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {pilots.map((pilot) => (
          <div
            key={pilot.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #d9e2de',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#e2f3e9',
                      color: '#087443',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={pilot.icon} size={20} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                    {pilot.title}
                  </h2>
                </div>
                <span
                  style={{
                    backgroundColor: '#f4f7f5',
                    color: '#087443',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #d9e2de',
                  }}
                >
                  {pilot.tag}
                </span>
              </div>

              <p
                style={{
                  margin: '0 0 1rem',
                  fontSize: '0.875rem',
                  color: '#52645c',
                  lineHeight: 1.5,
                }}
              >
                {pilot.description}
              </p>

              <div
                style={{
                  borderTop: '1px solid #f4f7f5',
                  paddingTop: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#102a23',
                    marginBottom: '0.5rem',
                  }}
                >
                  Elementos-Chave Validados:
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    fontSize: '0.75rem',
                    color: '#52645c',
                    lineHeight: 1.6,
                  }}
                >
                  {pilot.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>

            <Link
              href={pilot.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: '#087443',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '0.625rem 1rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(8, 116, 67, 0.2)',
              }}
            >
              <span>Abrir Preview Interativo</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        ))}
      </div>

      {/* Guidelines and Tokens Reference */}
      <section
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '1.25rem',
          border: '1px solid #d9e2de',
        }}
      >
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
          Parâmetros do Design System (SPEC-003)
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '6px' }}>
            <div style={{ fontWeight: 700, color: '#087443', marginBottom: '0.25rem' }}>
              Hierarquia Tipográfica (Máx 3 tamanhos)
            </div>
            <div>• Título Principal: 20px (1.25rem) Bold</div>
            <div>• Subtítulos e Corpo: 14px (0.875rem) Regular/Semi</div>
            <div>• Auxiliares e Metadados: 12px (0.75rem) Regular/Medium</div>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '6px' }}>
            <div style={{ fontWeight: 700, color: '#087443', marginBottom: '0.25rem' }}>
              Cores e Tokens Institucionais
            </div>
            <div>• Primária Moura: #087443 (Hover: #045c34)</div>
            <div>• Destaque Solar: #f59e0b (Texto escuro)</div>
            <div>• Superfície / Canvas: #ffffff / #f4f7f5</div>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '6px' }}>
            <div style={{ fontWeight: 700, color: '#087443', marginBottom: '0.25rem' }}>
              Ícones e Acessibilidade
            </div>
            <div>• Google Material Symbols Outlined (SVG)</div>
            <div>• Emojis estritamente removidos da UI</div>
            <div>• Contraste mínimo WCAG 2.2 AA em todos os estados</div>
          </div>
        </div>
      </section>
    </div>
  );
}

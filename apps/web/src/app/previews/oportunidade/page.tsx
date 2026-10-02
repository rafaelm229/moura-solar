'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons/material-symbol';

export default function PreviewOportunidadePage() {
  const [activeTab, setActiveTab] = useState<'esteira' | 'financeiro' | 'documentos'>('esteira');
  const [resolvedAlert, setResolvedAlert] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveReason, setResolveReason] = useState('');

  const opt = {
    code: 'OPT-2026-0089',
    title: 'Sistema Fotovoltaico Comercial 45 kWp — Galpão Boa Esperança',
    customer: 'Fazenda Boa Esperança Agropecuária Ltda',
    customerCode: 'CLI-2026-0042',
    utilityUnit: 'UC-70014298 (Cemig Distribuição)',
    seller: 'Mariana Albuquerque (Gerente Comercial Solar)',
    currentStage: 'CONTRATACAO',
    stages: [
      { name: 'Novo', done: true },
      { name: 'Qualificado', done: true },
      { name: 'Levantamento', done: true },
      { name: 'Dimensionamento', done: true },
      { name: 'Proposta', done: true },
      { name: 'Negociação', done: true },
      { name: 'Contratação', current: true },
      { name: 'Vendido', done: false },
      { name: 'Em Obras', done: false },
      { name: 'Concluído', done: false },
    ],
    fronts: [
      {
        id: 'contract',
        name: 'Frente Contratual',
        status: 'Minuta Enviada (Aguardando Assinatura)',
        statusType: 'warning' as const,
        responsible: 'Dr. Roberto Lins (Jurídico)',
        detail: 'CTR-2026-0018-v1 gerado com 14 cláusulas. Aguardando via assinada pelo cliente.',
        action: 'Conferir Assinatura',
      },
      {
        id: 'finance',
        name: 'Frente Financeira (Gate FINANCIAL)',
        status: 'Entrada Pendente de Liquidação',
        statusType: 'warning' as const,
        responsible: 'Ana Paula (Financeiro)',
        detail: 'Entrada de R$ 42.750,00 (30%) com vencimento em 10/10/2026.',
        action: 'Registrar Recebimento',
      },
      {
        id: 'engineering',
        name: 'Frente Engenharia & Homologação',
        status: 'Projeto Aprovado / Protocolo Cemig em Análise',
        statusType: 'info' as const,
        responsible: 'Eng. Rodrigo Mendes (CREA 142.890)',
        detail: 'Diagrama unifilar e ART emitidos. Protocolo Cemig #981244 em prazo legal.',
        action: 'Ver Parecer de Acesso',
      },
      {
        id: 'inventory',
        name: 'Frente Materiais & Estoque',
        status: 'Kit 45 kWp Separado no Depósito',
        statusType: 'success' as const,
        responsible: 'Carlos Santos (Estoque Central)',
        detail: '80 módulos 585W + Inversor 40kW + StringBox reservados sob código RSV-089.',
        action: 'Ver Saldo Reservado',
      },
      {
        id: 'installation',
        name: 'Frente Instalação & Obras',
        status: 'Equipe Alfa Pré-Alocada',
        statusType: 'neutral' as const,
        responsible: 'Mestre Jorge Alencar',
        detail: 'Início programado para 18/10 condicionado à liberação da Entrada e Homologação.',
        action: 'Ver Cronograma de Campo',
      },
    ],
    financialSummary: {
      contractAmount: 142500,
      equipmentCost: 74200,
      installationLaborCost: 16800,
      homologationArtCost: 3500,
      commissionAmount: 7530,
      totalCost: 102030,
      grossMarginAmount: 40470,
      grossMarginPercent: 28.4,
      paymentConditions:
        'Entrada de 30% (R$ 42.750,00) via TED/PIX + Saldo em 60x Financiamento Solar Santander.',
    },
    proposals: [
      {
        code: 'PROP-2026-0042-v2',
        date: '28/09/2026',
        power: '45.00 kWp',
        generation: '6.075 kWh/mês',
        amount: 142500,
        status: 'Aceita Formalmente (Contratada)',
      },
    ],
    contracts: [
      {
        code: 'CTR-2026-0018-v1',
        date: '01/10/2026',
        scope: 'Fornecimento completo e montagem em telhado metálico',
        status: 'Pronto p/ Envio / Aguardando Assinatura',
      },
    ],
  };

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Top Banner / Breadcrumb */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href="/previews"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#087443',
              textDecoration: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <Icon name="arrow_back" size={16} />
            <span>Voltar ao Hub</span>
          </Link>
          <span style={{ color: '#d9e2de' }}>/</span>
          <span style={{ fontSize: '0.75rem', color: '#52645c' }}>Piloto 2</span>
          <span style={{ color: '#d9e2de' }}>/</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#102a23' }}>
            Detalhe da Oportunidade (SPEC-013 / SPEC-015)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            href="/previews/cliente"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              backgroundColor: '#ffffff',
              color: '#087443',
              border: '1px solid #087443',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Icon name="person" size={16} />
            <span>Ver Ficha do Cliente</span>
          </Link>
        </div>
      </div>

      {/* Header Card da Oportunidade */}
      <section
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #d9e2de',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginBottom: '0.25rem',
              }}
            >
              <span
                style={{
                  backgroundColor: '#f4f7f5',
                  color: '#087443',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #d9e2de',
                }}
              >
                {opt.code}
              </span>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102a23' }}>
                {opt.title}
              </h1>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#52645c' }}>
              Cliente: <strong style={{ color: '#102a23' }}>{opt.customer}</strong> • UC:{' '}
              {opt.utilityUnit} • Responsável: {opt.seller}
            </div>
          </div>

          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#e2f3e9',
              borderRadius: '8px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#045c34' }}>Valor do Contrato Fechado</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#087443' }}>
              R${' '}
              {opt.financialSummary.contractAmount.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        {/* Esteira Visível de Estágios (Pipeline SPEC-015) */}
        <div
          style={{
            borderTop: '1px solid #f4f7f5',
            paddingTop: '1rem',
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#52645c' }}>
              ESTEIRA COMERCIAL & OPERACIONAL (ESTÁGIO ATUAL: CONTRATAÇÃO)
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%',
              paddingBottom: '0.5rem',
            }}
          >
            {opt.stages.map((stage, idx) => {
              const isPast = stage.done;
              const isCurrent = stage.current;
              return (
                <div
                  key={stage.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: isCurrent ? 700 : 500,
                      backgroundColor: isCurrent ? '#087443' : isPast ? '#e2f3e9' : '#f4f7f5',
                      color: isCurrent ? '#ffffff' : isPast ? '#045c34' : '#64736e',
                      border: isCurrent ? '1px solid #045c34' : '1px solid #d9e2de',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {isPast && <Icon name="check_circle" size={12} />}
                    <span>{stage.name}</span>
                  </div>
                  {idx < opt.stages.length - 1 && (
                    <Icon name="arrow_forward" size={14} style={{ color: '#d9e2de' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid #d9e2de',
            marginTop: '1.25rem',
            paddingBottom: '0.25rem',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('esteira')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'esteira' ? '2px solid #087443' : '2px solid transparent',
              color: activeTab === 'esteira' ? '#087443' : '#52645c',
              fontWeight: activeTab === 'esteira' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="trending_up" size={16} />
            <span>Frentes Operacionais Paralelas (5)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'financeiro' ? '2px solid #087443' : '2px solid transparent',
              color: activeTab === 'financeiro' ? '#087443' : '#52645c',
              fontWeight: activeTab === 'financeiro' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="payments" size={16} />
            <span>Resumo Financeiro & Margem</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documentos')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'documentos' ? '2px solid #087443' : '2px solid transparent',
              color: activeTab === 'documentos' ? '#087443' : '#52645c',
              fontWeight: activeTab === 'documentos' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="description" size={16} />
            <span>Propostas & Contratos</span>
          </button>
        </div>
      </section>

      {/* Alerta de Central de Atenção (SPEC-012/SPEC-015) */}
      {!resolvedAlert ? (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fffbeb',
            borderRadius: '8px',
            border: '1px solid #f59e0b',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flex: '1 1 240px',
              minWidth: 0,
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <Icon name="warning" size={24} style={{ color: '#d97706' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e' }}>
                Central de Atenção: Entrada do Contrato Pendente de Liquidação
              </div>
              <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
                A liberação de materiais no estoque e agendamento da obra dependem da confirmação do
                sinal (Gate FINANCIAL).
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsResolveModalOpen(true)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: '#92400e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Resolver Justificadamente
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#e2f3e9',
            borderRadius: '8px',
            border: '1px solid #087443',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: '#045c34',
          }}
        >
          <Icon name="check_circle" size={16} />
          <span>
            Alerta resolvido com justificativa auditada: <em>&quot;{resolveReason}&quot;</em>
          </span>
        </div>
      )}

      {/* Tab: Frentes Operacionais Paralelas (SPEC-015) */}
      {activeTab === 'esteira' && (
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #d9e2de',
            padding: '1.25rem',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
              Frentes Operacionais Paralelas e Bloqueios (SPEC-015 Item 13)
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#52645c' }}>
              Cada frente reflete sua situação real sem linearidade artificial: o financeiro não
              esconde pendência de material.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {opt.fronts.map((frente) => {
              const bgBadge =
                frente.statusType === 'success'
                  ? '#e2f3e9'
                  : frente.statusType === 'warning'
                    ? '#fef3c7'
                    : frente.statusType === 'info'
                      ? '#dbeafe'
                      : '#f4f7f5';
              const textBadge =
                frente.statusType === 'success'
                  ? '#045c34'
                  : frente.statusType === 'warning'
                    ? '#92400e'
                    : frente.statusType === 'info'
                      ? '#1e40af'
                      : '#52645c';

              return (
                <div
                  key={frente.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f4f7f5',
                    borderRadius: '8px',
                    border: '1px solid #d9e2de',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ flex: '1 1 260px', minWidth: 0, maxWidth: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#102a23' }}>
                        {frente.name}
                      </span>
                      <span
                        style={{
                          backgroundColor: bgBadge,
                          color: textBadge,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {frente.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                      Responsável: <strong>{frente.responsible}</strong> • {frente.detail}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`Ação selecionada para: ${frente.name}`)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      backgroundColor: '#ffffff',
                      color: '#087443',
                      border: '1px solid #087443',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      flexShrink: 0,
                    }}
                  >
                    <span>{frente.action}</span>
                    <Icon name="arrow_forward" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab: Resumo Financeiro & Margem */}
      {activeTab === 'financeiro' && (
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #d9e2de',
            padding: '1.25rem',
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
              Composição de Preço, Custos e Margem Bruta
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
              Governança financeira com margem projetada aprovada e trava de segurança.
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#52645c' }}>Valor Contratual Bruto</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                R${' '}
                {opt.financialSummary.contractAmount.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#52645c' }}>Custo Total Orçado</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                R${' '}
                {opt.financialSummary.totalCost.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#e2f3e9', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#045c34' }}>Margem Bruta Projetada</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#087443' }}>
                {opt.financialSummary.grossMarginPercent}% (R${' '}
                {opt.financialSummary.grossMarginAmount.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
                )
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#f4f7f5',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#102a23',
                marginBottom: '0.25rem',
              }}
            >
              Condições de Faturamento & Parcelamento:
            </div>
            <div style={{ color: '#52645c' }}>{opt.financialSummary.paymentConditions}</div>
          </div>
        </section>
      )}

      {/* Tab: Propostas & Contratos */}
      {activeTab === 'documentos' && (
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #d9e2de',
            padding: '1.25rem',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
              Propostas e Contratos Vinculados
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
              Histórico versionado com downloads oficiais em PDF e DOCX editável.
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Proposta */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f4f7f5',
                borderRadius: '8px',
                border: '1px solid #d9e2de',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="description" size={18} style={{ color: '#087443' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    {opt.proposals[0].code}
                  </span>
                  <span
                    style={{
                      backgroundColor: '#e2f3e9',
                      color: '#087443',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                    }}
                  >
                    {opt.proposals[0].status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Download do PDF da proposta simulado.')}
                  style={{
                    padding: '0.35rem 0.6rem',
                    backgroundColor: '#ffffff',
                    color: '#087443',
                    border: '1px solid #087443',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Icon name="download" size={14} />
                  <span>Baixar PDF</span>
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                Potência: {opt.proposals[0].power} • Geração: {opt.proposals[0].generation} • Valor:
                R$ {opt.proposals[0].amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Contrato */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f4f7f5',
                borderRadius: '8px',
                border: '1px solid #d9e2de',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="description" size={18} style={{ color: '#087443' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    {opt.contracts[0].code}
                  </span>
                  <span
                    style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                    }}
                  >
                    {opt.contracts[0].status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => alert('Download da minuta DOCX simulado.')}
                    style={{
                      padding: '0.35rem 0.6rem',
                      backgroundColor: '#ffffff',
                      color: '#087443',
                      border: '1px solid #087443',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Icon name="download" size={14} />
                    <span>Baixar DOCX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Download do PDF formal simulado.')}
                    style={{
                      padding: '0.35rem 0.6rem',
                      backgroundColor: '#087443',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Icon name="download" size={14} />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                Escopo: {opt.contracts[0].scope} • 14 cláusulas com anexos técnicos de memorial e
                equipamentos.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modal de Resolução de Alerta (Central de Atenção) */}
      {isResolveModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 200,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.25rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                Resolução Justificada de Pendência (SPEC-012)
              </h3>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#52645c', margin: '0 0 1rem' }}>
              Informe a justificativa ou evidência para desativar temporariamente o alerta da
              Central de Atenção:
            </p>

            <textarea
              rows={3}
              value={resolveReason}
              onChange={(e) => setResolveReason(e.target.value)}
              placeholder="Ex: Comprovante de TED de entrada recebido por e-mail e em conciliação bancária..."
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #d9e2de',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                marginBottom: '1rem',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d9e2de',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!resolveReason.trim()}
                onClick={() => {
                  setResolvedAlert(true);
                  setIsResolveModalOpen(false);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: resolveReason.trim() ? '#087443' : '#d9e2de',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: resolveReason.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Confirmar Resolução
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

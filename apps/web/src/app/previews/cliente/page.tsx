'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons/material-symbol';

export default function PreviewClientePage() {
  const [activeTab, setActiveTab] = useState<'geral' | 'ucs' | 'documentos'>('geral');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'review' | 'applied'>('upload');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  // Mock data: Cliente
  const cliente = {
    id: 'CLI-2026-0042',
    legalName: 'Fazenda Boa Esperança Agropecuária Ltda',
    tradeName: 'Agropecuária Boa Esperança',
    taxId: '12.345.678/0001-90',
    stateRegistration: '082.912.441-0',
    type: 'Pessoa Jurídica (PJ)',
    status: 'Ativo',
    representative: {
      name: 'Carlos Eduardo da Silva Moura',
      cpf: '123.456.789-00',
      role: 'Sócio-Administrador',
    },
    contacts: [
      {
        id: '1',
        type: 'WhatsApp Comercial',
        value: '(31) 98765-4321',
        primary: true,
        person: 'Carlos Moura',
      },
      {
        id: '2',
        type: 'Telefone Fixo / Escritório',
        value: '(31) 3222-1100',
        primary: false,
        person: 'Recepção',
      },
      {
        id: '3',
        type: 'E-mail Comercial',
        value: 'carlos@boaesperanca.agro.br',
        primary: true,
        person: 'Diretoria',
      },
      {
        id: '4',
        type: 'E-mail Financeiro',
        value: 'financeiro@boaesperanca.agro.br',
        primary: false,
        person: 'Contabilidade',
      },
    ],
    address: {
      street: 'Rodovia MG-050',
      number: 'Km 142',
      complement: 'Galpão Principal - Acesso Rural',
      district: 'Zona Rural',
      city: 'Formiga',
      state: 'MG',
      zipCode: '35570-000',
    },
    utilityUnits: [
      {
        id: 'uc-1',
        code: 'UC-70014298',
        utility: 'Cemig Distribuição S.A.',
        category: 'B3 Rural — Trifásico 380V/220V',
        status: 'Ativa & Vinculada',
        avgConsumption: 2450,
        monthlyHistory: [
          { month: '2026-09', consumption: 2510, billedAmount: 2384.5, status: 'Conferido' },
          { month: '2026-08', consumption: 2430, billedAmount: 2308.5, status: 'Conferido' },
          { month: '2026-07', consumption: 2390, billedAmount: 2270.5, status: 'Conferido' },
          { month: '2026-06', consumption: 2580, billedAmount: 2451.0, status: 'Conferido' },
          { month: '2026-05', consumption: 2620, billedAmount: 2489.0, status: 'Conferido' },
          { month: '2026-04', consumption: 2410, billedAmount: 2289.5, status: 'Conferido' },
          { month: '2026-03', consumption: 2350, billedAmount: 2232.5, status: 'Conferido' },
          { month: '2026-02', consumption: 2480, billedAmount: 2356.0, status: 'Conferido' },
          { month: '2026-01', consumption: 2540, billedAmount: 2413.0, status: 'Conferido' },
          { month: '2025-12', consumption: 2420, billedAmount: 2299.0, status: 'Conferido' },
          { month: '2025-11', consumption: 2360, billedAmount: 2242.0, status: 'Conferido' },
          { month: '2025-10', consumption: 2310, billedAmount: 2194.5, status: 'Conferido' },
        ],
      },
      {
        id: 'uc-2',
        code: 'UC-70014299',
        utility: 'Cemig Distribuição S.A.',
        category: 'B1 Residencial — Bifásico 220V/127V',
        status: 'Ativa & Beneficiária',
        avgConsumption: 620,
        monthlyHistory: [],
      },
    ],
    documents: [
      {
        id: 'DOC-01',
        title: 'Contrato Social Consolidado (JUCEMG)',
        category: 'Constituição da Empresa',
        status: 'Armazenado e disponível',
        size: '1.8 MB',
        date: '15/09/2026',
        hash: 'e89a3f2b4c10...9d',
      },
      {
        id: 'DOC-02',
        title: 'CNPJ e Inscrição Estadual Regularizada',
        category: 'Fiscal & Tributário',
        status: 'Armazenado e disponível',
        size: '420 KB',
        date: '15/09/2026',
        hash: '9a4c11b02f8e...7a',
      },
      {
        id: 'DOC-03',
        title: 'Conta de Energia Cemig (Ref 09/2026)',
        category: 'Conta de Energia / UC',
        status: 'Armazenado e disponível',
        size: '680 KB',
        date: '28/09/2026',
        hash: 'b148e9c04a2d...3f',
      },
      {
        id: 'DOC-04',
        title: 'Documento Oficial com Foto (Sócio Carlos Moura)',
        category: 'Identificação do Representante',
        status: 'Armazenado e disponível',
        size: '950 KB',
        date: '15/09/2026',
        hash: '77c21f00ea12...bc',
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
          <span style={{ fontSize: '0.75rem', color: '#52645c' }}>Piloto 1</span>
          <span style={{ color: '#d9e2de' }}>/</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#102a23' }}>
            Ficha do Cliente (SPEC-013 / SPEC-014)
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setImportStep('upload');
            setIsImportModalOpen(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#087443',
            color: '#ffffff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(8, 116, 67, 0.2)',
          }}
        >
          <Icon name="upload_file" size={20} />
          <span>Importar Conta de Energia</span>
        </button>
      </div>

      {/* Header Card do Cliente */}
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
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102a23' }}>
                {cliente.legalName}
              </h1>
              <span
                style={{
                  backgroundColor: '#e2f3e9',
                  color: '#087443',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Icon name="check_circle" size={14} />
                <span>{cliente.status}</span>
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#52645c' }}>
              Nome Fantasia: <strong style={{ color: '#102a23' }}>{cliente.tradeName}</strong> •
              Código: {cliente.id}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.75rem',
            }}
          >
            <div
              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f4f7f5', borderRadius: '6px' }}
            >
              <div style={{ color: '#52645c' }}>CNPJ</div>
              <div style={{ fontWeight: 700, color: '#102a23' }}>{cliente.taxId}</div>
            </div>
            <div
              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f4f7f5', borderRadius: '6px' }}
            >
              <div style={{ color: '#52645c' }}>Inscrição Estadual</div>
              <div style={{ fontWeight: 700, color: '#102a23' }}>{cliente.stateRegistration}</div>
            </div>
            <div
              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f4f7f5', borderRadius: '6px' }}
            >
              <div style={{ color: '#52645c' }}>Unidades Vinculadas</div>
              <div style={{ fontWeight: 700, color: '#087443' }}>2 UCs Cemig</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
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
            onClick={() => setActiveTab('geral')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'geral' ? '2px solid #087443' : '2px solid transparent',
              color: activeTab === 'geral' ? '#087443' : '#52645c',
              fontWeight: activeTab === 'geral' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="person" size={16} />
            <span>Dados Gerais & Contatos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ucs')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ucs' ? '2px solid #087443' : '2px solid transparent',
              color: activeTab === 'ucs' ? '#087443' : '#52645c',
              fontWeight: activeTab === 'ucs' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="bolt" size={16} />
            <span>Unidades Consumidoras & Histórico ({cliente.utilityUnits.length})</span>
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
            <Icon name="folder" size={16} />
            <span>Dossiê Documental ({cliente.documents.length})</span>
          </button>
        </div>
      </section>

      {/* Tab: Dados Gerais & Contatos */}
      {activeTab === 'geral' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Contatos Múltiplos */}
          <section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #d9e2de',
              padding: '1.25rem',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
            >
              <Icon name="phone" size={18} style={{ color: '#087443' }} />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                Canais de Contato Cadastrados
              </h2>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {cliente.contacts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: '#f4f7f5',
                    borderRadius: '8px',
                    border: '1px solid #d9e2de',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#102a23' }}>
                        {c.value}
                      </span>
                      {c.primary && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            backgroundColor: '#e2f3e9',
                            color: '#087443',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          Principal
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                      {c.type} • Responsável: {c.person}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Endereço & Representante Legal */}
          <section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #d9e2de',
              padding: '1.25rem',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
            >
              <Icon name="badge" size={18} style={{ color: '#087443' }} />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                Representante Legal & Endereço
              </h2>
            </div>

            <div style={{ display: 'grid', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#52645c', marginBottom: '0.25rem' }}>
                  Representante Autorizado
                </div>
                <div style={{ fontWeight: 700, color: '#102a23' }}>
                  {cliente.representative.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                  CPF: {cliente.representative.cpf} • Cargo: {cliente.representative.role}
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#52645c', marginBottom: '0.25rem' }}>
                  Localização da Sede / Propriedade
                </div>
                <div style={{ fontWeight: 700, color: '#102a23' }}>
                  {cliente.address.street}, {cliente.address.number} ({cliente.address.complement})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                  {cliente.address.district} — {cliente.address.city}/{cliente.address.state} • CEP:{' '}
                  {cliente.address.zipCode}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab: UCs & Histórico de Consumo */}
      {activeTab === 'ucs' && (
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #d9e2de',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="bolt" size={18} style={{ color: '#087443' }} />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                  Unidade Consumidora Principal ({cliente.utilityUnits[0].code})
                </h2>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                {cliente.utilityUnits[0].utility} • Categoria: {cliente.utilityUnits[0].category}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  backgroundColor: '#e2f3e9',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  textAlign: 'right',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#045c34' }}>Consumo Médio Apurado</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#087443' }}>
                  2.450 kWh/mês
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportStep('upload');
                  setIsImportModalOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Icon name="upload_file" size={16} />
                <span>Nova Fatura</span>
              </button>
            </div>
          </div>

          {/* Histórico 12 Meses */}
          <div style={{ overflowX: 'auto', border: '1px solid #d9e2de', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f4f7f5',
                    borderBottom: '1px solid #d9e2de',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#52645c' }}>
                    Mês/Ano
                  </th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#52645c' }}>
                    Consumo Ativo
                  </th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#52645c' }}>
                    Valor Faturado
                  </th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#52645c' }}>
                    Status da Leitura
                  </th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#52645c' }}>
                    Origem
                  </th>
                </tr>
              </thead>
              <tbody>
                {cliente.utilityUnits[0].monthlyHistory.map((item, idx) => (
                  <tr
                    key={item.month}
                    style={{
                      borderBottom: idx === 11 ? 'none' : '1px solid #f4f7f5',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafcfb',
                    }}
                  >
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>{item.month}</td>
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#102a23' }}>
                      {item.consumption.toLocaleString('pt-BR')} kWh
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      R$ {item.billedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <span
                        style={{
                          backgroundColor: '#e2f3e9',
                          color: '#087443',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td
                      style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#52645c' }}
                    >
                      Fatura PDF Cemig
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Dossiê Documental (SPEC-013) */}
      {activeTab === 'documentos' && (
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #d9e2de',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="folder" size={18} style={{ color: '#087443' }} />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                  Dossiê Documental Auditável (SPEC-013)
                </h2>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                Repositório persistido com hash SHA-256 e conformidade regulatória.
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                alert('Simulação: seletor de arquivo aberto para upload de documento no dossiê.')
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.4rem 0.75rem',
                backgroundColor: '#087443',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Icon name="upload_file" size={16} />
              <span>Anexar ao Dossiê</span>
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {cliente.documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem',
                  backgroundColor: '#f4f7f5',
                  borderRadius: '8px',
                  border: '1px solid #d9e2de',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d9e2de',
                      color: '#087443',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="description" size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#102a23' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                      {doc.category} • Tamanho: {doc.size} • Data: {doc.date}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      backgroundColor: '#e2f3e9',
                      color: '#087443',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Icon name="check_circle" size={14} />
                    <span>{doc.status}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc.title)}
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
                    <Icon name="visibility" size={14} />
                    <span>Visualizar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal Assistido de Importação de Conta (SPEC-014) */}
      {isImportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
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
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              border: '1px solid #d9e2de',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #d9e2de',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="upload_file" size={20} style={{ color: '#087443' }} />
                <h3
                  id="modal-title"
                  style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#102a23' }}
                >
                  Importação Assistida de Conta de Energia (SPEC-014)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#52645c',
                }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {importStep === 'upload' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div
                    style={{
                      border: '2px dashed #087443',
                      borderRadius: '8px',
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      backgroundColor: '#f4f7f5',
                    }}
                  >
                    <Icon
                      name="description"
                      size={32}
                      style={{ color: '#087443', marginBottom: '0.5rem' }}
                    />
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#102a23' }}>
                      Selecione ou arraste a Fatura de Energia (PDF ou Imagem)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#52645c', marginTop: '0.25rem' }}>
                      Suporte oficial: Cemig, Neoenergia, CPFL, Enel (PDF original ou foto legível
                      até 15MB)
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportStep('review')}
                      style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1.25rem',
                        backgroundColor: '#087443',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Carregar Fatura Demonstração Cemig (Outubro/2026)
                    </button>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#52645c', lineHeight: 1.5 }}>
                    <strong>Diretriz de Segurança SPEC-014:</strong> O documento será armazenado no
                    dossiê auditável com garantia de integridade SHA-256 antes da extração assistida
                    dos dados cadastrais e tarifários.
                  </div>
                </div>
              )}

              {importStep === 'review' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#e2f3e9',
                      borderRadius: '6px',
                      border: '1px solid #087443',
                      fontSize: '0.75rem',
                      color: '#045c34',
                    }}
                  >
                    <strong>Conferência Obrigatória:</strong> Validação cadastral separando titular
                    da fatura e cliente comprador.
                  </div>

                  {/* Comparativo de Titularidade */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#f4f7f5',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#52645c', marginBottom: '0.25rem' }}>
                        Titular na Conta Cemig
                      </div>
                      <div style={{ fontWeight: 700, color: '#102a23' }}>
                        Fazenda Boa Esperança Agropecuária Ltda
                      </div>
                      <div>CNPJ: 12.345.678/0001-90</div>
                      <div>Código da UC: UC-70014298</div>
                    </div>

                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#f4f7f5',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#52645c', marginBottom: '0.25rem' }}>
                        Cliente Comprador no Sistema
                      </div>
                      <div style={{ fontWeight: 700, color: '#102a23' }}>
                        Fazenda Boa Esperança Agropecuária Ltda
                      </div>
                      <div>CNPJ: 12.345.678/0001-90</div>
                      <div style={{ color: '#087443', fontWeight: 700 }}>
                        Correspondência Identificada: 100%
                      </div>
                    </div>
                  </div>

                  {/* Dados de Leitura Extraídos */}
                  <div
                    style={{
                      border: '1px solid #d9e2de',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#102a23', marginBottom: '0.5rem' }}>
                      Dados Extraídos para Aplicação:
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        Mês Ref: <strong>2026-10</strong>
                      </div>
                      <div>
                        Consumo: <strong>2.470 kWh</strong>
                      </div>
                      <div>
                        Valor: <strong>R$ 2.346,50</strong>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setImportStep('upload')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ffffff',
                        color: '#52645c',
                        border: '1px solid #d9e2de',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportStep('applied')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#087443',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Confirmar Importação no Histórico
                    </button>
                  </div>
                </div>
              )}

              {importStep === 'applied' && (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <Icon
                    name="check_circle"
                    size={32}
                    style={{ color: '#087443', marginBottom: '0.5rem' }}
                  />
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                    Conta Importada e Histórico Atualizado!
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#52645c', margin: '0.5rem 0 1.25rem' }}>
                    O arquivo foi registrado no dossiê documental (DOC-05) e o consumo de 2.470 kWh
                    foi adicionado à UC-70014298.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    style={{
                      padding: '0.5rem 1.5rem',
                      backgroundColor: '#087443',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Fechar e Visualizar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização de Documento */}
      {selectedDoc && (
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
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{selectedDoc}</h3>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div
              style={{
                height: '240px',
                backgroundColor: '#f4f7f5',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                border: '1px solid #d9e2de',
              }}
            >
              <Icon name="description" size={32} style={{ color: '#087443' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Visualizador Seguro de Documento
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                Autenticação S3 Signature V4
              </div>
            </div>
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

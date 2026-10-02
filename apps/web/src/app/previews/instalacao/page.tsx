'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons/material-symbol';

export default function PreviewInstalacaoPage() {
  const [activeTab, setActiveTab] = useState<'checklist' | 'galeria' | 'handover'>('checklist');
  const [handoverSigned, setHandoverSigned] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoStep, setPhotoStep] = useState<number | null>(null);

  const os = {
    code: 'OS-2026-0312',
    title: 'Montagem Mecânica, Elétrica e Comissionamento 45 kWp',
    projectCode: 'PROJ-2026-0089',
    customer: 'Fazenda Boa Esperança Agropecuária Ltda',
    leadEngineer: 'Eng. Rodrigo Mendes (CREA 142.890/D-MG)',
    fieldTeam: 'Equipe Instaladora Alfa (Líder: Mestre Jorge Alencar + 3 eletricistas)',
    dates: '18/10/2026 a 21/10/2026',
    status: 'EM_EXECUCAO',
    progressPercent: 80,
    checklistItems: [
      {
        id: 1,
        title: 'Fixação das Estruturas e Trilhos em Telhado Metálico',
        desc: 'Conferência de torque dos parafusos autobrocantes e vedação EPDM.',
        status: 'Concluído',
        requiredPhoto: true,
        photoAttached: true,
        photoDate: '18/10/2026 14:20',
        approvedByEngineering: true,
      },
      {
        id: 2,
        title: 'Assentamento e Grampeamento dos 80 Módulos 585W',
        desc: 'Alinhamento das strings, aperto dos grampos intermediários e terminais.',
        status: 'Concluído',
        requiredPhoto: true,
        photoAttached: true,
        photoDate: '19/10/2026 11:45',
        approvedByEngineering: true,
      },
      {
        id: 3,
        title: 'Instalação do Inversor Trifásico 40kW e String Box CC',
        desc: 'Montagem em parede ventilada, identificação de polaridade e DPS.',
        status: 'Concluído',
        requiredPhoto: true,
        photoAttached: true,
        photoDate: '19/10/2026 16:30',
        approvedByEngineering: true,
      },
      {
        id: 4,
        title: 'Aterramento e Teste de Continuidade Ôhmica (SPDA)',
        desc: 'Medição com terrômetro digital calibrado (< 10 ohms exigido).',
        status: 'Concluído',
        requiredPhoto: true,
        photoAttached: true,
        photoDate: '20/10/2026 09:15',
        approvedByEngineering: true,
      },
      {
        id: 5,
        title: 'Parametrização do Datalogger Wi-Fi e Conexão de Monitoramento',
        desc: 'Configuração da rede local, pareamento no portal solar e validação de telemetria.',
        status: 'Em Andamento',
        requiredPhoto: true,
        photoAttached: false,
        photoDate: null,
        approvedByEngineering: false,
      },
    ],
    gallery: [
      {
        id: 'G1',
        phase: 'Antes',
        title: 'Telhado do Galpão antes do início da montagem',
        date: '18/10/2026 08:30',
        author: 'Jorge Alencar',
        hash: 'c891a0...42',
      },
      {
        id: 'G2',
        phase: 'Durante',
        title: 'Trilhos fixados e início do cabeamento solar CC',
        date: '18/10/2026 15:40',
        author: 'Jorge Alencar',
        hash: 'b452e1...19',
      },
      {
        id: 'G3',
        phase: 'Durante',
        title: 'Módulos instalados no setor norte e conexões MC4',
        date: '19/10/2026 17:10',
        author: 'Jorge Alencar',
        hash: 'e780c2...91',
      },
      {
        id: 'G4',
        phase: 'Durante',
        title: 'Quadro CA, String Box e Inversor 40kW cabeados',
        date: '20/10/2026 10:00',
        author: 'Rodrigo Mendes',
        hash: 'f119e8...77',
      },
    ],
    handoverData: {
      measuredPowerKw: '38.2 kW (irradiância solar de 880 W/m²)',
      vocVoltage: '620 V (conforme projeto executivo)',
      iscCurrent: '9.2 A por string',
      customerTrainer: 'Carlos Eduardo da Silva Moura (Sócio)',
      technicalReportCode: 'REL-TEC-2026-0089',
    },
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
          <span style={{ fontSize: '0.75rem', color: '#52645c' }}>Piloto 3</span>
          <span style={{ color: '#d9e2de' }}>/</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#102a23' }}>
            Execução da Instalação & Campo (SPEC-010 / SPEC-015)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            href="/previews/oportunidade"
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
            <Icon name="trending_up" size={16} />
            <span>Ver Oportunidade</span>
          </Link>
        </div>
      </div>

      {/* Header Card da OS */}
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
                  backgroundColor: '#e2f3e9',
                  color: '#087443',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #087443',
                }}
              >
                {os.code}
              </span>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#102a23' }}>
                {os.title}
              </h1>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#52645c' }}>
              Projeto: <strong style={{ color: '#102a23' }}>{os.projectCode}</strong> • Cliente:{' '}
              {os.customer} • Período: {os.dates}
            </div>
          </div>

          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f4f7f5',
              borderRadius: '8px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#52645c' }}>Progresso dos Checklists</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#087443' }}>
              {os.progressPercent}% Concluído (4/5)
            </div>
          </div>
        </div>

        {/* Informações da Equipe de Campo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.75rem',
            padding: '0.75rem',
            backgroundColor: '#f4f7f5',
            borderRadius: '8px',
            fontSize: '0.75rem',
          }}
        >
          <div>
            <span style={{ color: '#52645c' }}>Responsável Técnico (ART): </span>
            <strong style={{ color: '#102a23' }}>{os.leadEngineer}</strong>
          </div>
          <div>
            <span style={{ color: '#52645c' }}>Equipe Instaladora: </span>
            <strong style={{ color: '#102a23' }}>{os.fieldTeam}</strong>
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
            onClick={() => setActiveTab('checklist')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'checklist' ? '2px solid #087443' : '2px solid transparent',
              color: activeTab === 'checklist' ? '#087443' : '#52645c',
              fontWeight: activeTab === 'checklist' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="checklist" size={16} />
            <span>Checklist & Evidências com Foto (5)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('galeria')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'galeria' ? '2px solid #087443' : '2px solid transparent',
              color: activeTab === 'galeria' ? '#087443' : '#52645c',
              fontWeight: activeTab === 'galeria' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <Icon name="photo_camera" size={16} />
            <span>Galeria Antes / Durante / Depois ({os.gallery.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('handover')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'handover' ? '2px solid #087443' : '2px solid transparent',
              color: activeTab === 'handover' ? '#087443' : '#52645c',
              fontWeight: activeTab === 'handover' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <Icon name="verified" size={16} />
            <span>Termo de Entrega & Comissionamento</span>
          </button>
        </div>
      </section>

      {/* Tab: Checklist Técnico com Fotos Obrigatórias */}
      {activeTab === 'checklist' && (
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
              Checklist Técnico de Montagem (SPEC-010 / SPEC-013)
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#52645c' }}>
              Cada etapa exige evidência fotográfica nítida antes da homologação final pela
              engenharia.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {os.checklistItems.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '1rem',
                  backgroundColor: item.status === 'Concluído' ? '#fafcfb' : '#ffffff',
                  borderRadius: '8px',
                  border: item.status === 'Concluído' ? '1px solid #d9e2de' : '1.5px solid #087443',
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
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: item.status === 'Concluído' ? '#e2f3e9' : '#fef3c7',
                        color: item.status === 'Concluído' ? '#087443' : '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {item.id}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#102a23' }}>
                      {item.title}
                    </span>
                    <span
                      style={{
                        backgroundColor: item.status === 'Concluído' ? '#e2f3e9' : '#fef3c7',
                        color: item.status === 'Concluído' ? '#045c34' : '#92400e',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#52645c', marginLeft: '2rem' }}>
                    {item.desc}
                  </div>

                  {item.photoAttached && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        color: '#087443',
                        marginTop: '0.375rem',
                        marginLeft: '2rem',
                      }}
                    >
                      <Icon name="check_circle" size={14} />
                      <span>Foto aprovada pela engenharia ({item.photoDate})</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexShrink: 0,
                  }}
                >
                  {item.photoAttached ? (
                    <button
                      type="button"
                      onClick={() => alert(`Visualizando foto do item: ${item.title}`)}
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
                      <span>Ver Foto</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoStep(item.id);
                        setIsPhotoModalOpen(true);
                      }}
                      style={{
                        padding: '0.4rem 0.75rem',
                        backgroundColor: '#087443',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        boxShadow: '0 2px 4px rgba(8, 116, 67, 0.2)',
                      }}
                    >
                      <Icon name="photo_camera" size={16} />
                      <span>Anexar Foto de Campo</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Galeria Antes / Durante / Depois */}
      {activeTab === 'galeria' && (
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
              Galeria de Evidências Fotográficas da Obra
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
              Registros sequenciais auditáveis armazenados no bucket S3 com integridade
              criptográfica.
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {os.gallery.map((photo) => (
              <div
                key={photo.id}
                style={{
                  border: '1px solid #d9e2de',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f4f7f5',
                }}
              >
                <div
                  style={{
                    height: '140px',
                    backgroundColor: '#e2f3e9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: '#087443',
                  }}
                >
                  <Icon name="photo_camera" size={32} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    Foto Registrada no Local
                  </span>
                </div>
                <div style={{ padding: '0.75rem', fontSize: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #d9e2de',
                        color: '#087443',
                        fontWeight: 700,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      {photo.phase}
                    </span>
                    <span style={{ color: '#52645c' }}>{photo.date}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#102a23', margin: '0.25rem 0' }}>
                    {photo.title}
                  </div>
                  <div style={{ color: '#52645c' }}>Autor: {photo.author}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Termo de Entrega & Comissionamento */}
      {activeTab === 'handover' && (
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
              Termo de Comissionamento e Entrega Técnica (Handover)
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
              Aferições elétricas finais em campo e assinatura de recebimento do cliente.
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '8px' }}>
              <div style={{ color: '#52645c' }}>Potência Gerada no Comissionamento</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#087443' }}>
                {os.handoverData.measuredPowerKw}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '8px' }}>
              <div style={{ color: '#52645c' }}>Tensão de Circuito Aberto (Voc)</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                {os.handoverData.vocVoltage}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f4f7f5', borderRadius: '8px' }}>
              <div style={{ color: '#52645c' }}>Corrente de Curto-Circuito (Isc)</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#102a23' }}>
                {os.handoverData.iscCurrent}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: handoverSigned ? '#e2f3e9' : '#f4f7f5',
              borderRadius: '8px',
              border: handoverSigned ? '1px solid #087443' : '1px solid #d9e2de',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#102a23' }}>
                {handoverSigned
                  ? 'Termo de Entrega Assinado e Concluído!'
                  : 'Aguardando Assinatura do Termo de Recebimento'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52645c' }}>
                Treinamento operacional ministrado a:{' '}
                <strong>{os.handoverData.customerTrainer}</strong>
              </div>
            </div>

            {!handoverSigned ? (
              <button
                type="button"
                onClick={() => setHandoverSigned(true)}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(8, 116, 67, 0.2)',
                }}
              >
                <Icon name="verified" size={16} />
                <span>Registrar Assinatura do Cliente</span>
              </button>
            ) : (
              <span
                style={{
                  backgroundColor: '#ffffff',
                  color: '#087443',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  border: '1px solid #087443',
                }}
              >
                Concluído & Arquivado no Dossiê
              </span>
            )}
          </div>
        </section>
      )}

      {/* Modal de Envio de Foto de Campo */}
      {isPhotoModalOpen && (
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
                Captura de Evidência de Campo (Item {photoStep})
              </h3>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div
              style={{
                border: '2px dashed #087443',
                borderRadius: '8px',
                padding: '2rem 1rem',
                textAlign: 'center',
                backgroundColor: '#f4f7f5',
                marginBottom: '1rem',
              }}
            >
              <Icon
                name="photo_camera"
                size={32}
                style={{ color: '#087443', marginBottom: '0.5rem' }}
              />
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                Tirar Foto com a Câmera ou Selecionar Arquivo
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52645c', marginTop: '0.25rem' }}>
                Enquadre com nitidez o datalogger e display do inversor aceso
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
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
                onClick={() => {
                  alert('Foto registrada com sucesso e enviada ao dossiê!');
                  setIsPhotoModalOpen(false);
                }}
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
                Confirmar Envio da Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

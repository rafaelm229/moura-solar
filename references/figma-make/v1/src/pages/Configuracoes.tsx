import React, { useState } from 'react';
import { IconUpload, IconCheck } from '../components/Icons';

const C = {
  bg: '#090B0A', surface: '#111412', card: '#161A17', elevated: '#1C211D',
  border: '#29302B', solar: '#FFD400', green: '#26D866', red: '#FF4D57',
  orange: '#FF9F1C', blue: '#3B82F6', text: '#F5F7F5', textSec: '#9BA49E',
  textDis: '#626A65',
};

const NAV_ITEMS = ['Geral', 'Empresa', 'Usuários', 'Integrações', 'Notificações', 'Segurança', 'Plano'];

function Field({ label, value, placeholder, type = 'text' }: { label: string; value?: string; placeholder?: string; type?: string }) {
  const [v, setV] = useState(value || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>{label}</label>
      <input type={type} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        style={{ height: 40, background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 14px', color: C.text, fontSize: 14, outline: 'none', transition: 'border-color 0.15s' }}
        onFocus={e => { e.target.style.borderColor = C.solar; }}
        onBlur={e => { e.target.style.borderColor = C.border; }}
      />
    </div>
  );
}

function Select({ label, value, options }: { label: string; value: string; options: string[] }) {
  const [v, setV] = useState(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>{label}</label>
      <select value={v} onChange={e => setV(e.target.value)}
        style={{ height: 40, background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 14px', color: C.text, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function Configuracoes() {
  const [activeNav, setActiveNav] = useState('Empresa');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', gap: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', minHeight: 600 }}>
      {/* Left nav */}
      <div style={{ width: 200, background: C.surface, borderRight: `1px solid ${C.border}`, padding: '20px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textDis, letterSpacing: 1, padding: '0 20px 12px' }}>CONFIGURAÇÕES</div>
        {NAV_ITEMS.map(item => (
          <button key={item} onClick={() => setActiveNav(item)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 20px', background: activeNav === item ? C.elevated : 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeNav === item ? 600 : 400, color: activeNav === item ? C.text : C.textSec, borderLeft: `2px solid ${activeNav === item ? C.solar : 'transparent'}` }}
            onMouseEnter={e => { if (activeNav !== item) (e.currentTarget as HTMLButtonElement).style.background = '#14181520'; }}
            onMouseLeave={e => { if (activeNav !== item) (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
            {item}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>
        {activeNav === 'Empresa' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Informações da Empresa</h2>
              <p style={{ fontSize: 13, color: C.textSec, margin: 0 }}>Configure os dados da sua empresa exibidos em propostas e documentos.</p>
            </div>

            {/* Logo upload */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textSec, display: 'block', marginBottom: 10 }}>Logo da Empresa</label>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 80, height: 80, background: C.elevated, border: `2px dashed ${C.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.solar; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}>
                  <div style={{ width: 60, height: 60, background: '#1A3300', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: C.solar }}>MS</div>
                </div>
                <div>
                  <button style={{ padding: '8px 16px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 7, cursor: 'pointer', color: C.text, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <IconUpload size={14} /> Fazer upload
                  </button>
                  <p style={{ fontSize: 11, color: C.textDis, margin: 0 }}>PNG, JPG ou SVG. Máx. 2MB. Recomendado: 200×200px</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Field label="Razão Social" value="Moura Solar Energia Ltda." />
              <Field label="Nome Fantasia" value="Moura Solar" />
              <Field label="CNPJ" value="12.345.678/0001-90" />
              <Field label="Inscrição Estadual" value="123.456.789.000" />
              <Field label="E-mail Comercial" value="contato@mourasolar.com.br" type="email" />
              <Field label="Telefone" value="(11) 4002-8922" />
            </div>

            <div style={{ height: 1, background: C.border, margin: '24px 0' }} />

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Endereço</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                <Field label="Logradouro" value="Rua das Palmeiras, 1450" />
                <Field label="Número / Complemento" value="Sala 304" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                <Field label="Cidade" value="São Paulo" />
                <Select label="Estado" value="SP" options={['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'CE', 'GO', 'DF']} />
                <Field label="CEP" value="01452-001" />
              </div>
            </div>

            <div style={{ height: 1, background: C.border, margin: '24px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              <Select label="Fuso Horário" value="America/Sao_Paulo (GMT-3)" options={['America/Sao_Paulo (GMT-3)', 'America/Manaus (GMT-4)', 'America/Belem (GMT-3)']} />
              <Select label="Formato de Moeda" value="R$ (Real Brasileiro)" options={['R$ (Real Brasileiro)', 'USD (Dólar Americano)', 'EUR (Euro)']} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSave} style={{ padding: '10px 24px', background: saved ? C.green : C.solar, border: 'none', borderRadius: 8, cursor: 'pointer', color: '#090B0A', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}>
                {saved ? <><IconCheck size={15} /> Salvo!</> : 'Salvar alterações'}
              </button>
              <button style={{ padding: '10px 20px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.textSec, fontSize: 14 }}>
                Cancelar
              </button>
            </div>
          </>
        )}

        {activeNav !== 'Empresa' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12 }}>
            <div style={{ fontSize: 36 }}>⚙️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{activeNav}</div>
            <div style={{ fontSize: 13, color: C.textSec }}>Esta seção está em desenvolvimento.</div>
          </div>
        )}
      </div>
    </div>
  );
}

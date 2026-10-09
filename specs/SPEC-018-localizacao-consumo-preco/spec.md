# SPEC-018 — Localização, consumo, cálculo solar e preço

**Versão:** 0.1.0

**Data:** 07/10/2026

**Status:** Escopo de roadmap; integrações e políticas em especificação

**Fase:** R5

**Dependências:** SPEC-004, SPEC-005, SPEC-014, SPEC-016 e SPEC-017

## Objetivo

Separar responsabilidades do DesignModule sem duplicar consumo nem romper
cálculos e snapshots. Location Intelligence fornece referência/localização;
Consumption controla leituras e revisões; Solar Engine calcula; Pricing decide
composição comercial conforme alçadas; Project/Oportunity usa referências.

## Dados e proveniência

| Domínio               | Dados e regra                                                                       |
| --------------------- | ----------------------------------------------------------------------------------- |
| Localização           | CEP/endereço, coordenadas, município/código IBGE e fuso; revisão manual e confiança |
| Referências elétricas | Distribuidora, tarifa, data/validade e fonte; dados ANEEL quando adequados          |
| Irradiação            | Série/região/orientação/periodicidade/unidade, versão e origem                      |
| Consumo               | Histórico de 12 meses quando disponível, UC, unidade, leitura, revisão e origem     |
| Cálculo               | Potência, equipamentos, perdas/hipóteses, geração estimada e versão do motor        |
| Preço                 | BOM, serviços, custos adicionais, margem, desconto, alçada e validade               |

Fonte, consulta, versão, unidade e ajuste manual permanecem auditáveis.
API/provedor de CEP, geocoding, IBGE, ANEEL e irradiação será escolhido por avaliação
de cobertura, licença, custo, disponibilidade e compatibilidade. Não assumir que
endereço/CEP sozinho identifica tarifa, distribuidora ou instalação elétrica.

## Regras preservadas

EnergyReading permanece a fonte única de consumo, com revisões/proveniência
atuais. Falta de leitura não vira zero. Propostas e contratos usam snapshot
versionado, não recálculo com tarifa/preço atual. Valores monetários usam decimal.
Fórmulas, on-grid/off-grid/híbrido, mono/trifásico, perdas e baterias seguem
SPEC-005 e validação técnica; nenhuma integração muda fórmula silenciosamente.

Projetos-base por consumo são templates versionados: edição de potência,
módulos/inversor/tipo/tarifa usa dados do catálogo e regras do motor.
Integrações externas podem sugerir, mas conflito crítico exige revisão.
Indisponibilidade do provedor tem retentativa/fallback explícito, sem dado inventado.

## Importação de contas

A SPEC-014 continua governando intake durável, tentativas/candidatos, detecção
de duplicidade, revisão humana, UC, confirmação transacional e fencing.
O fluxo vigente mantém transcrição, revisão e confirmação manuais, conforme a
[ADR-008](../../docs/adr/ADR-008-importacao-manual-sem-ocr.md). Reutilizar o
dossiê e os mecanismos de intake e confirmação existentes; não preparar OCR,
worker de extração, provedor ou automação para essa atividade. ImportOutbox já
presente não equivale a barramento genérico operacional.

## Requisitos e aceite

| ID     | Critério                                                                           |
| ------ | ---------------------------------------------------------------------------------- |
| LCP-01 | Localização mostra origem/confiança e permite correção auditada                    |
| LCP-02 | Tarifa/distribuidora/irradiação têm data, versão e unidade                         |
| LCP-03 | Consumo manual/importado converge para EnergyReading sem cópia paralela            |
| LCP-04 | Mesma entrada/versão produz cálculo reproduzível; cenários da SPEC-005 preservados |
| LCP-05 | Preço respeita alçada e snapshot; custo técnico não vira realizado automaticamente |
| LCP-06 | Falha externa/campo ausente não confirma informação fictícia                       |
| LCP-08 | UC/cliente/projeto mantêm escopo e autorização entre domínios                      |

Requisitos de OCR e extração automática preservados na SPEC-014 são históricos
e não fazem parte do aceite vigente de R5.

## Tarefas

- [ ] Inventariar serviços/cálculos e políticas atuais.
- [ ] Aprovar contratos/fonte/provedor por integração.
- [ ] Definir schemas/unidades/proveniência/validade e revisão.
- [ ] Separar consumo, motor solar e preço com adaptadores.
- [ ] Validar projetos-base, perdas e categorias técnicas aplicáveis.
- [ ] Preservar entrada e transcrição manual de contas com o original no dossiê.

Referências: [Roadmap](../../docs/roadmap-refatoracao.md),
[Registro](../../docs/registro-features.md), [SPEC-005](../SPEC-005-dimensionamento-custos/spec.md).

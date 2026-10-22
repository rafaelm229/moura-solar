# Relatório de Preparação e Validação dos Pilotos Visuais de UX — Lote 1

**Data de Validação:** 02/10/2026  
**Branch de Execução:** `feat/evolucao-lote-1-pilotos`  
**Branch Base / Baseline Lote 0:** `feat/evolucao-lote-0-baseline` (`49ddfd171c22b0aee7c93091ef573411f2c2f65d`)  
**Ambiente de Homologação:** Next.js v15.5.26, React 19, Google Material Symbols Outlined (SVG), Playwright v1.63.0.

---

## 1. Visão Geral e Estratégia de Isolamento

Em estrita conformidade com as diretrizes do plano de evolução e das especificações **SPEC-003 v0.3.0**, **SPEC-013**, **SPEC-014** e **SPEC-015**, todos os três pilotos visuais foram implementados de forma **completamente isolada** sob a rota `/previews/*`.

> [!IMPORTANT]
> **As telas operacionais existentes (`/`, `/features/...`) permanecem 100% intactas.**  
> Nenhuma rota de produção foi modificada antes da homologação e aprovação expressa do usuário. Toda a experiência visual piloto utiliza dados representativos estáticos para validação da ergonomia de fluxo, densidade de dados e responsividade.

---

## 2. Princípios de Design System Aplicados (SPEC-003)

1. **Identidade Visual Institucional White & Green:**
   - Cor primária institucional: Verde Moura `#087443` (com hover `#045c34` e fundos sutis `#e2f3e9`).
   - Cor de destaque operacional / atenção solar: `#f59e0b` / `#92400e` (com contraste mínimo WCAG 2.2 AA).
   - Superfície e Canvas: Fundo limpo `#f4f7f5`, cards em branco puro `#ffffff`, bordas estruturais em cinza neutro `#d9e2de`.
2. **Hierarquia Tipográfica Contida:**
   - Máximo de **3 tamanhos visuais** por tela:
     - Título Principal de Seção / Entidade: `1.25rem` (20px) Bold.
     - Subtítulos e Texto de Leitura / Inputs: `0.875rem` (14px) Regular / Semibold.
     - Legendas, Metadados, Badges e Auxiliares: `0.75rem` (12px) Medium.
3. **Erradicação Completa de Emojis:**
   - Substituição de 100% dos emojis da interface por ícones acessíveis em SVG via componente dedicado (`MaterialSymbol` / `Icon`), com suporte a atributos `aria-hidden` e labels de acessibilidade para leitores de tela.
4. **Responsividade Estrita (360px a 1440px):**
   - Todos os layouts foram projetados e validados com largura exata de viewport, eliminando vazamentos de largura e scroll horizontal não intencional em viewports de 360px (mobile), 768px (tablet) e 1440px (desktop).
   - Barras de abas e esteiras de estágios utilizam container de rolagem horizontal nativo com toque fluido (`WebkitOverflowScrolling: 'touch'`), sem forçar a expansão do grid principal.

---

## 3. Os 3 Pilotos Implementados

### 3.1 Piloto 1: Ficha do Cliente (`/previews/cliente`)

- **Especificações:** SPEC-013 e SPEC-014.
- **Funcionalidades Navegáveis:**
  - Identificação cadastral completa: Razão Social, Nome Fantasia, Código CLI, CNPJ, Inscrição Estadual, Representante Legal, Cargo, CPF e Endereço Físico / Rural.
  - Painel de Múltiplos Contatos: WhatsApp comercial, telefone fixo, e-mail comercial e e-mail financeiro com marcação de canal principal.
  - Abas Organizacionais:
    - **Dados Gerais & Contatos:** visão consolidada dos dados societários e canais de comunicação.
    - **Unidades Consumidoras & Histórico (UCs):** dados de 2 unidades vinculadas com histórico de 12 meses de consumo (kWh), valor médio de conta e sazonalidade.
    - **Dossiê Documental:** relação de faturas, procurações e documentos cadastrais com opções de download e conferência.
  - **Fluxo de Importação Assistida de Conta de Energia (OCR IA):** modal interativo demonstrando a leitura de faturas (Cemig Distribuição), extração automática de dados de consumo, número da UC e conferência antes do salvamento.

### 3.2 Piloto 2: Detalhe da Oportunidade (`/previews/oportunidade`)

- **Especificações:** SPEC-013 e SPEC-015.
- **Funcionalidades Navegáveis:**
  - Cabeçalho Comercial: Código do projeto, título descritivo do gerador fotovoltaico (45 kWp), cliente vinculado, valor fechado de contrato (R$ 142.500,00) e vendedor responsável.
  - **Esteira Visível de Estágios:** visualização horizontal de todas as fases da negociação (`Novo` → `Qualificado` → `Levantamento` → `Dimensionamento` → `Proposta` → `Negociação` → `Contratação` → `Vendido` → `Em Obras` → `Concluído`).
  - **Central de Atenção & Alertas:** aviso em destaque de trava de esteira (`Gate FINANCIAL`: entrada pendente de liquidação impedindo liberação do estoque e agendamento da obra) com botão para **Resolução Justificada com Trilha de Auditoria**.
  - **Frentes Operacionais Paralelas (SPEC-015 Item 13):**
    - Frente Contratual: minuta emitida aguardando assinatura.
    - Frente Financeira: entrada de R$ 42.750,00 em conciliação.
    - Frente Engenharia & Homologação: protocolo Cemig em prazo legal com ART emitida.
    - Frente Materiais & Estoque: reserva centralizada de 80 módulos e inversor sob código RSV-089.
    - Frente Instalação & Obras: equipe pré-alocada aguardando desfecho dos gates.
  - **Dossiê de Contratos & Minutas:** acesso às minutas editáveis (DOCX) e contratos de assinatura formal (PDF), histórico de versões emitidas e log de envios por WhatsApp / e-mail.

### 3.3 Piloto 3: Execução da Instalação (`/previews/instalacao`)

- **Especificações:** SPEC-010 e SPEC-015.
- **Funcionalidades Navegáveis:**
  - Cabeçalho Operacional: Número da Ordem de Serviço (OS-2026-0312), Engenheiro Responsável Técnico (ART), Equipe Instaladora de Campo e cronograma de execução.
  - Indicador de Progresso: 80% dos checklists concluídos (4/5).
  - **Checklists Técnicos de Campo:**
    1. Fixação das Estruturas e Trilhos em Telhado Metálico (Concluído com foto aprovada).
    2. Assentamento e Grampeamento dos 80 Módulos 585W (Concluído com foto aprovada).
    3. Instalação do Inversor Trifásico 40kW e String Box CC (Concluído com foto aprovada).
    4. Aterramento e Teste de Continuidade Ôhmica (SPDA) (Concluído com foto aprovada).
    5. Parametrização do Datalogger Wi-Fi e Telemetria (Em Andamento com botão de envio).
  - **Modal Interativo de Registro de Foto:** upload de evidência de campo com captura de observações, data/hora e conformidade técnica.
  - **Galeria Documental Antes / Durante / Depois:** galeria de fotos com tags de aprovação pela engenharia.
  - **Termo de Entrega Técnica e Comissionamento:** termo final com declaração de teste de injeção e aceite do cliente.

---

## 4. Matriz de Evidências Visuais Capturadas

Todas as capturas foram obtidas com renderização real no Chromium via Playwright e encontram-se persistidas no diretório `docs/evidencias/lote-1/`:

| Tela / Piloto                  | Viewport Desktop (1440×900)                                                                          | Viewport Tablet (768×1024)                                                                        | Viewport Mobile (360×800)                                                                         |
| :----------------------------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| **Hub Central de Previews**    | [`hub-previews-1440.png`](./hub-previews-1440.png) (1440×926)                                        | [`hub-previews-768.png`](./hub-previews-768.png) (768×1753)                                       | [`hub-previews-360.png`](./hub-previews-360.png) (360×2734)                                       |
| **1. Ficha do Cliente**        | [`piloto-cliente-visao-geral-1440.png`](./piloto-cliente-visao-geral-1440.png) (1440×900)            | [`piloto-cliente-visao-geral-768.png`](./piloto-cliente-visao-geral-768.png) (768×1024)           | [`piloto-cliente-visao-geral-360.png`](./piloto-cliente-visao-geral-360.png) (360×880)            |
| **2. Detalhe da Oportunidade** | [`piloto-oportunidade-visao-geral-1440.png`](./piloto-oportunidade-visao-geral-1440.png) (1440×1118) | [`piloto-oportunidade-visao-geral-768.png`](./piloto-oportunidade-visao-geral-768.png) (768×1179) | [`piloto-oportunidade-visao-geral-360.png`](./piloto-oportunidade-visao-geral-360.png) (360×1254) |
| **3. Execução da Instalação**  | [`piloto-instalacao-visao-geral-1440.png`](./piloto-instalacao-visao-geral-1440.png) (1440×1090)     | [`piloto-instalacao-visao-geral-768.png`](./piloto-instalacao-visao-geral-768.png) (768×1245)     | [`piloto-instalacao-visao-geral-360.png`](./piloto-instalacao-visao-geral-360.png) (360×1598)     |

---

## 5. Status de Verificação de Código e Integridade

- `pnpm prettier --check`: **100% Formatado** (sem divergências de formatação).
- `pnpm lint`: **0 Erros / 0 Avisos** em todos os 8 pacotes da monorepo.
- `pnpm typecheck`: **100% Aprovado** no Next.js e NestJS (TypeScript estrito).
- `pnpm test`: **1185 testes unitários passando** sem regressões.
- `pnpm build`: **Build de produção compilado com sucesso** em todos os pacotes.
- **Git Commit de Referência para Rollback:** `49ddfd171c22b0aee7c93091ef573411f2c2f65d`.

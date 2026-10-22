# Evidências do M3 — Histórico de Consumo, Dimensionamento Solar, Catálogo e Composição de Custos/Margens

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação                    | Resultado                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `pnpm check`                   | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) aprovados                |
| Unitários                      | 9 testes do motor de dimensionamento, fórmulas de markup/margem e governança (`design.spec.ts`)      |
| `tests/design.integration.mjs` | 8 cenários HTTP/PostgreSQL de leituras, correções, concorrência e dimensionamento aprovados          |
| `pnpm test:migrations`         | Upgrade até SPEC-013 preserva leitura existente ao iniciar versionamento; reaplicação segura         |
| `tests/e2e/design.spec.ts`     | 4 jornadas E2E em 360, 768, 1024 e 1440 px validam consumo, correção e histórico                     |
| Governança de Margem           | Distinção estrita de Markup e Margem Bruta; trava de alçada < 20% com justificativa obrigatória      |
| Imutabilidade de Versão        | Versão aprovada (`APPROVED`) é congelada; nova versão gera clone incremental a partir da aprovada    |
| Histórico de Consumo           | Alerta proeminente com contagem de meses quando histórico < 12 meses (SPEC-005 item 16)              |
| Correção de Leitura            | Duplicata retorna conflito; correção explícita cria nova versão, mantém a anterior e exige motivo    |
| Catálogo de Equipamento        | Módulos fotovoltaicos, inversores, estruturas e serviços com custos base e especificações técnicas   |
| Responsividade Total           | Zero overflow horizontal em 360px (mobile) e 1440px (desktop), menus adaptativos e cards responsivos |

## Jornadas e Cenários Validados

1. **Histórico de Consumo e Levantamento Técnico (FV1.4):**
   - Cadastro e vinculação da Unidade Consumidora (UC) à oportunidade comercial.
   - Lançamento de leituras mensais de energia (kWh e valor faturado R$).
   - Repetição da competência ativa retorna 409 sem sobrescrever dados.
   - Correção explícita exige motivo e versão esperada, mantém a anterior como `SUPERSEDED` e mostra seu valor no histórico.
   - Exibição em tabela no desktop e cards responsivos no mobile (< 768px).
   - Cálculo automático de consumo médio mensal e consumo anualizado projetado.
   - **Critério SPEC-005 (item 16):** Alerta proeminente em tela indicando histórico incompleto caso haja menos de 12 meses cadastrados (`2 / 12 meses`).
   - Ciclo de levantamento técnico da vistoria (`DRAFT` → `COMPLETED`) com registro de tipo de telhado, orientação e concessionária.

2. **Dimensionamento Solar e Catálogo (FV1.5):**
   - Catálogo com módulos monocristalinos/bifaciais, inversores string/microinversores e serviços de homologação/instalação.
   - Motor de sugestão técnica na API NestJS: cálculo automatizado de potência pico recomendada (kWp), geração estimada mensal, quantidade ideal de módulos e inversores compatíveis.
   - Geração de dimensionamento a partir da sugestão assistida ou montagem livre de lista de materiais (BOM).

3. **Composição de Custos, Margens e Governança de Alçada (FV1.6):**
   - Distinção estrita entre **Markup sobre o Custo** e **Margem Bruta sobre Preço de Venda** (`Preço = Custo / (1 - Margem)`).
   - Rateio de custos adicionais (frete, homologação de projeto na concessionária, instalação e fixação).
   - **Critério SPEC-005 (item 9):** Trava de alçada ativada automaticamente quando margem bruta < 20%, bloqueando a aprovação até que seja fornecida justificativa técnica/comercial explícita (`overrideMarginJustification`).
   - **Critério SPEC-005 (item 8):** Imutabilidade de versões aprovadas: uma vez aprovada, a versão é congelada para novas edições, exigindo a criação de uma nova versão sequencial (`v2`) que herda os itens da versão anterior.

4. **Jornada Ponta a Ponta Playwright (360, 768, 1024 e 1440px):**
   - Execução completa da jornada (autenticação, cliente, oportunidade, UC, leitura duplicada, correção versionada, vistoria técnica concluída, sugestão de dimensionamento, ajuste de markup para 10%, disparo da trava de margem, justificativa de alçada, aprovação com congelamento e clonagem de versão v2).
   - Validação de layout e ausência de scroll horizontal em 360x800, 768x1024, 1024x900 e 1440x900.

## Capturas representativas

- [Dimensionamento, Consumo e Precificação — 360 px (Mobile)](dimensionamento-360.png)
- [Dimensionamento, Consumo e Precificação — 768 px (Tablet)](dimensionamento-768.png)
- [Dimensionamento, Consumo e Precificação — 1024 px (Notebook)](dimensionamento-1024.png)
- [Dimensionamento, Consumo e Precificação — 1440 px (Desktop)](dimensionamento-1440.png)

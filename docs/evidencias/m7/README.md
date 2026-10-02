# Evidências do M7 — Estoque, Compras, Suprimentos, Depósitos e Custo Médio Ponderado (SPEC-009)

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação                         | Resultado                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                        | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) 100% aprovados                     |
| Unitários API                       | Testes no motor de movimentação, reserva, recálculo de CMP (Custo Médio Ponderado) e rastreabilidade serial    |
| `tests/inventory.integration.mjs`   | 7 cenários HTTP/PostgreSQL completos de depósitos, pedidos de compra, recebimento, reservas e consumo de campo |
| `pnpm test:migrations`              | Upgrade sequencial M0 a M7 preserva integridade; reaplicação idempotente aprovada                              |
| Reservas e Gate D                   | Reserva automática vinculada à oportunidade com decremento atômico de estoque disponível                       |
| Rastreabilidade de Números de Série | Rastreamento estrito de seriais para inversores e módulos fotovoltaicos desde a entrada até a OS de instalação |
| Transferência e Auditoria           | Movimentação entre depósitos (Central, Obra, Viatura) com log de auditoria e recálculo contábil                |

## Jornadas e Cenários Validados

1. **Gestão de Depósitos e Localizações:**
   - Criação e manutenção de locais de estoque (`CENTRAL_WAREHOUSE`, `PROJECT_SITE`, `VEHICLE`).
   - Identificação física, capacidade e isolamento por filial/organização.

2. **Catálogo de Suprimentos e Itens:**
   - Cadastro de módulos, inversores, estruturas, cabos e quadros de proteção.
   - Associação com fornecedores homologados e histórico de preços de aquisição.

3. **Ordens de Compra e Entrada de Mercadorias:**
   - Fluxo completo de cotação, aprovação e recebimento de ordens de compra (`PURCHASE_ORDER`).
   - Atualização do Custo Médio Ponderado (CMP / WAC) na entrada de novos lotes.
   - Registro individualizado de números de série para equipamentos controlados.

4. **Reserva para Projetos e Esteira Comercial:**
   - Alocação e reserva de materiais por oportunidade aprovada (`RESERVED`).
   - Validação de saldo disponível (`availableStock = currentStock - reservedStock`).
   - Bloqueio contra sobre-alocação e consistência para o Gate D.

5. **Consumo em Instalação e Baixa de Campo:**
   - Baixa de materiais no momento da execução da Ordem de Serviço (M8).
   - Associação definitiva dos números de série à usina instalada do cliente.
   - Movimentação do tipo `OUT` (Consumo de Obra) com rastreabilidade total.

# Mapa de navegação e rotas — SPEC-003

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Requisitos UX-06 a UX-10. URLs abaixo são propostas de rotas reais, ainda não implementadas. A base possui `app/page.tsx` com Workspace e seleção local. Não declarar rotas existentes por constarem neste mapa.

## Destinos e inventário de preservação

| Módulo/fonte atual | Recursos preservados                                                                                                                        | Destino/rotas propostas                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 identity        | Login, convites/recuperação, logout, pessoas, convites/bloqueio, revogação de sessões de terceiros, equipes, papéis/permissões e auditoria  | `/login`, `/acesso`, `/configuracoes/pessoas`, `/configuracoes/pessoas/[userId]/sessoes`, `/configuracoes/equipes`, `/configuracoes/papeis`, `/configuracoes/auditoria`                                                      |
| M1 conta           | Minhas sessões e perfil/contexto do usuário                                                                                                 | Menu da conta: `/conta/perfil`, `/conta/sessoes`; não inventar edição de perfil ausente                                                                                                                                      |
| M2 commercial      | Clientes, contatos, endereços, UCs, arquivo/restauro, oportunidade/funil, qualificar/perder/reabrir, atividades/concluir/reagendar/cancelar | `/comercial/clientes`, `/comercial/clientes/[clienteId]`, `/comercial/clientes/[clienteId]/ucs/[ucId]`, `/comercial/oportunidades`, `/comercial/oportunidades/[oportunidadeId]`, `/comercial/funil`, `/comercial/atividades` |
| M3 design          | Consumo, levantamento, sugestão solar, dimensionamento/versões/aprovação, composição/custos e catálogo                                      | Abas `consumo`, `levantamento`, `dimensionamento` na oportunidade; `/suprimentos/catalogo`; manutenção em `/configuracoes/catalogo` com mesmas permissões                                                                    |
| M4 proposal        | Criar/editar versões, gerar PDF, registrar envio, aceitar/rejeitar, revisar e baixar                                                        | `/comercial/propostas`, `/comercial/propostas/[propostaId]`; aba proposta da oportunidade                                                                                                                                    |
| M5 contract        | Criar, editar minuta, revisar/aprovar, envio, assinado/conferência, aditivo/cancelar, DOCX/PDF                                              | `/comercial/contratos`, `/comercial/contratos/[contratoId]`; aba contrato da oportunidade                                                                                                                                    |
| M6 financial       | Painel global, contas financeiras, plano/parcelas, recebimento/estorno, pagar/pagamentos, comissões, fluxo e gate                           | `/financeiro`, `/financeiro/receber`, `/financeiro/pagar`, `/financeiro/comissoes`, `/financeiro/fluxo-caixa`, `/financeiro/oportunidades/[oportunidadeId]`; contas em `/configuracoes/financeiro`                           |
| M7 inventory       | Saldos, locais, movimentos, reservas/liberação, compras/aprovação/recebimento, fornecedores, seriais                                        | `/suprimentos/estoque`, `/suprimentos/movimentos`, `/suprimentos/reservas`, `/suprimentos/compras`, `/suprimentos/fornecedores`, `/suprimentos/seriais`; locais em `/configuracoes/estoque`                                  |
| M8 engineering     | Projetos, executivo/versões/aprovação, ART, homologação, agenda/OS, atribuição, estados/pausa, checklist/foto/medição, entrega              | `/projetos`, `/projetos/[projetoId]`, `/projetos/[projetoId]/engenharia`, `/projetos/[projetoId]/homologacao`, `/projetos/agenda`, `/projetos/instalacoes/[ordemId]`                                                         |
| M9 after-sales     | Chamados/triagem/interações/status, garantias/RMA, visitas/orçamento/aceite, monitoramento/leituras/incidentes/restauração                  | `/pos-venda/chamados`, `/pos-venda/chamados/[chamadoId]`, `/pos-venda/garantias`, `/pos-venda/monitoramento`                                                                                                                 |
| M10 automations    | Atenção/criar/resolver/descartar/status, indicadores/metas, notificações/leitura/preferências                                               | `/inicio`, `/inicio/pendencias`, `/inicio/indicadores`, `/inicio/metas`, `/inicio/notificacoes`, `/conta/notificacoes`                                                                                                       |
| M10 administração  | Regras/versões/ativação, execuções/reprocessamento, avaliar eventos, recalcular projeções                                                   | `/configuracoes/automacoes`, `/configuracoes/automacoes/execucoes`; falhas acionáveis também em pendências diárias                                                                                                           |
| Novos SPEC-013/014 | Dossiê, conta e revisão da importação                                                                                                       | `/comercial/clientes/[clienteId]/documentos`, `/comercial/clientes/[clienteId]/importacoes/[importacaoId]`                                                                                                                   |

Recursos descritos nas specs anteriores mas sem tela/comando comprovado (por exemplo, inventário físico completo, projetos-base e algumas políticas administrativas) permanecem no backlog de seus módulos. Este mapa não declara sua entrega nem os remove do produto. Antes de cada lote, enumerar botões/abas efetivamente presentes nos arquivos features e respectivos endpoints; comparar antes/depois e tratar qualquer omissão como bloqueio. Listagens novas podem inicialmente reutilizar consulta contextual, sem criar registros paralelos.

## Configurações e conta

Cabeçalho/menu secundário “Configurações”, ícone settings, nome acessível “Abrir configurações”. Agrupar pessoas, papéis, equipes, auditoria, cadastros, contas financeiras, depósitos e regras. Operação de compra, recebimento, trabalho de equipe, tarefas e notificações continua nos destinos diários. Configurar metas pode exigir autorização própria, mas acompanhar metas fica em Início. Sessões e preferências pessoais ficam no menu da conta.

## Mobile por perfil

| Perfil                | Até quatro atalhos, filtrados por permissões efetivas   | Quinto |
| --------------------- | ------------------------------------------------------- | ------ |
| Administrador/Gerente | Início, Oportunidades, Projetos, Pendências             | Mais   |
| Vendedor              | Início, Atividades, Clientes, Propostas                 | Mais   |
| Financeiro            | Início, Receber, Pagar, Fluxo de caixa                  | Mais   |
| Estoquista            | Início, Reservas, Estoque, Movimentos                   | Mais   |
| Instalador            | Hoje (agenda filtrada), Agenda, Instalações, Pendências | Mais   |
| Engenharia            | Início, Projetos, Homologação, Pendências               | Mais   |
| Suporte delegado      | Início, Chamados, Garantias, Pendências                 | Mais   |

Papel híbrido escolhe prioridade sugerida; remover atalho sem permissão e preencher apenas com destino autorizado. Nunca usar os primeiros índices de destinations. Menu Mais mantém todos os destinos autorizados, Configurações e conta. Perfil não concede permissões. Sem atalho aplicável, Início mostra orientação e recursos autorizados, não um painel administrativo presumido.

## Contrato de rotas e migração Next.js

Criar futuramente `apps/web/src/app/(workspace)/layout.tsx` com shell, provider estável de QueryClient e verificação de sessão. Cada caminho acima corresponde a diretório e `page.tsx`; colchetes são segmentos dinâmicos reais (por exemplo `(workspace)/comercial/clientes/[clienteId]/page.tsx`). Route group não entra na URL. `/` resolve para `/inicio` após verificação. As abas usam subrotas ou `?aba=consumo`; uma só convenção por entidade, registrada no catálogo de links. Filtros `q`, `estado`, `responsavel`, `pagina` e aba devem ser validados; URL não leva CPF, tokens ou dados documentais.

Reutilizar `identity/client.ts`: cookies, credentials, x-requested-with, refresh coordenado e distinção 401/rede. Mover provider não o recria a cada rota. Preservar chaves de query e invalidações; limpar cache por logout/troca de organização e impedir dados anteriores no primeiro render. APIs continuam autorizando todo acesso.

Deep link sem sessão retorna ao caminho relativo validado após login. `returnTo` só aceita caminho interno permitido, nunca origem externa ou `//host`. Convites atuais `#access` mantêm compatibilidade e removem o token da URL após uso; não copiar para returnTo. Entidade fora do escopo responde 404 sem vazar existência; 403 serve para falta de capacidade geral. Não confundir erro de rede com expiração.

Usar Link/router para histórico real; atualizar página não perde entidade/aba. Voltar recupera filtros e posição. Coordenador de formulário sujo cobre links, tabs, voltar/avançar e saída da página: salvar rascunho quando suportado, permanecer ou descartar explicitamente. `beforeunload` é proteção complementar, não garantia no mobile. Rascunho confirmado fica na API; não prometer offline. Guardar texto temporário em memória não o torna persistido.

Durante migração, adaptar uma rota por vez ao componente existente; nenhuma dualidade de estado visual/URL para o mesmo destino. Rollback deve manter resolução das URLs já publicadas para a superfície antiga com contexto, sem quebrar bookmarks. Validar retorno por notificações e ações da jornada.

Referência técnica consultada: [Next.js — layouts e páginas](https://nextjs.org/docs/app/getting-started/layouts-and-pages). Compatibilidade será verificada contra a versão instalada antes da implementação.

# Componentes e layouts — SPEC-003

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Requisitos UX-03, UX-10 e UX-12. Não presumir que o catálogo abaixo já está implementado.

| Família                         | Contrato de interação                                                                                  | Mobile e acessibilidade                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Button/IconButton               | primary, secondary, destructive, loading e disabled; um submit por intenção                            | Texto nas ações importantes, foco e alvo 44/48 px                                    |
| FormField/Input/Select/Combobox | label, ajuda, obrigatório, erro por campo e resumo; preservar valor ao falhar                          | Coluna única, teclado apropriado, erro associado por aria-describedby                |
| Feedback/Alert/Toast            | confirmação persistente para comandos; erro recuperável com retentativa; toast não é único diagnóstico | Anúncio sem roubar foco; rede não significa logout                                   |
| DataTable/MobileCardList        | ordenação estável, paginação, total, ações nomeadas por registro                                       | Cartão mantém todos os dados no detalhe; tabela técnica pode rolar em região nomeada |
| FilterBar/Search/Pagination     | filtros na URL, limpar explícito, busca com atraso e cancelamento de resposta obsoleta                 | Painel de filtros com resumo e contagem; preservar posição ao retornar               |
| EntityHeader/ContextTabs        | identidade, estado real, responsável, prazo, ação e bloqueios; aba com URL                             | Seletor/abas roláveis, sem esconder capacidade                                       |
| Dialog/Drawer/Panel             | Modal para confirmação curta; drawer para edição curta; página para fluxo longo                        | Focus trap, Escape seguro, retorno ao acionador; aviso de alteração                  |
| FileUploader/CameraCapture      | limites antes do envio, progresso por arquivo, cancelar, retomar e falha                               | Câmera com alternativa de seletor; não prometer salvo antes de READY                 |
| DocumentViewer/Gallery          | versão, autor, categoria, anterior/próxima, zoom e download autenticado                                | PDF com alternativa de download; miniaturas por fase e descrição                     |
| MetricCard/Chart                | fonte, unidade, período/fuso, filtros, atualização e definição                                         | Tabela/texto equivalente; ausência não vira zero                                     |
| Timeline/Checklist              | autor, momento, contexto, rascunho versus confirmação                                                  | Navegação por seções; último item e ação livres de barras                            |

Estados de página: carregamento inicial com estrutura estável; atualização mantém dados anteriores identificados; vazio inicial orienta ação permitida; vazio filtrado permite limpar; erro recuperável preserva entrada; validação foca resumo/campo; conflito oferece recarregar e reaplicar; acesso negado não revela dados; arquivado mostra motivo e ações permitidas; sessão inválida confirmada retorna ao login. Nenhum skeleton ou overlay bloqueia indefinidamente o foco.

Confirmação de comando mostra entidade, versão, consequência e requisitos; após resposta atualiza listas, detalhe e jornada. Pagamentos mostram valor, conta, data e projeto. Estados e validações vêm da API, não de uma segunda máquina visual.

A migração reaproveita Feedback, cliente gerado, React Query e formulários atuais onde compatíveis. Extrair somente componentes afetados. Não condicionar início a fragmentar todos os arquivos, trocar todos os formulários ou introduzir biblioteca nova.

## Continuidade de Material Design — 07/10/2026

Conforme SPEC-003 v0.4.0, preservar Material Design e identidade Moura Solar.
Reutilizar valores e componentes compatíveis aplicados no código; a tabela acima
é proposta, não inventário de implementação. Mapear tokens sem troca global de CSS
ou adoção automática de biblioteca. Superfícies sólidas, elevação moderada, foco,
contraste e estados completos substituem qualquer intenção anterior de Liquid Glass.

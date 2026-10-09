# Prova de conceito de extração — SPEC-014

**Status:** Aprovada para implementação em 05/10/2026

**Versão:** 0.1.0

**Data:** 02/10/2026

**Histórico, não executar:** a proposta foi encerrada sem envio de contas ou
chamada a provedor pela [ADR-008](../../docs/adr/ADR-008-importacao-manual-sem-ocr.md).
O registro [POC-01](../../docs/decisao-poc-01-importacao-energia-2026-10-09.md)
preserva a decisão intermediária por Azure e os limites pesquisados, agora
supersedidos. A operação vigente continua manual.

Requisito IMP-11. Pesquisa documental realizada em 02/10/2026; nenhuma conta foi enviada, nenhum serviço contratado e nenhum benchmark executado.

## Fontes oficiais e limites verificados

| Alternativa                 | Evidência consultada                                                                                                                                                                                                                                                         | Implicação para a PoC                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Google Document AI          | [Lista de processadores](https://docs.cloud.google.com/document-ai/docs/processors-list): OCR lista português Brasil/Portugal; Custom Extractor lista pt, mas a nota de extração generativa limita suporte oficial a inglês                                                  | Fixar tipo/versão/região; não extrapolar OCR pt para todo modelo generativo; testar extração customizada compatível e registrar limitações |
| Google — privacidade        | [Security and compliance](https://docs.cloud.google.com/document-ai/docs/security): informa não usar conteúdo do cliente para treinar seus modelos                                                                                                                           | Revisar termos, localização e versão concretos; não presumir residência brasileira ou política idêntica entre versões                      |
| Google — custo              | [Pricing](https://cloud.google.com/products/document-ai/pricing): Custom Extractor sob demanda indica US$ 30 por 1.000 páginas na faixa inicial                                                                                                                              | Referência ilustrativa, não orçamento aprovado; verificar região/SKU, treinamento/hospedagem aplicáveis, armazenamento e retries           |
| Azure Document Intelligence | [Read/Layout language support](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support/ocr?view=doc-intel-4.0.0): português consta no suporte OCR                                                                                         | Read/Layout é candidato à leitura; suporte OCR não prova extração correta de fatura brasileira nem de todo modelo pré-construído           |
| Azure — privacidade         | [Dados e segurança](https://learn.microsoft.com/pt-br/azure/foundry/responsible-ai/document-intelligence/data-privacy-security): armazenamento temporário criptografado e exclusão de entrada/resultado 24 horas após análise; exclusão antecipada por Delete Analyze Result | Verificar região, cópias de treinamento e política interna separadamente; não usar retenção do fornecedor como retenção do dossiê          |
| Azure — custo               | [Pricing oficial](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/): cobrança por modelo/páginas; tabela consultada devolve valores dinâmicos `$-`                                                                                                   | Cotar região/moeda/modelo na calculadora antes da execução; não inventar valor numérico                                                    |

Adequação a contas brasileiras era hipótese de pesquisa; nenhum fornecedor foi usado. A escolha intermediária por Azure foi encerrada antes de qualquer chamada pela ADR-008.

## Desenho do experimento proposto

### Decisão operacional histórica — supersedida

O desenho abaixo registra proposta aprovada em 05/10/2026 e as decisões operacionais intermediárias de POC-01. A ADR-008 supersede ambas para o roadmap vigente: não há execução, envio de contas ou provedor de OCR ativo. O fluxo atual mantém o cadastro manual.

Produto confirma distribuidoras atendidas; não inferir pela opção padrão Neoenergia da UI. Amostra inicial proposta: pelo menos 20 contas por distribuidora, distribuídas entre PDF digital, escaneado e foto (boa/ruim/rotacionada), residenciais, rurais, comerciais e demais classes atendidas, microgeração/injeção, histórico parcial, código com zeros e titular diferente. Dimensionar amostra conforme variedade real; é piloto, não garantia estatística universal.

Usar documentos autorizados e minimizados/anonimizados, preservando estrutura; registrar consentimento/base/finalidade aplicável com responsável de privacidade, sem inventar regra legal. Conjunto rotulado por duas pessoas e divergências reconciliadas. Separar ajuste/treino de avaliação cega para evitar vazamento. Não enviar identidade adicional desnecessária. Apagar cópias temporárias do fornecedor conforme política e registrar evidência.

Comparar pelo mesmo schema de candidatos: acerto exato do código UC e mês, normalização/unidade, cobertura de campos presentes, confusão consumo/injeção, linhas de histórico, número de correções humanas, tempo de revisão, p50/p95, falhas e custo total por conta confirmada. Amostras ausentes e ilegíveis contam no relatório, não são descartadas para melhorar média.

Proposta de gate de piloto: zero aplicação sem confirmação, zero efeito de instrução maliciosa, 100% das aplicações rastreáveis e conflitos detectados nos cenários controlados. Produto define metas de qualidade/custo/tempo por campo antes de comparar resultados; não inventar percentuais de confiança ou precisão. Se qualidade/custo não compensar, manter upload + cadastro manual e ajustar corpus/modelo.

Custo estimado = páginas por modelo × preço unitário + retentativas cobradas + armazenamento/transferência + treinamento/hospedagem se houver + esforço de revisão. Registrar tabela/SKU/data/moeda, teto de gasto aprovado e interrupção automática ao atingir quota. Não consumir franquia ou ativar cobrança nesta tarefa.

Entregáveis futuros: manifesto anônimo do corpus, versões/regiões, configurações, planilha de resultados por campo/distribuidora/formato, exemplos de falha, evidências de privacidade/exclusão, cálculo de custo e recomendação fundamentada de continuar ou não. A escolha de adapter é reversível.

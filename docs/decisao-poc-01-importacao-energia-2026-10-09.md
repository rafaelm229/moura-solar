# POC-01 — Decisões operacionais da PoC de importação de energia

**Data:** 09/10/2026

**Fase:** PoC transversal da SPEC-014; dependência para R1/R5

**Estado do experimento:** encerrado sem execução, por decisão posterior em
[ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md). Este registro é histórico e
não autoriza chamadas, contratação ou continuação da PoC.

**Registro histórico:** Azure Document Intelligence foi escolhido pelo usuário
em 09/10/2026. Essa escolha foi supersedida antes de provisionamento, envio ou
gasto pela decisão de manter a importação manual.

**Rastreabilidade:** [SPEC-014/IMP-11](../specs/SPEC-014-importacao-contas-energia/spec.md),
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md), F-23 e F-34.

**Dependências:** harness offline `@moura-solar/energy-import-poc`; corpus real
autorizado, rotulado e revisado; provisionamento regional verificado; cotação
atual e revisão de privacidade aprovadas.

## Decisões

1. **Fornecedor/modelo:** testar somente Azure Document Intelligence v4.0,
   API `2024-11-30`, `prebuilt-layout`, com interpretação e normalização
   determinísticas. Azure está escolhido para a PoC; a região e a chamada ainda
   dependem dos gates abaixo. Não usar Invoice, modelo customizado, treinamento
   nem GenAI.
   O modelo Layout retorna texto/estrutura; a documentação de suporte lista
   português, mas não comprova extração correta de contas brasileiras.
2. **Região:** exigir `brazilsouth`. Antes de qualquer envio, confirmar no
   provisionamento que o SKU/API escolhidos estão disponíveis nessa região.
   Se não estiverem, parar a PoC; não trocar para outra região sem nova revisão.
3. **Comparação:** um único provedor contra a digitação manual atual. Não enviar
   o mesmo documento a um segundo fornecedor. Medir tempo de digitação manual e
   tempo de extração mais revisão/correção por IDs anônimos, sem capturar
   conteúdo; guardar somente tempos agregados no relatório. A medição é manual
   e não será atribuída ao benchmark existente.
4. **Corpus:** 60 contas de uma distribuidora, 20 em cada formato (`DIGITAL_PDF`,
   `SCANNED_PDF`, `PHOTO`), cobrindo qualidade boa, ruim e rotacionada onde
   aplicável. Escolher a distribuidora com maior número agregado de UCs ativas
   no escopo V1 durante os 12 meses anteriores à formação do corpus. Não inferir
   a escolha pelo valor padrão da interface. Se não houver 60 contas elegíveis,
   não reduzir a amostra: manter a PoC bloqueada.
5. **Rótulos:** duas pessoas rotulam independentemente; uma terceira revisão
   reconcilia divergências antes de congelar a avaliação cega. Não usar amostra
   de avaliação para ajuste do adapter.
6. **Minimização:** antes do envio, remover nomes, documentos pessoais, endereço,
   QR codes e outros identificadores diretos. Substituir o código da UC por
   pseudônimo de mesmo padrão/tamanho, preservando o desafio de OCR sem manter o
   identificador original. Guardar a relação de pseudônimos separada e local.
   Avaliar titular divergente fora desta PoC; não enviar dados de titular.
7. **Limite financeiro:** teto acumulado de **US$ 25** para chamadas do serviço.
   Usar tier pago S0, sem treinamento ou armazenamento adicional. Registrar SKU,
   região, data e preço cotado; o preflight offline deve estimar custo total
   abaixo do teto antes de habilitar a chamada. O executor reserva custo e para
   antes de ultrapassá-lo. Se preço, moeda ou teto não puderem ser confirmados,
   não executar. O teto não é autorização para contratação nem prova de custo
   faturado.
8. **Retenção:** consumir o resultado e solicitar exclusão antecipada pelo
   `Delete Analyze Result`; registrar somente confirmação/erro e digest, nunca
   texto ou conteúdo do documento. Planejar a retenção temporária publicada de
   até 24 horas como exposição residual. A região Brazil South é pareada com
   South Central US; não declarar residência exclusiva no Brasil. Privacidade
   deve revisar os termos de residência/replicação aplicáveis à conta concreta.
9. **Critérios de qualidade:** exigir acerto exato e cobertura de 100% para
   código pseudonimizado da UC, mês de referência, consumo, energia injetada,
   energia faturada e valor faturado, somente nos campos presentes no rótulo.
   Exigir pelo menos 95% de acerto exato e 90% de cobertura para componentes
   tarifários e histórico mensal, com ao menos 30 ocorrências rotuladas por campo;
   abaixo disso, resultado inconclusivo, sem reduzir meta após observar saídas.
10. **Benefício e segurança:** exigir redução mínima de 20% na mediana do tempo
    combinado de extração mais revisão/correção versus digitação manual.
    Registrar a amostra e medianas manualmente, pois o benchmark atual não mede
    esse fluxo de tempo. Resultado
    `UNKNOWN`, erro crítico, teto excedido ou incidente de dados encerra o teste
    com `STOP`/`INCONCLUSIVE`, sem reenvio automático. Nenhum resultado aplica
    `EnergyReading` ou altera UC; confirmação humana continua obrigatória pela
    SPEC-014.

## Antes / depois

- **Antes:** havia ferramentas offline e candidatos pesquisados, sem fornecedor,
  modelo, região, tamanho de amostra, teto ou metas escolhidos.
- **Depois:** Azure foi escolhido pelo usuário para a PoC e os limites
  experimentais estão explícitos, sem contratação, uso de documentos, mudança de
  contratos ou ativação de runtime.
- **Contratos e migração:** nenhum contrato/API/OpenAPI/banco muda; nenhuma
  migration, configuração de deploy ou dado é criado.
- **Rollback:** reverter este registro e referências; sem efeito persistido ou
  chamada externa.

## Gates pendentes na data do registro — encerrados sem execução

Na data de preparação, o checkout não continha `poc-data/` nem corpus autorizado.
Antes de reunir esses materiais, a decisão foi alterada pela ADR-008; eles não
devem ser coletados para esta PoC. Os gates então identificados eram:

- export agregado, sem dados pessoais, para identificar a distribuidora elegível;
- 60 documentos e rótulos anonimizados conforme as decisões acima, com dupla
  revisão e autorização documentada;
- confirmação de disponibilidade do recurso/modelo em `brazilsouth`, preço S0
  atual e revisão de privacidade da conta/termos;
- manifesto, política e plano offline com digests e resultado `READY`.

Não houve preflight `READY`, chamada ao Azure ou custo. Pela decisão vigente, não
preparar worker, polling ou OCR. A proposta de transporte está preservada como
histórico na [ADR-007](adr/ADR-007-transporte-integracao-proposta.md).

## Evidência externa consultada

- Microsoft documenta o modelo Layout `2024-11-30` como GA, suporte a PDF/imagens,
  idiomas incluindo português, limites diferentes entre F0/S0 e somente duas
  páginas processadas por PDF em F0:
  [modelo Layout](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/layout?view=doc-intel-4.0.0),
  [idiomas Read/Layout](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support/ocr?view=doc-intel-4.0.0),
  [limites F0/S0](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/service-limits?view=doc-intel-4.0.0).
- Dados de entrada e resultados ficam temporariamente na região da requisição,
  com retenção publicada de até 24 horas e API de exclusão antecipada:
  [privacidade e segurança](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/document-intelligence/data-privacy-security).
- Azure publica a tabela de preços por modelo/página, mas a página consultada
  não fornece preço estático aplicável a esta conta/região; obter cotação
  concreta antes do preflight:
  [preços do Document Intelligence](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/).
- Brazil South é pareada com South Central US:
  [pares de regiões Azure](https://learn.microsoft.com/en-us/azure/reliability/regions-paired).

As fontes descrevem capacidades do serviço, não precisão em faturas brasileiras,
disponibilidade contratual da conta, preço efetivo ou aprovação de privacidade.

# Modelo de dados — SPEC-013

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

## Entidades propostas (DOC-01 a DOC-09)

| Entidade                   | Campos e vínculos essenciais                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DossierDocument            | id, organizationId, customerId FK, categoria, título, status ACTIVE/ARCHIVED, versão de metadados, finalidade, retentionPolicyVersion, responsável                                             |
| DocumentVersion            | id, documentId FK, número único por documento, autor/data, originalName saneado, tamanho, MIME declarado/real, SHA-256, estado de persistência, objeto imutável                                |
| StoredObject               | id, organizationId, backend S3/MINIO ou LEGACY_LOCAL explicitamente identificado, bucket/key únicos, objectVersionId opcional, hash/tamanho verificados, scanner/versão/resultado, persistedAt |
| CustomerRepresentative     | id, organizationId, customerId FK, nome e identificação mínima protegida; vínculo não é CustomerContact (que armazena canal)                                                                   |
| DocumentRepresentativeLink | documentId FK, representativeId FK; pessoa e cliente compatíveis                                                                                                                               |
| DocumentUtilityUnitLink    | documentId FK, utilityUnitId FK; cliente e organização iguais                                                                                                                                  |
| DocumentOpportunityLink    | documentId FK, opportunityId FK; mesmo proprietário                                                                                                                                            |
| DocumentProjectLink        | documentId FK, projectId FK para OperationalProject; cliente/UC derivados da Opportunity                                                                                                       |
| DocumentWorkOrderLink      | documentId FK, workOrderId FK, checklistItemId FK opcional, fase BEFORE/DURING/AFTER e legenda; item deve pertencer à OS                                                                       |
| DocumentContractLink       | documentId FK, contractId FK, contractVersionId FK opcional para anexos de apoio; não cria outra minuta/assinado                                                                               |
| DocumentAccessEvent        | organização, ator, versão/origem tipada, finalidade VIEW/DOWNLOAD, tentativa/autorização/resultado, timestamp/traceId                                                                          |

Cada vínculo tem unicidade composta (documento, alvo) e validação transacional. Não usar entityType/entityId sem FK como integridade primária. organizationId e customerId são imutáveis após criação; API deriva organização da sessão. FKs compostas/índices únicos reforçam igualdade de organização e proprietário; quando a cadeia exige join (projeto → oportunidade → cliente), validar sob lock transacional e impedir reassociação incompatível. Links duplicados não duplicam item no dossiê. Exclusão de pai referenciado é RESTRICT/arquivamento, não cascata que apague evidências.

## Integração sem duplicação (DOC-03)

Consulta consolidada faz união autorizada de documentos novos, ProposalDocument → ProposalVersion → Proposal → Opportunity → Customer e ContractDocument → ContractVersion → Contract → Opportunity → Customer. DTO discriminado usa origem `DOSSIER`, `PROPOSAL_DOCUMENT`, `CONTRACT_DOCUMENT` e ID de origem. Discriminador de resposta não é um vínculo genérico persistido. Download delegado revalida permissão do módulo, contexto e versão exata. Propostas/contratos não são importados como DossierDocument.

Backend físico dos documentos legados precisa ser identificado por inventário, HEAD/leitura e hash; não presumir que s3Bucket/s3Key provam persistência em S3. Evolução aditiva poderá associar StoredObject aos registros proprietários existentes; isso centraliza armazenamento, não o domínio documental. Não alterar snapshots ou IDs históricos. Bytes são copiados para backend esperado apenas em migração verificável, com manifesto origem/destino/hash e leitura compatível até completar.

photoUrl de WorkOrderChecklistItem não é prova de arquivo durável. Migração conserva valor legado e cria vínculos tipados só para arquivos verificados/autorizados. URL inválida vira pendência, sem inventar foto; não buscar URLs arbitrárias no servidor (evitar SSRF). Miniaturas são derivados do original e herdam autorização.

## Máquina de persistência (DOC-04, DOC-07, DOC-08)

`PENDING_UPLOAD → UPLOADED_UNVERIFIED → SCANNING → READY`; falhas: `UPLOAD_FAILED`, `QUARANTINED`, `REJECTED`, `MISSING`; cancelamento: `CANCELED`. Arquivamento é estado lógico do documento, independente do objeto.

1. Transação cria intenção, chave não adivinhável e versão pendente; retorno não significa sucesso durável.
2. Upload envia objeto privado para backend esperado. Servidor confirma existência, tamanho e hash real (ETag não é SHA-256 universal).
3. Scanner valida MIME/assinatura, corrupção, limites e malware isoladamente. Timeout mantém quarentena, sem download comum.
4. Transação CAS promove versão a READY e grava auditoria/outbox; falha DB depois do PUT deixa intenção reconciliável.
5. Reconciliador com lease retoma verificação por chave determinística; objeto sem intenção é órfão, marcado e removido só depois de carência configurada e segunda checagem de referências. Registro READY sem objeto vira MISSING e incidente; nunca cai silenciosamente para disco.

Retentativa da mesma intenção não cria outra versão. Substituição cria versão N+1 e conserva N. Arquivar não apaga objeto. Download indisponível retorna erro recuperável, nunca arquivo diferente sob mesmo ID.

## Retenção e operação (DOC-09)

Finalidades propostas: identificar partes/representação, comprovar consumo/local, execução técnica, contrato e suporte. Política versionada por categoria define revisão, prazo aprovado, fundamento, responsável, legal hold quando aplicável e destino dos derivados/backups. Privacidade e jurídico aprovam prazo; nenhum prazo legal é fixado aqui. Encerrar projeto não expurga dossiê. Exclusão aprovada exige job auditável e reconciliação, bloqueado por hold e dependências históricas.

Backup abrange PostgreSQL, objetos/versões, manifesto hash e configuração necessária à restauração, com segredos protegidos separadamente. Registrar ponto consistente ou janela reconciliável. Propor RPO/RTO e responsável antes do lote produtivo; simular restauração e download autorizado/negado. Backup antigo restaurado reaplica tombstones/expurgos aprovados antes de reabrir acesso.

## Fechamento da escrita do objeto (DOC-06, DOC-07, DOC-08)

A URL do cliente grava exclusivamente uma chave temporária de staging. READY nunca aponta para essa chave. Ao completar, o servidor fixa uma revisão de staging (VersionId quando disponível; em backend sem versionamento, snapshot privado criado pelo servidor), verifica hash/tamanho e escaneia exatamente esse snapshot. Promove somente esses bytes para chave final nova e imutável, sem autorização de escrita do cliente. A leitura sempre usa o objeto final verificado, com hash e VersionId quando o backend o disponibilizar. Uma escrita tardia em staging não altera o snapshot em verificação nem o original READY; será órfã para limpeza controlada. Novas versões exigem outra intenção e chave final.

Se o backend não permitir fixar snapshot/imutabilidade de forma verificável, o upload não pode ser promovido a READY. Concorrência entre complete/cancel usa CAS; promoção sem commit é reconciliada sem reutilizar bytes de staging modificados. Scanner e promoção devem registrar o mesmo hash; nunca verificar um objeto e servir outro sob a mesma referência.

# API proposta — SPEC-013

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Prefixo `/api/v1`; endpoints novos abaixo não existem na base. JSON camelCase, UUID opaco, instantes ISO, tamanhos em bytes. Organização deriva de sessão. Erro segue `{code,message,details,traceId}` sem dados pessoais ou existência de outra organização.

| Método/caminho                                           | Contrato                                                                                                                                                                                | Permissão proposta                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| GET `/customers/:customerId/documents`                   | filtros utilityUnitId, projectId, category, from, to, cursor, take (1–100); retorna items/nextCursor e origem tipada, versão, autor, status, ações permitidas                           | documents:read + categoria/contexto e permissão de origem |
| POST `/customers/:customerId/document-uploads`           | título, categoria, contexto com IDs tipados, fileName, declaredMime, size, sha256 opcional; retorna 201 com uploadId, documentId, versionId, estado pendente e URL de upload temporária | documents:upload + escopo do cliente/contexto             |
| POST `/document-uploads/:uploadId/complete`              | expectedVersion; retorna 202 com estado de verificação e URL de consulta, sem afirmar READY                                                                                             | Mesma autorização de upload                               |
| GET `/document-uploads/:uploadId`                        | estado, erro seguro, retryAllowed e versão                                                                                                                                              | documents:read no contexto                                |
| POST `/document-uploads/:uploadId/cancel`                | expectedVersion e motivo; 200 estado final                                                                                                                                              | documents:upload                                          |
| POST `/documents/:documentId/versions`                   | expectedVersion, metadados do novo arquivo; cria intenção, sem sobrescrever original                                                                                                    | documents:replace                                         |
| GET `/documents/:documentId/versions/:versionId/content` | purpose VIEW/DOWNLOAD; streaming autorizado, Cache-Control private,no-store, disposição/MIME seguros                                                                                    | documents:view ou documents:download + categoria/contexto |
| POST `/documents/:documentId/archive`                    | expectedVersion e motivo; 200 metadados arquivados                                                                                                                                      | documents:archive                                         |
| GET `/documents/:documentId/history`                     | cursor, take; versões e eventos autorizados                                                                                                                                             | documents:history                                         |

Permissões são novas propostas para catálogo M1, não grants já disponíveis. Identidade/representante exige adicional documents:identity_read; documentos financeiros exigem autorização financeira; instalador só fotos/evidências de OS atribuída com grants adequados. Upload não concede leitura irrestrita. Listagem/contagem/miniatura/busca não vazam categorias negadas. Permissão de origem nunca é ampliada por ver o dossiê.

Documentos M4/M5 usam seus downloads autenticados atuais quando estes identificam versão exata (ex.: `/proposal-versions/:id/pdf`). Para histórico de contrato, propor `GET /contract-documents/:documentId/content`, autorizado por contracts:download e contexto; endpoints atuais `/contracts/:id/pdf|docx|signed` não garantem seleção arbitrária de documento histórico. A projeção deve apontar ID exato, sem baixar “atual” ao selecionar versão antiga.

## Idempotência, limites e erros

Toda mutação nova exige Idempotency-Key, escopada por organização, ator e operação, com hash de payload, registro transacional e resultado persistido. Mesma chave/payload retorna resultado original; conteúdo diferente retorna 409 IDEMPOTENCY_KEY_REUSED; operação em curso retorna 202 e consulta. Novas tentativas reutilizam chave; não gerar UUID por retentativa. Versão obsoleta retorna 409 CONCURRENT_MODIFICATION. Replay revalida autorização antes de retornar informação.

401 sessão inválida; 403 capacidade negada; 404 entidade ausente/fora do escopo; 409 vínculo/conflito; 413 tamanho excedido; 415 formato proibido; 422 arquivo corrompido/contexto inconsistente; 429 quota; 503 STORAGE_UNAVAILABLE; 409 DOCUMENT_NOT_READY para download pendente. Quarentena retorna estado seguro sem expor detalhes de scanner a usuário comum.

Limites propostos revisáveis: PDF/JPEG/PNG, até 20 MiB por original, 50 páginas PDF no dossiê, no máximo 10 arquivos por seleção, quota por organização configurada. Importação usa limite menor da SPEC-014. DOCX gerado por M5 continua no módulo com pipeline próprio; upload DOCX genérico não está liberado. Scanner/parser tem limite de tempo/memória e rejeita PDF protegido sem método autorizado de abertura. Preview não executa scripts/macros; SVG/HTML enviados não são renderizados como conteúdo ativo.

URLs de upload expiram (proposta: 10 minutos), só permitem chave/tamanho/tipo da intenção; complete reconfirma os bytes. Download preferencial por API para auditar tentativa e streaming; “transferência concluída no servidor” não prova leitura humana. Falha em registrar auditoria de acesso sensível impede iniciar o streaming; gravar resultado posterior por mecanismo durável. Nenhum GET de preview satisfaz gate ou marca visualização pelo cliente externo.

## URL temporária e integridade

A URL de upload só escreve em staging; não concede sobrescrita da chave final. Complete fixa os bytes, verifica e escaneia o snapshot e promove para objeto final privado não gravável pelo cliente, conforme modelo. Reutilizar URL ainda válida durante/depois da verificação não pode alterar a versão publicada. Resposta de complete identifica intenção/versão, sem divulgar chave final como destino gravável.

## Implementação e evidência do lote 4

O contrato compatível implementado, diferenças em relação à proposta, operação e evidências estão em [Revisão e validação do lote 4](../../docs/lote-4-revisao-e-validacao.md). As descrições propostas acima permanecem referência de evolução; não declaram todas as capacidades produtivas liberadas.

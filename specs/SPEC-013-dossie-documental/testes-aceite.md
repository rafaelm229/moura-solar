# Testes de aceite — SPEC-013

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Cenários futuros, não executados nesta entrega. Integração com PostgreSQL e S3/MinIO real isolado, API autenticada e E2E; mocks de falha complementam, não substituem persistência.

| Teste    | Requisitos             | Dado/quando/então verificável                                                                                                                        |
| -------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-DOC-01 | DOC-01, DOC-02         | Cliente com 2 UCs e 2 projetos: encerrar um e filtrar; arquivos corretos permanecem e não duplicam                                                   |
| T-DOC-02 | DOC-02, DOC-05         | Forjar cliente/UC/OS de outra organização e cliente diferente na mesma organização; negar listagem, vínculo, miniatura e bytes; zero mutações        |
| T-DOC-03 | DOC-03, DOC-06         | Documento M4/M5 aparece na origem e dossiê; ID/hash iguais; alteração cadastral não muda versão nem PDF; contrato histórico baixa arquivo exato      |
| T-DOC-04 | DOC-04, DOC-08         | S3 indisponível antes/durante PUT; nunca READY ou fallback silencioso; retentativa recupera mesma intenção                                           |
| T-DOC-05 | DOC-07                 | PDF falso, tamanho excedido, malware e scanner indisponível; rejeição/quarentena, sem preview/download comum                                         |
| T-DOC-06 | DOC-06, DOC-08         | Cair após PUT/antes de commit; reiniciar API/worker; reconciliar uma versão; limpeza não remove objeto referenciado                                  |
| T-DOC-07 | DOC-05, DOC-06, DOC-10 | Instalador atribuído vê galeria, recebe negação para RG; upload/download/substituição/arquivo geram trilha; segundo dispositivo vê estado confirmado |
| T-DOC-08 | DOC-09                 | Restaurar DB + objetos em instância vazia, conferir manifesto/hash e acessos; tombstone e hold respeitados; medir RPO/RTO                            |
| T-DOC-09 | DOC-10, DOC-11         | Câmera/rede lenta/arquivo pendente: não conclui gate; dossiê READY não ativa contrato ou OS; comando de domínio separado                             |
| T-DOC-10 | DOC-06, DOC-08         | Dois uploads/substituições concorrentes e repetição de chave: uma versão por intenção; conflito explícito sem sobrescrita                            |

Reaproveitar cenários existentes em tests/proposal.integration.mjs, tests/contract.integration.mjs e tests/engineering.integration.mjs para domínio, ampliando autorização negativa e armazenamento real. Cobertura atual não prova os contratos novos.

Complemento de T-DOC-05/T-DOC-10: guardar a URL pré-assinada, enviar arquivo A, completar e reenviar B pela mesma URL durante o scanner e depois de READY. A versão deve servir exclusivamente os bytes A verificados, ou permanecer indisponível até nova verificação; nunca publicar B sem scanner/hash próprios. Repetir em S3 versionado e MinIO/configuração sem versionamento, incluindo queda entre promoção e commit.

## Implementação e evidência do lote 4

O contrato compatível implementado, diferenças em relação à proposta, operação e evidências estão em [Revisão e validação do lote 4](../../docs/lote-4-revisao-e-validacao.md). As descrições propostas acima permanecem referência de evolução; não declaram todas as capacidades produtivas liberadas.

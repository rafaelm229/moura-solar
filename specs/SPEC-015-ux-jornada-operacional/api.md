# API proposta — SPEC-015

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Prefixo `/api/v1`. Novas consultas propostas: `GET /opportunities/:id/journey` e `GET /engineering/projects/:id/journey`, autorizadas por `opportunities:read` e `engineering:read` respectivamente, mais permissões específicas de cada frente. Resposta 200 contém JourneySummary e cursor de histórico; não expõe custos/documentos apenas por ler projeto. Negação contextual 404; falta de capacidade geral 403; sessão 401; fonte obrigatória indisponível 503; frente opcional indisponível é declarada como tal no payload, sem simular gate liberado.

Exemplo de próxima ação: `{actionCode:"REVIEW_SIGNED_CONTRACT", label:"Conferir contrato assinado", target:{contractId,versionId}, enabled:false, reasons:[{code:"DOCUMENT_PENDING",message:"Arquivo ainda em verificação"}]}`. Payload real deve omitir IDs não autorizados. Ação usa catálogo fechado de rotas do cliente; nunca URL livre de documento, texto extraído ou entrada externa.

Consulta agrega casos de uso existentes, sem acesso transversal que burle políticas. Incluir `observedAt` e revisões/updatedAt por fonte; ao compor consultas separadas não prometer snapshot ACID único. Estado pode mudar entre GET e comando: o endpoint de domínio revalida tudo e retorna conflito/bloqueio.

Comandos preservados incluem `/opportunities/:id/qualify`, `/proposal-versions/:id/accept`, `/contracts/:id/verify-signed`, `/receipts`, `/inventory/reservations`, `/engineering/work-orders/:id/state` e `/engineering/checklist-items/:id`. Não criar `PATCH /journey/state` nem “Avançar” genérico. Guardar expectedVersion e Idempotency-Key onde suportados. Lacunas de concorrência/idempotência nos endpoints legados devem ser estabilizadas em incremento de domínio independente; esta consulta não as corrige por UI.

GET não gera mutação nem precisa chave de idempotência. Histórico usa cursor opaco, take 1–100 e filtros de contexto; não usa dados pessoais na URL. Após comando confirmado, invalidar detalhe, lista, jornada e frentes afetadas; polling com intervalo/backoff e refetch on focus aproxima segundo dispositivo. Cancelar resposta obsoleta não descarta comando já aplicado: consultar recibo/entidade antes de reenviar.

| Mutação                       | Revalidação mínima                                                        |
| ----------------------------- | ------------------------------------------------------------------------- |
| UC/leitura/importação         | Consumo, cliente/UC, oportunidade, rascunhos de dimensionamento e jornada |
| Aceite/conferência contratual | Proposta/contrato, oportunidade, gates e pendências                       |
| Recebimento/estorno           | Financeiro, gate FINANCIAL, jornada, indicadores autorizados              |
| Reserva/compra/movimento      | Estoque, reservas, custos pertinentes, jornada e OS                       |
| Checklist/estado/entrega      | OS, projeto, documentos, jornada e suporte quando aplicável               |

Mapear chaves existentes explicitamente na implementação, por exemplo energy-readings, opportunity, opportunities, engineering-projects e automations. Não apagar todo cache a cada navegação. Logout/troca de organização continua limpando dados sensíveis.

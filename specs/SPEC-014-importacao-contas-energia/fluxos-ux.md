# Fluxos UX — SPEC-014

**Status:** Aprovada para implementação em 05/10/2026

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo e contratos funcionais aprovados em 05/10/2026. Decisões operacionais listadas no plano continuam bloqueios das liberações correspondentes.

1. Na ficha do cliente ou consumo da oportunidade, escolher “Importar conta”. Mostrar cliente/comprador, UC existente ou “Criar UC ao confirmar”. Oportunidade é contexto opcional validado.
2. Selecionar PDF/foto ou câmera; mostrar limites, orientação de legibilidade e original. Envio confirma persistência documental antes de iniciar extração. Upload aceito não significa dados aplicados.
3. Mostrar fila/processamento com estado, tempo e opção de sair/retomar pela URL. Falha permite tentar conforme política ou cadastrar manualmente; o original continua no dossiê.
4. Revisar dados ao lado do documento no desktop; no mobile alternar Documento/Dados preservando campo e página. Cada candidato exibe valor, unidade, origem/página, valor atual e escolha aplicar/manter/corrigir.
5. Separar “Titular da conta” e “Cliente comprador”. Divergência solicita conferir, escolher UC correta ou cancelar; justificativa não autoriza mudar propriedade. Classe/subclasse desconhecida não recebe inferência comercial.
6. Histórico mostra mês, consumo, injeção e total em colunas separadas. Campo ausente fica vazio. Conflito por mês exige manter/substituir/corrigir com justificativa; meses sem evidência não entram na aplicação.
7. Revisão mostra três sinais independentes: confiança informada pelo fornecedor (se houver, escala/origem), qualidade/legibilidade e validações locais. Nunca percentual fabricado ou selo de certeza universal.
8. “Salvar revisão” persiste rascunho; “Confirmar importação” mostra resumo de mudanças, UC, meses e campos mantidos. Desabilitar dupla submissão é conveniência; idempotência é da API.
9. Após sucesso, mostrar recibo, autor/data, leituras atualizadas e link para consumo/dossiê. Conflito preserva escolhas e exige recarregar diferenças; falha de rede consulta recibo sem presumir fracasso ou sucesso.

Estados UPLOADING, QUEUED, PROCESSING, REVIEW_REQUIRED, CONFIRMING, APPLIED, FAILED e CANCELED têm textos operacionais, recuperação e próxima ação. Documento ilegível permite enviar nova versão documental e criar nova importação; a versão original da importação anterior é imutável e decisões anteriores não migram automaticamente. Arquivo duplicado oferece abrir importação existente; fatura corrigida é revisão explícita. Sem acesso, nenhum conteúdo pessoal é exibido. SPEC-003 governa componentes e visual.

UPLOADING pertence à intenção documental anterior à criação da importação, apresentada como parte do mesmo fluxo ao usuário. Após READY, criar EnergyBillImport em QUEUED. Para original ilegível, ação “Enviar outra versão” conduz ao upload do dossiê e cria nova importação; não usa retry com bytes diferentes. Ao confirmar UC nova, mostrar conta já vinculada e acessível pelo filtro daquela UC.

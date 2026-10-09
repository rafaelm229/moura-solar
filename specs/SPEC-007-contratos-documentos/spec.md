# SPEC-007 — Contratos, documentos e transição para execução

**Status:** Proposta para validação operacional e jurídica  
**Versão:** 0.1.0  
**Dependências:** SPEC-001, SPEC-002, SPEC-003 e SPEC-006

## 1. Objetivo

Gerar um contrato rastreável a partir da proposta aceita, permitir alterações
controladas, disponibilizar visualização e download, registrar envio e armazenar o
arquivo assinado. O fluxo deverá liberar as próximas etapas somente quando gates
contratuais e financeiros forem realmente atendidos.

## 2. Aviso de governança

Esta SPEC define comportamento do software, versionamento, permissões e evidências.
O texto contratual, as cláusulas, multas, garantias e formas de aceite precisam ser
revisados e aprovados por profissional jurídico antes do uso em produção.

## 3. Escopo

### Incluído

- criação a partir da proposta aceita;
- templates de contrato versionados;
- preenchimento automático de campos;
- campos editáveis controlados;
- cláusulas condicionais;
- revisão e aprovação de exceções;
- geração em DOCX/PDF conforme template suportado;
- visualização e download;
- registro de envio;
- upload do arquivo assinado;
- conferência e aceite interno do arquivo;
- aditivos e cancelamento;
- histórico e auditoria;
- reavaliação dos gates de engenharia/execução.

### Fora do escopo

- assinatura eletrônica integrada;
- validação criptográfica por provedor de assinatura;
- reconhecimento automático de firma;
- boleto ou cobrança bancária;
- elaboração automática de cláusulas sem aprovação prévia;
- substituição de revisão jurídica.

## 4. Estados do contrato

```text
DRAFT
PENDING_REVIEW
APPROVED
GENERATING
READY
SENT
SIGNED_UPLOADED
SIGNED_VERIFIED
ACTIVE
AMENDED
CANCELED
TERMINATED
GENERATION_FAILED
```

### Regras

- `DRAFT`: campos permitidos podem ser alterados.
- `PENDING_REVIEW`: alteração excepcional aguarda aprovação.
- `APPROVED`: snapshot fechado para geração.
- `READY`: documento gerado e disponível.
- `SENT`: envio registrado com documento existente.
- `SIGNED_UPLOADED`: arquivo assinado enviado, ainda não conferido.
- `SIGNED_VERIFIED`: responsável confirmou partes, versão e integridade aparente.
- `ACTIVE`: gates contratuais internos atendidos.
- `AMENDED`: existe aditivo ativo relacionado.
- `CANCELED/TERMINATED`: exigem motivo e autoridade adequada.

Upload não ativa o contrato automaticamente. Um arquivo errado, incompleto ou de
outra versão precisa poder ser rejeitado sem apagar a evidência recebida.

## 5. Criação

Pré-condições:

- proposta aceita;
- nenhuma contratação ativa incompatível para a mesma proposta;
- template publicado compatível com tipo de projeto e cliente;
- dados mínimos das partes;
- preço, escopo e condições congelados.

Ao criar o contrato, o sistema copia snapshots de:

- contratante e contratada;
- endereços e representantes;
- proposta aceita;
- solução e equipamentos principais;
- preço e forma de pagamento;
- escopo, inclusões e exclusões;
- prazos e responsabilidades;
- garantias aprovadas;
- versão de cláusulas e template.

## 6. Campos editáveis

### Sem nova aprovação, conforme permissão

- contatos;
- dados de representante;
- data/local de assinatura;
- observações operacionais sem efeito jurídico/material;
- correções cadastrais comprovadas antes da geração final.

### Com aprovação obrigatória

- preço e pagamento;
- prazo de execução;
- escopo;
- equipamentos;
- multa, garantia e responsabilidade;
- cláusulas especiais;
- foro;
- remoção de cláusula obrigatória;
- qualquer divergência da proposta aceita.

Mudança material pode exigir nova proposta/aditivo, não simples edição do contrato.

## 7. Geração e documentos

1. Contrato aprovado gera job idempotente.
2. Renderizador usa snapshot e template versionado.
3. Arquivos gerados são armazenados com hash.
4. Visualização e download ficam disponíveis no detalhe.
5. Falha gera estado recuperável e diagnóstico interno.
6. Nova geração após mudança cria nova versão; nunca sobrescreve arquivo enviado.

Tipos iniciais:

- contrato editável para download, quando permitido;
- PDF pronto para conferência/assinatura;
- arquivo assinado enviado pelo usuário;
- anexos e documentos de apoio;
- aditivo.

## 8. Envio

Registrar envio exige:

- contrato `READY`;
- documento associado;
- canal;
- destinatário ou justificativa;
- data e usuário.

O sistema disponibiliza o mesmo arquivo enviado para visualização posterior. O
estado `SENT` não poderá existir sem `ContractDelivery` associado.

O registro manual de entrega persiste `CONTRACT_DELIVERED` v1 na outbox local
conforme [R1-36](../../docs/r1-36-outbox-entrega-contrato.md), apenas com IDs e
na mesma transação da entrega, auditoria e atividade de acompanhamento. O evento
não representa envio por canal nem inclui destinatário.

O cancelamento autorizado persiste `CONTRACT_CANCELED` v1 conforme
[R1-37](../../docs/r1-37-outbox-cancelamento-contrato.md), na mesma transação
local da mudança de estado e da auditoria. O evento contém somente IDs; motivo,
observações e conteúdo contratual permanecem fora do payload. A gravação não
altera permissões ou regras de cancelamento e não ativa consumidor.

## 9. Upload do assinado

O usuário seleciona explicitamente:

- arquivo;
- versão contratual correspondente;
- data de assinatura;
- pessoas/representantes que assinaram;
- observação.

Validações técnicas mínimas:

- formato permitido;
- tamanho;
- detecção de arquivo corrompido;
- verificação de malware quando infraestrutura disponível;
- hash;
- permissão e vínculo.

O sistema não presumirá autenticidade jurídica apenas pelo upload.

## 10. Conferência do assinado

Usuário autorizado compara o arquivo com a versão enviada e decide:

- `Confirmar`: documento aparentemente corresponde e assinaturas exigidas estão presentes;
- `Rejeitar`: arquivo ilegível, incompleto, incorreto ou de versão divergente;
- `Solicitar correção`: cria atividade e mantém histórico.

A decisão registra responsável, instante, checklist e observação.

## 11. Ativação e gates

Contrato conferido não significa automaticamente instalação liberada.

O serviço de orquestração reavalia gates independentes:

- `contractGate`: contrato assinado/verificado ou exceção aprovada;
- `financialGate`: condição de pagamento atendida;
- `engineeringGate`: documentação e liberação técnica;
- `supplyGate`: lista técnica e materiais;
- `scheduleGate`: equipe/local disponíveis.

Quando o `contractGate` é atendido, cria-se/atualiza-se a atividade seguinte sem
marcar manualmente os outros gates.

## 12. Aditivos

- Aditivo referencia contrato e versão-base.
- Possui motivo, alterações estruturadas e documento próprio.
- Não reescreve o contrato original.
- Pode exigir nova aprovação comercial, técnica, financeira e jurídica.
- Ao ativar, atualiza somente os dados operacionais explicitamente definidos.

## 13. Cancelamento e término

- Exigem motivo padronizado, observação e permissão.
- Consequências financeiras/estoque/projeto são comandos coordenados ou atividades,
  nunca exclusões em cascata silenciosas.
- Arquivos permanecem retidos conforme política aprovada.
- Reativação não é edição de status; exige fluxo específico ou novo contrato.

## 14. Cláusulas operacionais já identificadas

O template deverá suportar, após revisão jurídica:

- responsabilidade por alterações de Wi-Fi/SSID/senha que desconectem o monitoramento;
- procedimento de reconexão;
- distinção entre suporte remoto e visita presencial cobrável;
- tabela/critério de deslocamento vigente, sem valor fixo escondido no texto;
- eventos externos como ventos fortes, tempestades e danos não atribuíveis à execução;
- garantias de fabricantes versus garantia dos serviços;
- dever de preservação e uso adequado dos equipamentos;
- condições para materiais/serviços adicionais.

Valores de visita não devem ser codificados permanentemente na cláusula se forem
política comercial atualizável. O contrato pode referenciar tabela vigente/anexo,
conforme orientação jurídica.

## 15. Telas

- lista de contratos;
- criação a partir da proposta;
- editor de campos autorizados;
- comparação com proposta aceita;
- revisão/aprovação;
- visualização e download;
- registro de envio;
- upload e conferência do assinado;
- aditivos;
- histórico e gates relacionados.

## 16. Responsividade

- Visualização e upload funcionam pelo celular.
- Campos longos usam seções, não modal estreito.
- Comparação de versões usa blocos por cláusula no celular.
- Assinado pode ser capturado por câmera somente se qualidade e política permitirem;
  o sistema deve orientar enquadramento e legibilidade.
- Ações fixas reservam espaço e não cobrem documentos ou formulários.

## 17. Permissões

```text
contracts:read
contracts:create
contracts:update_draft
contracts:request_review
contracts:approve
contracts:generate
contracts:download
contracts:send
contracts:upload_signed
contracts:verify_signed
contracts:reject_signed
contracts:activate
contracts:create_amendment
contracts:cancel
contracts:terminate
contract_templates:manage
contract_clauses:manage
```

## 18. Eventos

- `ContractCreated`
- `ContractReviewRequested`
- `ContractApproved`
- `ContractGenerated`
- `ContractSent`
- `SignedContractUploaded`
- `SignedContractRejected`
- `SignedContractVerified`
- `ContractActivated`
- `ContractAmended`
- `ContractCanceled`
- `ContractTerminated`
- `ProjectGatesReevaluationRequested`

O evento versionado `CONTRACT_CANCELED` v1 representa apenas o cancelamento
persistido pela pessoa autorizada; não transporta motivo e não implica envio,
compensação financeira ou alteração automática de gates.

## 19. Casos de aceitação

```gherkin
Cenário: contrato enviado permanece disponível
  Dado que um contrato foi gerado e enviado
  Quando o usuário abrir seu histórico
  Então deve visualizar e baixar exatamente a versão enviada
```

```gherkin
Cenário: upload não ativa automaticamente
  Dado que um contrato foi enviado
  Quando um usuário anexar um arquivo supostamente assinado
  Então o contrato deve ficar aguardando conferência
  E a execução não deve ser liberada apenas pelo upload
```

```gherkin
Cenário: arquivo de versão incorreta é rejeitado
  Dado que a versão 2 é a versão contratual vigente
  Quando for anexado um documento assinado correspondente à versão 1
  Então o conferente deve poder rejeitar o arquivo
  E o histórico e o arquivo recebido devem ser preservados
```

```gherkin
Cenário: contrato conferido reavalia gates
  Dado que o contrato assinado foi conferido
  Quando o usuário autorizado confirmar a conferência
  Então o contractGate deve ficar atendido
  E os demais gates devem ser reavaliados sem serem aprovados artificialmente
  E a próxima atividade aplicável deve ser criada
```

## 20. Critérios de aprovação

- [ ] Estados e transições aprovados.
- [ ] Campos editáveis e exceções definidos.
- [ ] Checklist de conferência do assinado aprovado.
- [ ] Gates contratuais/financeiros separados e aprovados.
- [ ] Regras de aditivo e cancelamento aprovadas.
- [ ] Cláusulas revisadas juridicamente antes da produção.
- [ ] Fluxo web móvel validado.

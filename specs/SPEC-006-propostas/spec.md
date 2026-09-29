# SPEC-006 — Propostas, versões, PDF, envio e aceite comercial

**Status:** Proposta para validação comercial  
**Versão:** 0.1.0  
**Dependências:** SPEC-001, SPEC-002, SPEC-003, SPEC-004 e SPEC-005

## 1. Objetivo

Transformar uma versão técnica e financeira aprovada em uma oferta comercial
rastreável, visualizável e imutável, permitindo envio, negociação, revisão,
expiração e aceite sem editar manualmente o estado da oportunidade.

## 2. Princípios

1. Proposta é uma entidade versionada, não apenas um arquivo PDF.
2. Cada versão referencia exatamente um dimensionamento e uma composição de preço.
3. O PDF enviado é imutável e permanece disponível para visualização.
4. Uma nova negociação relevante cria nova versão.
5. Aceite seleciona uma única versão como base da contratação.
6. “Marcar como enviado” exige documento gerado e registro real do envio.
7. Estado da oportunidade é consequência dos comandos da proposta.

## 3. Escopo

### Incluído

- criação da proposta a partir de versões aprovadas;
- edição de conteúdo comercial permitido;
- versionamento;
- validação e aprovação de exceções;
- geração e armazenamento do PDF;
- visualização e download;
- registro de envio por canal;
- validade padrão de 10 dias;
- acompanhamento e lembretes;
- revisão, expiração, rejeição e aceite;
- evidência de aceite;
- trilha de eventos e auditoria.

### Fora do escopo

- assinatura eletrônica integrada;
- contrato jurídico;
- boleto e gateway de pagamento;
- portal público completo do cliente;
- automação por WhatsApp;
- reserva de estoque.

## 4. Estados da proposta

```text
DRAFT
PENDING_APPROVAL
APPROVED
GENERATING
READY
SENT
VIEWED
ACCEPTED
REJECTED
EXPIRED
SUPERSEDED
CANCELED
GENERATION_FAILED
```

### Significado

- `DRAFT`: edição permitida.
- `PENDING_APPROVAL`: possui exceção comercial aguardando aprovação.
- `APPROVED`: conteúdo validado e pronto para geração.
- `GENERATING`: PDF em processamento.
- `READY`: PDF gerado, ainda não enviado.
- `SENT`: envio registrado.
- `VIEWED`: visualização confirmada por mecanismo confiável quando disponível.
- `ACCEPTED`: aceite válido registrado.
- `REJECTED`: cliente recusou a versão.
- `EXPIRED`: validade encerrada sem aceite.
- `SUPERSEDED`: substituída por nova versão.
- `CANCELED`: retirada internamente com justificativa.
- `GENERATION_FAILED`: falha na produção do documento.

Uma proposta expirada não volta a `SENT`. Renovar prazo cria nova versão ou comando
de renovação que gere novo snapshot/documento conforme política aprovada.

## 5. Criação

Pré-condições:

- oportunidade em etapa compatível;
- dimensionamento aprovado;
- preço aprovado ou dentro da alçada;
- cliente e UC com dados mínimos;
- responsável comercial;
- template de documento ativo.

Ao criar, o sistema copia snapshots de:

- cliente e local;
- consumo e tarifa;
- dimensionamento;
- equipamentos principais;
- geração e economia estimadas;
- materiais/serviços comerciais exibíveis;
- preço, forma de pagamento e condições;
- inclusões, exclusões e observações;
- validade;
- versão do template.

## 6. Conteúdo editável

Enquanto `DRAFT`, usuários autorizados podem alterar:

- título e texto introdutório;
- condições de pagamento disponíveis;
- validade dentro da alçada;
- observações comerciais;
- serviços apresentados;
- opcionais comerciais;
- desconto dentro da alçada;
- ordem/apresentação de seções permitidas.

Alterar potência, equipamentos, geração, custos ou escopo técnico exige nova versão
do dimensionamento/preço ou retorno formal ao módulo responsável.

## 7. Validade

- Padrão: 10 dias corridos a partir do primeiro envio.
- Data final é persistida explicitamente.
- Alterar validade antes do envio respeita permissão.
- Extensão após envio exige justificativa e gera evento; se condições ou preços
  puderem ter mudado, deve gerar nova versão.
- Job periódico marca propostas vencidas como `EXPIRED` de modo idempotente.
- Proposta aceita antes do vencimento não expira posteriormente.

## 8. Geração do PDF

1. Usuário executa `Gerar proposta`.
2. API valida pré-condições e cria job idempotente.
3. Documento é renderizado de snapshot fechado.
4. Arquivo é armazenado com hash e metadados.
5. Proposta transita para `READY` ou `GENERATION_FAILED`.
6. Interface disponibiliza visualização e download.

Gerar novamente com os mesmos dados pode reutilizar o documento/hash. Alteração de
conteúdo exige nova revisão e novo documento.

## 9. Envio

Na primeira versão, os canais podem ser:

- download e envio externo;
- e-mail integrado quando disponível;
- WhatsApp registrado manualmente, sem automação;
- entrega presencial.

Para executar `Registrar envio`, o usuário informa canal, destinatário quando
aplicável e data. O sistema exige PDF `READY`, cria `ProposalDelivery`, muda para
`SENT` e agenda atividade de acompanhamento.

Se o próprio sistema realizar o envio, registra sucesso/falha do provedor. Apenas
clicar no botão sem confirmação não conta como envio.

## 10. Visualização

- Usuários internos autorizados visualizam PDF dentro do sistema.
- Download usa URL temporária.
- Link externo futuro deve usar token expirável e escopo mínimo.
- `VIEWED` somente é usado quando houver evidência; abrir internamente não significa
  que o cliente visualizou.

## 11. Revisão e negociação

Mudanças após envio classificam-se em:

- **não materiais:** nota interna ou atividade, sem alterar proposta;
- **comerciais:** preço, desconto, pagamento, validade ou serviços;
- **técnicas:** potência, geração, equipamentos ou escopo.

Mudança comercial/técnica cria nova versão, marca a anterior `SUPERSEDED` quando a
nova for enviada e preserva todos os documentos anteriores.

## 12. Aceite

### Formas iniciais aceitas

- documento assinado anexado;
- confirmação registrada com evidência documental/mensagem;
- aceite presencial registrado por usuário autorizado;
- futura assinatura eletrônica integrada.

O nível jurídico de cada forma precisa ser validado pela empresa. O sistema não
declara uma evidência informal como assinatura eletrônica certificada.

### Comando de aceite

Pré-condições:

- versão `SENT` ou `VIEWED`;
- dentro da validade ou exceção aprovada;
- nenhuma versão aceita na oportunidade;
- evidência e usuário responsável;
- dados necessários para contratação.

Efeitos atômicos:

1. proposta vira `ACCEPTED`;
2. oportunidade avança para `Contratação`;
3. demais versões abertas tornam-se `SUPERSEDED`/encerradas conforme regra;
4. atividade comercial de contratação é criada;
5. snapshot aceito fica bloqueado;
6. histórico e auditoria são registrados;
7. evento `ProposalAccepted` é gravado na outbox.

## 13. Rejeição e perda

Rejeitar proposta não implica automaticamente perder a oportunidade. O vendedor
pode criar revisão ou registrar perda. A perda exige motivo padronizado. Se o
cliente rejeitar somente uma condição, a negociação permanece aberta.

## 14. Alçadas

Exigem aprovação:

- desconto acima do permitido;
- margem abaixo do limite;
- validade fora do padrão;
- condição de pagamento excepcional;
- remoção de serviço obrigatório;
- aceite de proposta expirada;
- cancelamento após envio em situações definidas.

A aprovação registra solicitante, aprovador, valores anteriores/novos, motivo e
instante. Aprovação não pode ser feita pelo próprio solicitante quando a política
de segregação exigir.

## 15. Telas

- lista de propostas com estado, cliente, valor, validade e responsável;
- criação a partir da oportunidade;
- editor de rascunho;
- comparação de versões;
- pré-visualização do PDF;
- histórico de entregas/envios;
- registro de aceite/rejeição;
- solicitação e decisão de exceção;
- painel de propostas vencendo, expiradas e sem retorno.

## 16. Responsividade

- Editor no celular usa seções sequenciais e resumo recolhível.
- PDF pode ser visualizado e baixado no celular.
- Ações fixas reservam espaço e não encobrem conteúdo.
- Comparação extensa pode usar visão por seção no celular.
- Registrar envio/aceite funciona em celular, tablet e desktop.
- Nenhuma ação autorizada depende de hover.

## 17. Permissões

```text
proposals:read
proposals:create
proposals:update_draft
proposals:view_costs
proposals:view_margin
proposals:request_approval
proposals:approve_exception
proposals:generate
proposals:download
proposals:send
proposals:record_view
proposals:accept
proposals:reject
proposals:cancel
proposals:extend_validity
```

## 18. Eventos

- `ProposalCreated`
- `ProposalApprovalRequested`
- `ProposalApproved`
- `ProposalGenerationRequested`
- `ProposalGenerated`
- `ProposalGenerationFailed`
- `ProposalSent`
- `ProposalViewed`
- `ProposalExpired`
- `ProposalSuperseded`
- `ProposalAccepted`
- `ProposalRejected`
- `ProposalCanceled`

## 19. Casos de aceitação

```gherkin
Cenário: PDF enviado não muda retroativamente
  Dado que uma proposta foi gerada e enviada
  Quando o cadastro atual do cliente ou o catálogo for alterado
  Então o PDF enviado e seu snapshot devem permanecer idênticos
```

```gherkin
Cenário: envio exige arquivo disponível
  Dado que a geração do PDF falhou
  Quando o vendedor tentar registrar a proposta como enviada
  Então o sistema deve recusar o comando
  E informar que não existe documento pronto
```

```gherkin
Cenário: aceite movimenta a esteira
  Dado que existe uma proposta válida enviada
  Quando o aceite for registrado com evidência válida
  Então a proposta deve ficar aceita
  E a oportunidade deve avançar para contratação
  E a próxima atividade deve ser criada
  E todos os efeitos devem ser atômicos e auditados
```

```gherkin
Cenário: somente uma versão pode ser aceita
  Dado que uma oportunidade possui duas versões enviadas
  Quando uma delas for aceita
  Então nenhuma outra versão poderá ser aceita
  E as versões concorrentes devem ser encerradas conforme política
```

## 20. Critérios de aprovação

- [ ] Estados e transições aprovados.
- [ ] Conteúdo editável e conteúdo técnico bloqueado definidos.
- [ ] Validade padrão de 10 dias confirmada.
- [ ] Formas de evidência de aceite validadas.
- [ ] Alçadas comerciais definidas.
- [ ] Estrutura do PDF aprovada.
- [ ] Automação de acompanhamento aprovada.
- [ ] Fluxos responsivos validados.

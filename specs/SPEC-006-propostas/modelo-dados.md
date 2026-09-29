# Modelo de dados de propostas

**Status:** Modelo conceitual

## 1. Proposal

Representa a oferta lógica ligada a uma oportunidade.

| Campo               | Regra                                      |
| ------------------- | ------------------------------------------ |
| id                  | UUID imutável                              |
| organizationId      | obrigatório                                |
| opportunityId       | obrigatório                                |
| code                | identificador humano único                 |
| acceptedVersionId   | nulo até aceite; único por proposta lógica |
| createdAt/updatedAt | UTC                                        |

## 2. ProposalVersion

| Campo               | Regra                                              |
| ------------------- | -------------------------------------------------- |
| id                  | UUID                                               |
| proposalId          | obrigatório                                        |
| versionNumber       | sequencial                                         |
| designVersionId     | versão técnica aprovada                            |
| pricingVersionId    | versão financeira aprovada                         |
| basedOnVersionId    | versão anterior opcional                           |
| status              | máquina de estados da SPEC                         |
| customerSnapshot    | dados necessários congelados                       |
| utilityUnitSnapshot | local/UC congelados                                |
| technicalSnapshot   | potência, geração, equipamentos, premissas         |
| commercialSnapshot  | serviços, condições, preço e economia              |
| templateVersionId   | template usado                                     |
| validityDays        | padrão 10                                          |
| validUntil          | data explícita após envio                          |
| currency            | BRL inicialmente                                   |
| finalPrice          | decimal                                            |
| internalCost/margin | acesso restrito; não entram automaticamente no PDF |
| contentHash         | hash do snapshot                                   |
| version             | concorrência                                       |
| createdBy/createdAt | auditoria funcional                                |

## 3. ProposalDocument

| Campo             | Regra                                  |
| ----------------- | -------------------------------------- |
| id                | UUID                                   |
| proposalVersionId | obrigatório                            |
| documentId        | referência ao módulo de documentos     |
| type              | PDF_PROPOSAL/ACCEPTANCE_EVIDENCE/OTHER |
| contentHash       | integridade                            |
| generationStatus  | PENDING/READY/FAILED                   |
| generatedAt       | UTC                                    |
| generatorVersion  | template/renderizador                  |

## 4. ProposalDelivery

| Campo              | Regra                                    |
| ------------------ | ---------------------------------------- |
| id                 | UUID                                     |
| proposalVersionId  | obrigatório                              |
| channel            | DOWNLOAD/EMAIL/WHATSAPP/MANUAL/IN_PERSON |
| recipient          | opcional/controlado                      |
| providerMessageId  | futuro                                   |
| status             | PENDING/SENT/DELIVERED/FAILED/RECORDED   |
| sentBy/sentAt      | obrigatório ao sucesso/registro          |
| evidenceDocumentId | opcional                                 |
| notes              | opcional                                 |

O primeiro envio válido define `validUntil` conforme política.

## 5. ProposalAcceptance

| Campo               | Regra                                         |
| ------------------- | --------------------------------------------- |
| id                  | UUID                                          |
| proposalVersionId   | único para aceite válido                      |
| method              | SIGNED_DOCUMENT/MESSAGE/IN_PERSON/E_SIGNATURE |
| evidenceDocumentId  | exigido conforme método                       |
| acceptedByName      | pessoa que aceitou                            |
| acceptedAt          | instante efetivo                              |
| recordedBy          | usuário interno                               |
| exceptionApprovalId | se expirada/excepcional                       |
| notes               | opcional                                      |

Restrição transacional garante apenas uma versão aceita por oportunidade.

## 6. ApprovalRequest

Pode ser entidade transversal reutilizável. Registra recurso, versão, tipo de
exceção, valores, solicitante, decisor, decisão, motivo e timestamps.

## 7. ProposalEvent

Histórico funcional append-only com estado anterior, novo estado, comando, ator,
instante e metadados seguros. Auditoria técnica permanece separada.

## 8. Restrições

- Versão enviada não aceita alteração de snapshot.
- Documento pronto pertence a uma versão exata.
- Uma versão aceita não pode ser cancelada por edição comum.
- Aceite duplicado com mesma chave idempotente retorna o resultado existente.
- Aceites concorrentes de versões diferentes resultam em apenas um sucesso.
- Documento e snapshot devem possuir hash verificável.

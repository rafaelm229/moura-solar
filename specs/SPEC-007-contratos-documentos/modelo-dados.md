# Modelo de dados de contratos e documentos

**Status:** Modelo conceitual

## 1. Contract

| Campo                     | Regra                      |
| ------------------------- | -------------------------- |
| id                        | UUID                       |
| organizationId            | obrigatório                |
| projectId                 | projeto em preparação      |
| acceptedProposalVersionId | obrigatório                |
| code                      | identificador humano único |
| activeVersionId           | nulo até versão vigente    |
| status                    | estado agregado            |
| createdAt/updatedAt       | UTC                        |

## 2. ContractVersion

| Campo                | Regra                               |
| -------------------- | ----------------------------------- |
| id                   | UUID                                |
| contractId           | obrigatório                         |
| versionNumber        | sequencial                          |
| basedOnVersionId     | origem opcional                     |
| templateVersionId    | template publicado                  |
| proposalSnapshotHash | vínculo verificável                 |
| partySnapshot        | partes e representantes             |
| commercialSnapshot   | preço, pagamento e prazos           |
| technicalSnapshot    | solução e escopo                    |
| clauseSnapshot       | cláusulas renderizadas/estruturadas |
| status               | máquina da SPEC                     |
| contentHash          | integridade                         |
| version              | concorrência                        |
| createdBy/createdAt  | auditoria funcional                 |

## 3. ContractDocument

| Campo                  | Regra                               |
| ---------------------- | ----------------------------------- |
| id                     | UUID                                |
| contractVersionId      | obrigatório                         |
| documentId             | módulo de documentos                |
| type                   | EDITABLE/PDF/SIGNED/AMENDMENT/ANNEX |
| contentHash            | integridade                         |
| generationStatus       | PENDING/READY/FAILED/UPLOADED       |
| generatedAt/uploadedAt | conforme origem                     |
| generatorVersion       | quando gerado                       |

## 4. ContractDelivery

Registra versão, documento exato, canal, destinatário, status, data, usuário,
evidência e observação. O estado `SENT` depende de entrega registrada.

## 5. SignedContractReview

| Campo                 | Regra                                          |
| --------------------- | ---------------------------------------------- |
| signedDocumentId      | obrigatório                                    |
| contractVersionId     | versão esperada                                |
| status                | PENDING/VERIFIED/REJECTED/CORRECTION_REQUESTED |
| partiesPresent        | resultado do checklist                         |
| pagesComplete         | resultado do checklist                         |
| versionMatches        | resultado do checklist                         |
| legible               | resultado do checklist                         |
| notes                 | obrigatório em rejeição                        |
| reviewedBy/reviewedAt | decisão                                        |

## 6. ContractAmendment

Referencia contrato, versão-base, motivo, alterações estruturadas, aprovações,
documentos e status próprio. Não substitui o registro original.

## 7. ContractTemplate e ContractTemplateVersion

Template lógico e versões publicadas. Uma versão contém estrutura, variáveis,
cláusulas, regras condicionais, formatos suportados, vigência e aprovação jurídica.

## 8. Clause e ClauseVersion

Permite biblioteca controlada de cláusulas. Cada versão registra código, título,
texto, categoria, obrigatoriedade, condições, vigência e aprovação.

## 9. ProjectGate

| Campo                           | Regra                                          |
| ------------------------------- | ---------------------------------------------- |
| projectId                       | obrigatório                                    |
| type                            | CONTRACT/FINANCIAL/ENGINEERING/SUPPLY/SCHEDULE |
| status                          | PENDING/SATISFIED/BLOCKED/WAIVED               |
| sourceEntityType/sourceEntityId | evidência que atende/bloqueia                  |
| satisfiedAt/satisfiedBy         | quando aplicável                               |
| waiverApprovalId                | exceção formal                                 |
| version                         | concorrência                                   |

## 10. Restrições

- Uma versão enviada não aceita edição.
- Documento enviado referencia versão e hash exatos.
- Arquivo assinado não substitui o arquivo original.
- Conferência não edita o arquivo recebido.
- Somente uma versão contratual pode ficar ativa por contrato, salvo regra de aditivo.
- Gates são atualizados por comandos/eventos, não por checkbox sem evidência.

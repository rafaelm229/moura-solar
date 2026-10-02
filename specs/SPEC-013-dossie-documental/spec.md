# SPEC-013 — Dossiê documental permanente do cliente

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

## Objetivo, escopo e limites

Disponibilizar documentos ao longo do relacionamento, inclusive depois do encerramento dos projetos. “Permanente” significa independência do ciclo de uma obra; não guarda infinita. Cliente tem múltiplas UCs, oportunidades e projetos. SPEC-004 conserva propriedade cadastral; SPEC-006/007 conservam propostas/contratos; SPEC-010 conserva checklist e gates.

| ID     | Requisito                                                                              | Aceite verificável                                                                                         |
| ------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| DOC-01 | Dossiê por cliente com filtros UC/projeto/categoria/data e histórico após encerramento | Cliente com duas UCs e duas obras encerradas mantém documentos filtráveis                                  |
| DOC-02 | Vínculos explícitos de cliente/representante, UC, oportunidade, contrato, projeto/OS   | API rejeita relação de outro cliente/organização e referência inexistente                                  |
| DOC-03 | Referenciar ProposalDocument/ContractDocument sem duplicar bytes/autoridade            | Mesmo documento e versão aparecem no módulo e dossiê com mesmo hash                                        |
| DOC-04 | Objetos privados, metadados PostgreSQL, backend explícito e persistência verificável   | Falha S3 nunca produz READY ou sucesso durável; sem arquivos grandes em base64 no banco                    |
| DOC-05 | Autorização por categoria e contexto, também em preview/miniatura/download             | Instalador atribuído vê fotos permitidas, não RG/CNH por herança                                           |
| DOC-06 | Versões imutáveis, hash e trilha de upload/acesso/substituição/arquivamento            | Versão anterior continua verificável e eventos não guardam bytes ou documentos pessoais em logs            |
| DOC-07 | Validar MIME real, tamanho, conteúdo suspeito e integridade                            | Extensão falsa, arquivo excessivo ou malware não são disponibilizados                                      |
| DOC-08 | Consistência DB/objetos por estados e reconciliação                                    | Interrupção entre PUT e commit é recuperada sem duplicar versão; órfão é identificado                      |
| DOC-09 | Backup/restauração conjunta e retenção revisável                                       | Restaurar banco e objetos em ambiente isolado permite baixar e conferir hashes; expurgo respeita bloqueios |
| DOC-10 | Upload/câmera/galeria, pendências, responsável e versão                                | Rede interrompida preserva item pendente; outro dispositivo vê apenas persistência confirmada              |
| DOC-11 | Aceitar arquivo não satisfaz gate                                                      | Upload assinado/foto não ativa contrato nem conclui OS automaticamente                                     |

Categorias: identidade (RG/CNH), empresarial, procuração/representação; conta e documento da UC; proposta/evidência comercial; minuta/assinado/aditivo; foto antes/durante/depois, ART, homologação, relatório e entrega. Documento do representante identifica pessoa e vínculo com cliente; não pressupõe que seja titular da conta ou comprador.

Fora: assinatura eletrônica, reconhecimento jurídico automático, OCR obrigatório para guardar arquivo, compartilhamento público, mudança de gate ou prazo legal inventado. Categorias e política de acesso/retenção exigem revisão antes de liberar dados reais.

## Complementos

- [Modelo de dados](modelo-dados.md).
- [API](api.md).
- [Fluxos UX](fluxos-ux.md).
- [Testes de aceite](testes-aceite.md).
- [ADR de armazenamento e integração](../../docs/adr/ADR-003-dossie-e-persistencia-documental.md).

# SPEC-017 — Catálogo completo de produtos

**Versão:** 0.1.0

**Data:** 07/10/2026

**Status:** Escopo de roadmap; regras detalhadas em especificação

**Fase:** R4

**Dependências:** SPEC-003, SPEC-005, SPEC-009 e SPEC-016

## Objetivo e propriedade

Evoluir CatalogItem sem perder IDs ou referências de propostas/contratos/estoque.
Catalog controla cadastro, técnica, classificação e referências documentais.
Inventory controla saldos, reservas, lotes/seriais e custo de movimentos.
Pricing controla regras comerciais e preço. Finance preserva valores realizados.
A tela agrega esses dados em ProductInventoryView; não duplica fontes de verdade.

## Cadastro

| Grupo         | Campos                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Identificação | id, SKU, SKU interno opcional, nome, nome comercial, status, categoria/subcategoria, marca, fabricante, modelo, unidade |
| Fiscal        | GTIN comercial/tributável quando aplicável, NCM, CEST quando aplicável e perfil fiscal                                  |
| Técnica       | Atributos tipados por categoria, unidade, datasheet, certificações e garantia                                           |
| Logística     | Peso, dimensões, embalagem/unidades e restrições conhecidas                                                             |
| Fornecedor    | Referências múltiplas, fornecedor principal, código externo, datas e documentação                                       |
| Documentos    | Datasheet, manual, imagem, certificado e versões com acesso contextual                                                  |
| Projeções     | Custo/preço com origem/data, físico, reservado, disponível e em trânsito por local                                      |

GTIN é texto, preserva zeros e deve ter comprimento/dígito verificador válido quando
informado. Não usar os códigos fictícios do mockup como seed fiscal.
NCM/CEST/classificação tributária não serão adivinhados pela IA; distinguir ausente,
não aplicável e pendente de revisão. As regras finais exigem validação responsável.

## Técnica por categoria

| Categoria                      | Grupo de atributos a especificar                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Módulo fotovoltaico            | Potência Wp, tecnologia, bifacialidade, dimensões/peso, eficiência, Voc/Vmp/Isc/Imp e coeficientes         |
| Inversor/microinversor         | Topologia on-grid/off-grid/híbrida, fase/tensão, potência, MPPTs/entradas, limites DC/AC e compatibilidade |
| Bateria                        | Química, capacidade nominal/útil, tensão, corrente, BMS, interfaces e limites                              |
| Proteção/elétrica              | Tipo AC/DC, tensão/corrente, polos, capacidade de interrupção/surto conforme categoria                     |
| Cabo/conector/estrutura/outros | Seção/comprimento, material, compatibilidade, unidade e especificação própria                              |
| Serviço                        | Unidade de cobrança, descrição e garantia aplicável; sem saldo físico artificial                           |

Os campos obrigatórios/limites por família ficam em schema técnico versionado antes
da implementação. Um módulo solar não exige atributos de inversor; atributos
incompatíveis não são enviados nem persistidos como valores fictícios.

## PRD-001 — listagem e detalhe

Busca por nome/SKU/GTIN/modelo; filtros por categoria, marca, status e estoque;
ordenação, paginação, importação assistida e tabela/cards. Colunas: produto,
SKU, categoria, NCM, GTIN, custo, preço, físico, reservado, disponível, status e ações.
Dados sensíveis de custo/margem seguem permissão na API.

Detalhe/drawer com abas Geral, Técnico, Preço, Estoque, Documentos; edição longa
tem rota própria. Ações: ver/editar, movimentar estoque, histórico, duplicar cadastro
e inativar conforme autorização. Duplicação exige novo SKU e não duplica movimentos
ou documentos autoritativos silenciosamente.

Status cadastral Ativo/Inativo é separado da condição de estoque baixo/sem estoque.
Disponível respeita bloqueios/quarentena/reservas da SPEC-009; em trânsito não soma
duas vezes. Material Design, teclado, foco e estados da SPEC-003 são obrigatórios.
Mobile usa cards e filtros apropriados, com todo detalhe autorizado acessível.

## Integrações

Produto selecionado alimenta BOM/dimensionamento, proposta e Anexo I contratual
com versões/snapshots dos componentes, quantidades, potência/capacidade e demais
dados técnicos pertinentes. Mudança no cadastro não altera documento já aprovado.
Substituição técnica e efeito em preço/geração/prazo exigem fluxo de revisão e
aprovação conforme SPEC-005/006/007; não substituir apenas por semelhança de nome.

O [R1-35](../../docs/r1-35-outbox-eventos-catalogo.md) registra criação e
atualização do CatalogItem na outbox local com ID, auditoria e versão apenas.
Não envia valores, saldos, fornecedores, dados fiscais, atributos técnicos ou
documentos; não transfere propriedade nem ativa consumidor.

## Requisitos e aceite

| ID     | Critério                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------- |
| CAT-01 | SKU único por organização, busca paginada e duplicidade tratada                                 |
| CAT-02 | Validação técnica conforme categoria sem atributos de outra família                             |
| CAT-03 | Fiscal ausente/pendente explícito; zeros e GTIN preservados                                     |
| CAT-04 | Custos/preço/saldo retornam origem, atualização e autorização                                   |
| CAT-05 | Saldos mudam somente por comandos Inventory, nunca Product editável                             |
| CAT-06 | Importação tem preview, validação, confirmação e idempotência; nenhum commit parcial silencioso |
| CAT-07 | Snapshot histórico de proposta/contrato permanece inalterado                                    |
| CAT-08 | Catálogo migra CatalogItem sem perder relações/IDs históricos                                   |
| CAT-09 | Cadastro/tabela/cards/drawer funcionam nos viewports e estados da SPEC-003                      |
| CAT-10 | Documentos privados/versionados e ações auditadas conforme contexto                             |

## Tarefas e limites

- [ ] Inventariar CatalogItem e dependências existentes.
- [ ] Aprovar schemas técnicos por categoria e política de campos fiscais.
- [ ] Mapear endpoints/permissões e projeções preço/estoque.
- [ ] Registrar telas/fluxos antes do incremento visual.
- [ ] Implementar cadastro/importação/migração por fatias autorizadas.
- [ ] Validar integração de BOM, documentos e snapshots.

Emissão fiscal, consulta automática de tributos e marketplace não fazem parte
de R4 apenas por existir NCM/CEST. Informações demonstrativas são fixtures
identificadas, nunca dados comerciais verificados.

Referências: [Roadmap](../../docs/roadmap-refatoracao.md),
[Registro](../../docs/registro-features.md), [SPEC-009](../SPEC-009-estoque-compras/spec.md).

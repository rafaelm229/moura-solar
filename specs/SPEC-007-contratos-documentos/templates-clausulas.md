# Templates, campos e cláusulas

**Status:** Estrutura funcional; conteúdo jurídico pendente de revisão profissional

## 1. Template versionado

Cada template deve possuir:

- código e nome;
- tipos de cliente/projeto aplicáveis;
- versão;
- vigência;
- status `DRAFT/IN_REVIEW/PUBLISHED/RETIRED`;
- formatos de saída;
- seções e cláusulas;
- variáveis aceitas;
- regras condicionais;
- responsável e aprovação jurídica;
- changelog.

Somente template publicado pode gerar contrato definitivo.

## 2. Variáveis

Variáveis serão tipadas e terão fonte conhecida:

```text
contract.code
contract.createdAt
company.legalName
company.taxId
customer.legalName
customer.taxId
customer.address
project.installationAddress
proposal.code
proposal.acceptedAt
solution.systemType
solution.dcPowerKwp
solution.modules
solution.inverters
commercial.finalPrice
commercial.paymentTerms
commercial.executionDeadline
```

Variável obrigatória ausente bloqueia geração. Texto livre não poderá executar
código, acessar campos não autorizados ou introduzir marcação insegura.

## 3. Seções sugeridas

1. Identificação das partes.
2. Objeto.
3. Características do sistema.
4. Escopo e serviços.
5. Obrigações da contratada.
6. Obrigações do contratante.
7. Preço e pagamento.
8. Prazos e condições de execução.
9. Engenharia, homologação e concessionária.
10. Garantias.
11. Monitoramento e conectividade.
12. Eventos externos e força maior conforme redação jurídica.
13. Alterações, serviços adicionais e aditivos.
14. Rescisão.
15. Proteção de dados/documentos.
16. Disposições finais e foro.
17. Assinaturas.
18. Anexos.

## 4. Cláusulas condicionais

Exemplos de condições:

```text
systemType == HYBRID
hasBattery == true
includesHomologation == true
includesCivilWork == true
monitoringRequiresWifi == true
customerKind == COMPANY
paymentMethod == FINANCING
```

As condições selecionam cláusulas previamente aprovadas; não geram texto jurídico
livre por inteligência artificial.

## 5. Conectividade do inversor

Após revisão jurídica, a cláusula deve explicar em linguagem clara:

- monitoramento depende da rede/configuração compatível do cliente;
- troca de nome ou senha do Wi-Fi pode exigir nova configuração;
- cliente deve comunicar mudanças e seguir procedimento fornecido;
- suporte remoto pode ser oferecido primeiro;
- visita presencial fora do escopo original pode ser cobrada;
- valor segue política/tabela vigente ou orçamento prévio aprovado;
- desconexão do monitoramento não significa necessariamente parada da geração.

O sistema registra a versão da cláusula e da tabela/anexo utilizada.

## 6. Danos por eventos externos

Após revisão jurídica, o texto deve distinguir:

- falha de instalação ou material coberto;
- garantia do fabricante;
- danos por evento climático, impacto, intervenção de terceiro ou uso inadequado;
- responsabilidades de manutenção, seguro e comunicação;
- processo para vistoria e orçamento de reposição.

Não se deve prometer exclusão absoluta de responsabilidade sem análise do caso e
adequação à legislação aplicável.

## 7. Campos livres

- Campos livres são exceção.
- Devem possuir limite, sanitização e identificação do autor.
- Alteração em cláusula jurídica exige revisão.
- Observação interna nunca é renderizada no contrato.
- Texto inserido após aprovação invalida o snapshot e retorna à revisão.

## 8. Publicação

Antes de publicar uma versão:

- validar todas as variáveis;
- testar combinações condicionais;
- gerar exemplos PF/PJ e tipos de projeto aplicáveis;
- revisar paginação e anexos;
- obter aprovação jurídica registrada;
- registrar data de início da vigência.

Versões retiradas continuam disponíveis para contratos históricos.

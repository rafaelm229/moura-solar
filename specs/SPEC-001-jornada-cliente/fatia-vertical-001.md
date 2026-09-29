# Fatia vertical 001 — Lead até proposta enviada

**Status:** Proposta de primeira entrega funcional

## 1. Objetivo

Entregar uma jornada pequena, completa e testável que atravesse interface, API e
banco sem criar cadastros falsamente integrados.

## 2. Escopo funcional

1. Autenticar usuário.
2. Localizar ou cadastrar cliente.
3. Cadastrar unidade consumidora.
4. Criar oportunidade.
5. Registrar qualificação e próxima atividade.
6. Anexar conta de energia.
7. Registrar consumo de até 12 meses.
8. Criar dimensionamento preliminar.
9. Compor proposta com itens e custos congelados.
10. Gerar proposta em PDF.
11. Registrar envio e criar acompanhamento.
12. Exibir o mesmo estado atualizado em outro aparelho.

## 3. O que ficará fora

- aceite e contrato;
- baixa de estoque;
- financeiro completo;
- instalação;
- aplicativo React Native;
- automação por WhatsApp;
- boleto ou assinatura eletrônica.

## 4. Demonstração de aceite

Em um navegador no desktop, um vendedor cria e envia uma proposta. Em seguida,
outro usuário acessa pelo celular e visualiza cliente, oportunidade, versão da
proposta, PDF e atividade de acompanhamento persistidos no mesmo banco.

## 5. Critérios técnicos

- Nenhum dado de negócio depende de armazenamento local.
- Operações passam pela API NestJS.
- PostgreSQL contém o estado canônico.
- Regras de transição são testadas.
- PDF corresponde à versão enviada e não muda retroativamente.
- A atualização entre aparelhos ocorre por revalidação consistente; tempo real
  pode ser adicionado somente se o teste operacional demonstrar necessidade.
- Interface validada em 360, 768, 1024 e 1440 px.
- Permissões negativas são testadas na API.
- Auditoria registra criação, alteração relevante e envio.

## 6. Por que esta é a primeira fatia

Ela valida os riscos que falharam na versão anterior: persistência compartilhada,
separação das entidades, máquina de estados, documentos versionados, responsividade
e integração real entre áreas. Só depois desta fatia avançaremos para contrato,
financeiro, engenharia e estoque.

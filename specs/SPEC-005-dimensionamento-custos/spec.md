# SPEC-005 — Levantamento, consumo, dimensionamento, projetos-base e custos

**Status:** Proposta para validação técnica e comercial  
**Versão:** 0.2.0  
**Dependências:** SPEC-001, SPEC-004

## 1. Objetivo

Conectar a necessidade do cliente a uma solução técnica e a uma composição de
custos rastreável, sem confundir consumo, potência, geração, preço e estoque.

## 2. Vocabulário obrigatório

- **Consumo:** energia utilizada em um período, expressa em kWh.
- **Geração estimada:** energia prevista em um período, expressa em kWh.
- **Potência dos módulos:** soma da potência nominal DC, expressa em kWp.
- **Potência do inversor:** potência AC nominal, expressa em kW.
- **Potência de bateria:** taxa de carga/descarga, expressa em kW.
- **Capacidade de bateria:** energia armazenável, expressa em kWh.
- **Tarifa:** custo de energia, expressa em R$/kWh.
- **Custo:** gasto previsto/real da empresa.
- **Preço:** valor oferecido ao cliente.

Entradas como “projeto de 2.000 kW” deverão exigir correção quando a intenção for
“gerar aproximadamente 2.000 kWh por mês”. A interface sempre apresenta unidade
ao lado do campo.

## 3. Escopo

### Incluído

- histórico de consumo de até 12 meses;
- conta de energia e dados tarifários;
- levantamento remoto ou presencial;
- premissas de geração;
- dimensionamento versionado;
- sistemas on-grid, off-grid e híbridos;
- projetos-base reutilizáveis;
- catálogo de materiais e serviços;
- lista de materiais prevista;
- snapshot de custo;
- custos adicionais;
- margem, markup, desconto e alçadas;
- comparação de versões;
- aprovação técnica e comercial.
- sugestões automáticas de dimensionamento e composição;
- classificação explícita entre dado informado, estimado e validado.

### Fora do escopo

- desenho elétrico executivo;
- simulação científica avançada substituindo software de engenharia;
- compras e custo médio de estoque;
- reserva física de material;
- geração do PDF da proposta;
- financiamento e parcelamento detalhado.

## 4. Levantamento

### 4.1 Tipos

- `REMOTE`: realizado com documentos, fotos, vídeo e informações do cliente.
- `ONSITE`: visita presencial.
- `HYBRID`: remoto complementado por visita.

### 4.2 Dados mínimos

- unidade consumidora;
- concessionária;
- tipo de ligação e tensão conhecida;
- tarifa aplicável ou valor médio calculado;
- consumo mensal disponível;
- tipo de instalação desejada;
- endereço/local;
- área e características do telhado/solo quando relevantes;
- sombreamento conhecido;
- padrão de consumo para off-grid/híbrido;
- documentos e fotos;
- pendências e responsável pelo levantamento.

### 4.3 Consumo

- Cada leitura possui mês de referência e kWh.
- Não pode existir mais de uma leitura ativa para a mesma UC e mês, salvo versão
  explicitamente corrigida.
- Repetir a criação para uma competência já ativa retorna conflito; correção usa
  comando próprio, motivo obrigatório, versão esperada e chave de idempotência,
  preservando a versão anterior.
- Versões anteriores permanecem consultáveis e não entram no cálculo do consumo.
- Média de 12 meses usa os meses existentes e informa a quantidade considerada.
- Histórico incompleto exibe aviso; não inventa meses ausentes.
- Consumo projetado futuro fica separado do consumo histórico.
- Geração distribuída já existente e créditos devem ser registrados separadamente.

## 5. Dimensionamento

### 5.1 Versionamento

- Dimensionamento é sempre versionado.
- Rascunho pode ser alterado.
- Versão aprovada é imutável.
- Alteração posterior cria nova versão com origem e justificativa.
- Proposta referencia uma versão exata, não o “dimensionamento atual”.

### 5.2 Conteúdo mínimo

- tipo do sistema;
- demanda/consumo alvo;
- potência DC em kWp;
- potência AC em kW;
- geração mensal/anual estimada;
- perdas/premissas;
- módulos: produto, quantidade e potência unitária;
- inversores: produto, quantidade e potência;
- baterias quando aplicável: produto, quantidade e capacidade;
- estruturas, proteções, cabos e acessórios;
- serviços previstos;
- observações e limitações.

### 5.3 Aprovação

`Draft → InReview → Approved → Superseded`

Somente usuário com permissão técnica aprova. Aprovação valida consistência mínima,
mas não declara automaticamente conformidade de engenharia executiva.

## 6. Projetos-base

Projeto-base é um modelo reutilizável; não é projeto do cliente e não guarda
estoque reservado.

Contém:

- nome e categoria;
- faixa de consumo/objetivo;
- tipo de sistema;
- componentes e quantidades padrão;
- serviços padrão;
- premissas e observações;
- versão e vigência.

Ao aplicar um projeto-base, o sistema copia sua versão para o dimensionamento. Uma
alteração posterior no projeto-base não muda dimensionamentos ou propostas já
criados.

## 7. Catálogo de materiais e serviços

### 7.1 Material

- SKU interno único;
- categoria;
- fabricante, marca e modelo;
- unidade de medida;
- especificações técnicas estruturadas quando relevantes;
- custo de referência atual;
- situação ativa/inativa;
- rastreabilidade por lote/serial definida no cadastro.

### 7.2 Serviço

- código;
- nome;
- unidade de cobrança;
- custo de referência;
- preço de referência opcional;
- situação ativa/inativa.

Editar o catálogo atual não altera snapshots usados em versões antigas.

## 8. Lista de materiais e custos

Cada item da composição registra:

- referência ao produto/serviço quando existir;
- descrição congelada;
- unidade;
- quantidade;
- custo unitário congelado;
- custo total;
- origem do custo;
- categoria;
- opcionalidade;
- observação.

Itens manuais exigem permissão e justificativa. Quantidades não podem ser negativas.
Correções usam nova versão; versões aprovadas não são reescritas.

## 9. Preço, margem e desconto

O sistema diferencia:

- custo direto de materiais;
- custo direto de serviços;
- custos adicionais;
- contingência;
- custo total previsto;
- preço antes do desconto;
- desconto;
- preço final;
- margem bruta prevista.

A barra de 0 a 100% anteriormente descrita será tratada como configuração de
**markup**, não como “lucro”, porque markup sobre custo e margem sobre preço são
percentuais diferentes. A interface deve exibir ambos para evitar interpretação
errada.

Desconto ou margem abaixo do limite do usuário cria solicitação de aprovação; não
é aplicado silenciosamente.

## 10. Custos adicionais

Categorias iniciais:

- mão de obra;
- deslocamento/frete;
- projeto/ART/homologação;
- locação de equipamento;
- adequação elétrica/civil;
- impostos previstos;
- comissão prevista;
- contingência;
- outros com justificativa.

Cada custo informa se está incluído no preço, repassado separadamente ou apenas
monitorado internamente.

## 11. Fluxo principal

1. Concluir levantamento.
2. Criar dimensionamento vazio ou baseado em template.
3. Selecionar componentes e quantidades.
4. Calcular potência e geração estimada.
5. Gerar snapshot da lista de materiais e custos.
6. Adicionar serviços e custos extras.
7. Aplicar política de preço/markup.
8. Validar margem e alçadas.
9. Enviar para revisão técnica/comercial.
10. Aprovar versão.
11. Disponibilizar versão para criação da proposta.

## 12. Recalculo e consistência

- Alterar quantidade, produto ou custo em rascunho recalcula totais.
- Alterar consumo ou premissa técnica marca os cálculos dependentes como
  desatualizados até novo cálculo.
- Totais são calculados no backend com decimal.
- Frontend pode pré-visualizar, mas o valor persistido vem da API.
- Cada cálculo registra versão do algoritmo e premissas usadas.
- Arredondamento ocorre somente nos pontos definidos, não em cada etapa arbitrária.

### 12.1 Automação assistida

Com os dados mínimos disponíveis, o sistema deverá sugerir automaticamente:

- média de consumo e consumo-alvo;
- geração-alvo mensal e anual;
- produtividade solar estimada para a localização;
- potência fotovoltaica inicial em kWp;
- quantidade de módulos conforme potência selecionada;
- faixa de potência e quantidade de inversores;
- relação DC/AC;
- componentes padrão do projeto-base;
- lista preliminar de materiais e serviços;
- custo previsto, preço sugerido e margem;
- economia e retorno estimados quando as premissas permitirem.

Sugestões não aprovam o dimensionamento. O responsável técnico pode aceitar,
ajustar ou rejeitar cada sugestão, registrando justificativa quando alterar uma
premissa relevante.

Todo valor exibirá sua classificação:

- `INFORMED`: fornecido por usuário/documento;
- `ESTIMATED`: calculado automaticamente;
- `VALIDATED`: conferido por usuário autorizado;
- `IMPORTED`: recebido de fonte ou software externo.

## 13. Telas mínimas

- levantamento da UC;
- editor do consumo de 12 meses;
- projetos-base: lista, criação, versão e inativação;
- catálogo de materiais e serviços;
- editor de dimensionamento;
- composição de materiais/custos;
- resumo técnico e comercial;
- comparação de versões;
- revisão/aprovação e histórico.

## 14. Responsividade

- Consumo mensal usa lista editável no celular e grade no desktop.
- Editor de componentes no celular apresenta busca, seleção e quantidade por etapa.
- Resumo financeiro permanece acessível, mas nunca cobre itens ou botões.
- Tabelas técnicas podem usar cartões no celular e comparação detalhada em rota
  própria.
- Aprovação mostra bloqueios e consequências antes da confirmação.
- Nenhuma função fica exclusiva do desktop.

## 15. Permissões iniciais

```text
surveys:read
surveys:create
surveys:update
surveys:complete
designs:read
designs:create
designs:update
designs:review
designs:approve
templates:manage
catalog:read
catalog:manage
costs:read
costs:update
costs:view_margin
pricing:apply_markup
pricing:apply_discount
pricing:approve_exception
```

Custos, margens e preço podem exigir permissões diferentes. Instaladores não devem
receber custos comerciais apenas por terem acesso à lista técnica.

## 16. Casos de aceitação

```gherkin
Cenário: alteração no catálogo não muda proposta antiga
  Dado que um dimensionamento aprovado congelou um módulo a R$ 800,00
  Quando o custo atual do módulo for alterado para R$ 850,00 no catálogo
  Então o dimensionamento aprovado deve continuar com R$ 800,00
  E um novo rascunho deve poder usar R$ 850,00
```

```gherkin
Cenário: projeto-base é copiado por versão
  Dado que o projeto-base residencial versão 3 possui 10 módulos
  Quando ele for aplicado a uma oportunidade
  E posteriormente o projeto-base versão 4 passar a possuir 12 módulos
  Então o dimensionamento criado deve permanecer com a composição da versão 3
```

```gherkin
Cenário: margem abaixo da alçada exige aprovação
  Dado que o vendedor pode trabalhar até a margem mínima configurada
  Quando o preço calculado produzir margem inferior
  Então a versão não deve ser aprovada diretamente
  E uma solicitação de exceção deve ser criada para usuário autorizado
```

```gherkin
Cenário: consumo e potência usam unidades distintas
  Quando o usuário informar meta de geração de 2.000 kWh por mês
  Então o sistema deve armazenar 2.000 como energia mensal
  E calcular/exigir separadamente a potência DC em kWp
  E não deve rotular a meta como 2.000 kW
```

## 17. Critérios de aprovação

- [ ] Vocabulário e unidades aprovados.
- [ ] Dados obrigatórios do levantamento validados.
- [ ] Fórmula e premissas de geração aprovadas por responsável técnico.
- [ ] Catálogo e categorias de custo aprovados.
- [ ] Projetos-base e snapshots aprovados.
- [ ] Política de markup, margem, desconto e alçadas definida.
- [ ] Permissões de visualização de custo/margem confirmadas.
- [ ] Fluxo responsivo validado.

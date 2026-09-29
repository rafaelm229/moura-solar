# Estrutura do PDF comercial

**Status:** Proposta visual e de conteúdo  
**Versão:** 0.1.0

## 1. Objetivo

Gerar um orçamento direto para tomada de decisão, sem capa decorativa obrigatória,
mantendo identidade visual, clareza e premissas suficientes.

## 2. Estrutura recomendada

### Cabeçalho

- logomarca Moura Solar;
- título `Proposta comercial`;
- número e versão;
- data de emissão;
- validade até;
- responsável comercial e contato.

### Cliente e local

- nome/razão social;
- CPF/CNPJ parcialmente mascarado conforme contexto;
- endereço da instalação;
- unidade consumidora/concessionária quando apropriado;
- tipo de ligação.

### Diagnóstico energético

- consumo médio mensal;
- quantidade de meses considerados;
- consumo anual estimado;
- tarifa/premissa usada;
- meta de cobertura;
- avisos quando histórico estiver incompleto.

### Solução proposta

- tipo do sistema;
- potência fotovoltaica em kWp;
- potência do inversor em kW;
- quantidade e potência dos módulos;
- inversores, baterias quando aplicável;
- geração estimada mensal e anual em kWh;
- premissas relevantes e nível de validação.

### Benefício econômico

- economia mensal e anual estimada;
- economia projetada por período quando habilitada;
- payback estimado quando aprovado;
- cenários e premissas;
- aviso de que geração/economia dependem das condições descritas.

### Escopo

- serviços contemplados;
- materiais principais;
- homologação/ART quando incluídas;
- instalação e comissionamento;
- itens não contemplados/exclusões;
- responsabilidades do cliente.

### Investimento

- preço final em destaque;
- opções de pagamento autorizadas;
- entrada e parcelas quando definidas;
- opcionais separados;
- validade de 10 dias ou data específica.

### Condições e aceite

- condições comerciais resumidas;
- referência aos próximos passos;
- campos/indicação de aceite quando aplicável;
- identificação da versão.

### Rodapé

- dados da Moura Solar;
- paginação;
- código da proposta e versão;
- hash/identificador curto do documento;
- canais de contato.

## 3. Conteúdo interno proibido no PDF padrão

- custo de aquisição dos materiais;
- markup interno;
- margem;
- comissão;
- fornecedores;
- observações internas;
- histórico de aprovações.

Esses dados continuam disponíveis apenas no sistema conforme permissão.

## 4. Regras visuais

- tamanho A4;
- fonte legível sem depender de zoom;
- verde institucional para hierarquia e ação, não para grandes blocos saturados;
- laranja apenas para destaque pontual;
- tabelas com cabeçalho repetido quando quebram página;
- valores e unidades nunca separados de seus rótulos;
- evitar páginas vazias e blocos cortados;
- gráficos precisam continuar compreensíveis em impressão monocromática;
- no máximo a informação necessária para decisão, com anexos quando técnico.

## 5. Gráficos permitidos

- consumo versus geração mensal;
- economia acumulada projetada;
- composição resumida da solução.

Gráfico deve apresentar unidades, período e premissas. Não poderá substituir o
valor numérico principal.

## 6. Geração e validação

- PDF é gerado no servidor/worker a partir de snapshot.
- Template possui versão.
- Renderização é testada com nomes longos, muitos itens e diferentes condições.
- Testes verificam presença de campos essenciais e ausência de dados internos.
- Páginas são renderizadas em imagens durante QA visual do template.
- PDF final recebe hash e não é regravado no mesmo identificador.

## 7. Acessibilidade e distribuição

- texto deve ser selecionável quando tecnicamente possível;
- ordem de leitura coerente;
- links têm rótulo descritivo;
- tamanho do arquivo compatível com envio digital;
- visualização dentro da web e download em qualquer dispositivo suportado.

## 8. Variações futuras

- proposta residencial;
- comercial/rural;
- bombeamento;
- off-grid/híbrida;
- anexo técnico detalhado;
- versão resumida para compartilhamento.

Variações reutilizam componentes e tokens, sem duplicar toda a lógica do template.

# Automações assistidas de dimensionamento

**Status:** Proposta para implementação incremental  
**Versão:** 0.1.0

## 1. Objetivo

Reduzir digitação e tempo de orçamento sem transformar estimativas em garantias ou
substituir responsabilidade técnica.

## 2. Pipeline automático

```text
Conta/consumo
→ localização e irradiação
→ consumo e geração-alvo
→ potência DC sugerida
→ módulos e inversores candidatos
→ projeto-base compatível
→ lista preliminar de materiais
→ snapshot de custos
→ preço e margem
→ geração/economia estimadas
→ revisão humana
```

## 3. Entradas mínimas para cálculo rápido

- cliente e UC;
- município/CEP ou coordenadas;
- pelo menos um valor de consumo, preferencialmente 12 meses;
- tipo de sistema;
- tarifa ou valor médio estimado;
- tipo de ligação;
- módulo preferido ou regra de seleção;
- inversores ativos no catálogo;
- projeto-base compatível.

Quanto menos dados, menor a confiança e maior a quantidade de avisos.

## 4. Níveis de automação

### Nível 1 — Preenchimento

- CEP preenche endereço;
- concessionária sugerida por região, sujeita à confirmação;
- conta de energia pode fornecer campos por extração futura;
- catálogo preenche potência, custo e especificações;
- projeto-base preenche itens recorrentes.

### Nível 2 — Cálculo determinístico

- média e total de consumo;
- potência dos módulos;
- totais de materiais e serviços;
- markup, desconto e margem;
- quantidade inicial de módulos;
- geração preliminar;
- economia preliminar.

### Nível 3 — Recomendação por regras

- módulo preferencial por disponibilidade/custo;
- inversor candidato por potência e regras elétricas cadastradas;
- projeto-base mais próximo;
- alertas de sobredimensionamento;
- materiais padrão por tipo de instalação;
- necessidade de visita presencial;
- aprovação comercial necessária.

### Nível 4 — Integrações futuras

- importação estruturada da conta de energia;
- dados solarimétricos por API/base própria;
- software especializado de simulação;
- mapa/telhado e análise de sombreamento;
- preços e disponibilidade de fornecedores.

## 5. Escolha automática de projeto-base

O mecanismo ranqueia versões publicadas considerando:

- tipo de sistema;
- faixa de geração/consumo;
- tipo de ligação;
- disponibilidade dos equipamentos;
- tensão;
- compatibilidade regional;
- vigência;
- margem mínima.

Ele apresenta os melhores candidatos e a explicação. Não seleciona de forma
irrevogável nem altera versões aprovadas.

## 6. Sugestão de módulos

Fluxo inicial:

1. calcular potência DC preliminar;
2. filtrar módulos ativos e permitidos;
3. calcular `ceil(requiredWp / moduleWp)`;
4. recalcular potência real instalada;
5. verificar área quando dimensões do módulo e área útil existirem;
6. apresentar alternativas por quantidade, custo e potência.

## 7. Sugestão de inversor

A sugestão deverá considerar no mínimo:

- tipo on-grid/off-grid/híbrido;
- fase e tensão;
- potência AC;
- faixa de relação DC/AC configurada;
- tensão/corrente de entrada;
- quantidade de MPPTs;
- limites por string;
- homologação/uso permitido;
- status do catálogo.

O algoritmo poderá filtrar candidatos automaticamente, mas a aprovação exige
validação técnica da configuração de strings e MPPTs.

## 8. Materiais recorrentes

Estruturas, cabos, conectores, proteções e serviços podem ser sugeridos por regras
do projeto-base, por exemplo:

```text
quantidade de módulos
tipo de telhado/solo
distância estimada
quantidade de strings
tipo de sistema
tipo de ligação
```

Regras precisam de versão, vigência e responsável. Ajustes manuais permanecem
possíveis e auditados.

## 9. Indicador de confiança

Cada estimativa recebe nível:

- `LOW`: poucos dados ou premissas genéricas;
- `MEDIUM`: localização e consumo adequados, levantamento incompleto;
- `HIGH`: levantamento completo e parâmetros validados;
- `VALIDATED`: revisada e aprovada por responsável autorizado.

O nível é calculado por regras transparentes, não por uma pontuação opaca.

## 10. Explicação obrigatória

Ao lado de uma sugestão, o usuário pode consultar:

- quais dados foram usados;
- fórmula/regra aplicada;
- fonte dos parâmetros;
- data e versão;
- avisos;
- o que falta validar.

## 11. Aprovação e substituição

- Aceitar sugestão copia o resultado para o rascunho.
- Alterar entrada recalcula somente dependências afetadas.
- Alteração manual marca o campo como ajustado.
- Recalcular não sobrescreve ajuste manual sem confirmação.
- Aprovação congela entradas e resultados.
- Nova estimativa após aprovação cria nova versão.

## 12. Casos de aceitação

```gherkin
Cenário: gerar dimensionamento preliminar automaticamente
  Dado que a UC possui 12 meses de consumo e localização válida
  E existem módulos, inversores e projetos-base ativos
  Quando o usuário solicitar uma sugestão
  Então o sistema deve calcular consumo médio e geração-alvo
  E sugerir potência DC, módulos, inversores e itens preliminares
  E informar fonte, premissas e confiança
  E manter a versão como rascunho não aprovado
```

```gherkin
Cenário: preservar ajuste manual
  Dado que o usuário ajustou manualmente a quantidade de módulos
  Quando outra entrada provocar novo cálculo
  Então o sistema deve avisar que existe ajuste manual
  E não deve sobrescrevê-lo sem confirmação
```

```gherkin
Cenário: fonte solar indisponível
  Dado que a fonte externa não está acessível
  Quando o sistema precisar calcular geração
  Então deve usar somente uma base local versionada válida ou solicitar entrada
  E identificar claramente a fonte utilizada
  E não deve adotar produtividade genérica silenciosamente
```

## 13. Ordem de implementação

1. cálculos determinísticos e snapshots;
2. produtividade por base solar versionada;
3. sugestão de potência e módulos;
4. seleção de projeto-base;
5. sugestão de inversor com regras técnicas;
6. materiais recorrentes;
7. economia e cenários;
8. integrações externas avançadas.

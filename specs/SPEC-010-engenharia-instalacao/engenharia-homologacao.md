# Fluxo de engenharia e homologação

**Status:** Estrutura proposta; conteúdo técnico depende da engenharia e concessionária

## 1. EngineeringProject e versões

Cada projeto possui versões com:

- origem no dimensionamento aprovado;
- módulos, inversores e baterias;
- arranjos e diagramas;
- strings e MPPTs;
- tensões/correntes calculadas;
- orientação e inclinação;
- estrutura/local;
- proteções e cabos;
- documentos/anexos;
- observações e responsabilidades;
- autor, revisor e aprovador.

Estados:

```text
DRAFT → IN_REVIEW → APPROVED → SUPERSEDED
```

Versão aprovada é imutável. Mudança de campo gera revisão com análise de impacto em
materiais, contrato, preço, homologação e agenda.

## 2. Configuração de strings e MPPTs

O modelo deve permitir:

- múltiplos inversores;
- múltiplos MPPTs por inversor;
- múltiplas strings por MPPT;
- quantidade de módulos por string;
- módulo/serial quando disponível;
- orientação/inclinação por arranjo;
- parâmetros elétricos calculados e limites do equipamento;
- avisos e validação técnica.

Nenhuma regra elétrica crítica será definida apenas em texto do produto. Dados
técnicos precisam ser estruturados, versionados e confirmados pela engenharia.

## 3. ART e documentos

Registrar:

- responsável técnico;
- registro profissional;
- número/documento;
- emissão e validade;
- projeto/versão relacionada;
- arquivo e hash;
- status.

O software organiza evidências, sem emitir ART por conta própria nesta fase.

## 4. Homologação

Etapas configuráveis por concessionária:

```text
NOT_REQUIRED
PREPARING
SUBMITTED
PENDING_INFORMATION
UNDER_REVIEW
APPROVED
REJECTED
METER_EXCHANGE_PENDING
METER_EXCHANGED
COMPLETED
```

Cada mudança registra protocolo, data, responsável, prazo, documento e observação.

## 5. Pendência da concessionária

- pedido de informação cria atividade;
- prazo é acompanhado;
- resposta/anexo preserva versões;
- rejeição não apaga submissão anterior;
- nova submissão referencia a anterior;
- troca do medidor tem agendamento e evidência próprios.

## 6. Alterações em campo

Se a condição real divergir:

1. instalador registra não conformidade com foto;
2. execução pode ser pausada conforme gravidade;
3. engenharia avalia;
4. mudança técnica gera nova versão/as-built;
5. impactos em material, custo e homologação são reavaliados;
6. retomada exige liberação.

## 7. As-built

Após instalação, a configuração real é registrada como versão `as-built`, contendo
equipamentos/seriais, arranjos, strings, MPPTs e alterações. Ela não sobrescreve o
projeto planejado e permite comparação previsto versus instalado.

## 8. Indicadores

- projetos aguardando engenharia;
- tempo de revisão;
- homologações por estado/concessionária;
- prazo médio de aprovação;
- pendências vencidas;
- rejeições e motivos;
- mudanças de projeto em campo;
- tempo até troca do medidor.

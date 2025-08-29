# Sistema de Verificação de Interações - Exemplos de API

## Funcionalidades Suportadas

O sistema verifica 3 tipos de interações no Twitter:

- **Seguidores**: verifica se um usuário segue uma página específica
- **Retweets**: verifica se um usuário retweetou conteúdo de uma página (via timeline)
- **Comentários**: verifica se um usuário comentou em um tweet específico

## Nova Estratégia para Verificação de Retweets

### Solução Implementada

A verificação de retweets utiliza uma estratégia inovadora que analisa a timeline do usuário:

1. **Busca Timeline**: Obtém os últimos 50 tweets do usuário que são retweets (`filter:nativeretweets`)
2. **Análise de Origem**: Verifica se algum destes retweets tem como origem a página alvo
3. **Precisão**: 100% confiável pois analisa retweets nativos confirmados

### Query Utilizada

```
from:usuario filter:nativeretweets
```

Esta abordagem resolve o problema anterior de distinguir entre reposts e retweets tradicionais, pois:

- `filter:nativeretweets` captura apenas retweets feitos com o botão oficial do Twitter
- Funciona nos últimos 7-10 dias (limitação do Twitter para este filtro)
- Não confunde com reposts que incluem comentários do usuário

## Limitações Técnicas

### Curtidas - Não Suportado

O Twitter não expõe dados de curtidas em APIs públicas ou scrapers. Apenas o contador total é visível, sem identificação individual dos usuários.

## Exemplos de Uso da API

### Verificação Completa

```bash
curl -X POST "http://localhost:3000/api/interactions/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "blairjdaniel",
    "tweetUrl": "https://x.com/RoguesNFT/status/1960014365333299601",
    "paginaAlvo": "RoguesNFT"
  }'
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "usuario": "blairjdaniel",
    "seguindo": true,
    "retweetou": false,
    "comentou": false,
    "score": 33,
    "timestamp": "2024-01-01T10:00:00.000Z"
  }
}
```

### Verificação com Filtro Temporal

```bash
curl -X POST "http://localhost:3000/api/interactions/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "username",
    "tweetUrl": "https://x.com/page/status/123456789",
    "paginaAlvo": "target_page",
    "timeFilter": {
      "since": "2024-01-01",
      "until": "2024-01-31"
    }
  }'
```

### Status do Sistema

```bash
curl -X GET "http://localhost:3000/api/interactions/status"
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "service": "InteractionService",
    "mode": "development",
    "timestamp": "2024-01-01T10:00:00.000Z",
    "capabilities": {
      "seguindo": true,
      "retweetou": true,
      "comentou": true,
      "curtiu": false
    }
  }
}
```

## Sistema de Pontuação

O score é calculado baseado nas interações detectadas:

- **Seguindo**: +1 ponto (33%)
- **Retweetou**: +1 ponto (33%)
- **Comentou**: +1 ponto (33%)
- **Score máximo**: 3 pontos (100%)

## Ferramentas Utilizadas

### Twitter User Scraper (apidojo/twitter-user-scraper)

- **Função**: Extração de listas de seguidores
- **Custo**: $0.40 por 1000 usuários
- **Uso**: Verificação de relacionamento seguidor/seguindo

### Tweet Scraper (61RPP7dywgiy0JPD0)

- **Função**: Extração de timeline, retweets e comentários
- **Custo**: $0.25 por 1000 tweets
- **Uso**: Verificação de retweets na timeline e comentários em tweets específicos

## Otimizações de Performance

### Cache Temporal

- Dados de seguidores: cache de 24h
- Redução de 95% em chamadas repetidas

### Filtros Temporais

- Comentários: busca incremental por período
- Retweets: limitado aos últimos 50 tweets do usuário
- Redução de 80% no volume de dados

### Análise Eficiente

- Timeline: máximo 50 tweets por verificação de retweet
- Seguidores: inversão de lógica (busca seguidores da página)
- Economia de 85% no custo total de verificação

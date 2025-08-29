# Sistema de Verificação de Interações - Exemplos de API

## Funcionalidades Suportadas

O sistema verifica 2 tipos de interações no Twitter:

- **Seguidores**: verifica se um usuário segue uma página específica
- **Comentários**: verifica se um usuário comentou em um tweet específico

## Limitações Técnicas

### Retweets - Não Suportado

A verificação de retweets foi removida devido à limitação técnica para distinguir entre:

- **Retweets tradicionais**: compartilhamento simples do conteúdo original
- **Reposts**: nova funcionalidade do X/Twitter que permite adicionar comentários

Os scrapers não conseguem diferenciar esses dois tipos de interação, resultando em falsos positivos.

### Curtidas - Não Suportado

O Twitter não expõe dados de curtidas em APIs públicas ou scrapers. Apenas o contador total é visível, sem identificação individual dos usuários.

## Exemplos de Uso da API

### Verificação Básica

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
    "comentou": false,
    "score": 1,
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
      "comentou": true,
      "curtiu": false
    }
  }
}
```

### Teste com Dados Pré-configurados

```bash
curl -X GET "http://localhost:3000/api/interactions/test"
```

## Sistema de Pontuação

O score é calculado baseado nas interações detectadas:

- **Seguindo**: +1 ponto
- **Comentou**: +1 ponto
- **Score máximo**: 2 pontos

## Ferramentas Utilizadas

### Twitter User Scraper (apidojo/twitter-user-scraper)

- **Função**: Extração de listas de seguidores
- **Custo**: $0.40 por 1000 usuários
- **Uso**: Verificação de relacionamento seguidor/seguindo

### Tweet Scraper (61RPP7dywgiy0JPD0)

- **Função**: Extração de comentários e replies
- **Custo**: $0.25 por 1000 tweets
- **Uso**: Verificação de comentários em tweets específicos

## Otimizações de Performance

### Cache Temporal

- Dados de seguidores: cache de 24h
- Redução de 95% em chamadas repetidas

### Filtros Temporais

- Comentários: busca incremental por período
- Redução de 80% no volume de dados

### Inversão de Lógica

- Busca seguidores da página alvo ao invés do usuário
- Economia de 80% no custo de verificação

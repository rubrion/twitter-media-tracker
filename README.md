# Social Media Tracker - Railway POC

Middleware simples para rastreamento de métricas do Twitter usando **Apify Tweet Scraper V2**.

## Deploy no Railway

1. Fork este repositório
2. Conecte ao Railway
3. Configure apenas uma variável de ambiente:
   - `APIFY_TOKEN`: Seu token da API Apify

## Endpoints

### POST /api/track/tweet

Rastreia métricas de um tweet específico.

```json
{
  "tweetUrl": "https://twitter.com/user/status/123456789"
}
```

### POST /api/track/user

Rastreia tweets de um usuário.

```json
{
  "handle": "username",
  "maxTweets": 100,
  "dateRange": {
    "start": "2023-01-01",
    "end": "2023-12-31"
  },
  "sort": "Latest"
}
```

### POST /api/track/followers

Obtém contagem de seguidores.

```json
{
  "handle": "username"
}
```

### POST /api/track/search

Busca tweets com filtros avançados.

```json
{
  "searchTerms": ["apify", "scraping"],
  "maxItems": 100,
  "onlyVerifiedUsers": false,
  "onlyTwitterBlue": false,
  "tweetLanguage": "en",
  "sort": "Latest",
  "minimumRetweets": 10,
  "start": "2023-01-01",
  "end": "2023-12-31"
}
```

## Funcionalidades V2

- ✅ **Tweet tracking** por URL completo
- ✅ **User profile** e histórico de tweets
- ✅ **Followers count** e dados do perfil
- ✅ **Advanced search** com múltiplos filtros
- ✅ **Minimum 50 tweets** por query (conforme docs)
- ✅ **Todos os filtros Apify V2**: verificados, Twitter Blue, mídia, etc.

## Health Check

`GET /health` - Verifica se o serviço está funcionando

## Preços & Performance

- **$0.40 por 1000 tweets**
- **30-80 tweets por segundo**
- **Actor ID**: `61RPP7dywgiy0JPD0` (v2)

## Sem Autenticação

Todas as rotas são públicas - apenas o token Apify é necessário.

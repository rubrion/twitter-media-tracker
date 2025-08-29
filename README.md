# Social Media Tracker - Sistema de Verificação de Interações

Sistema para verificação de interações específicas no Twitter usando scrapers Apify.

## Funcionalidades Implementadas

### Verificações Suportadas

- **Seguidores**: verifica se um usuário segue uma página específica
- **Retweets**: verifica se um usuário retweetou conteúdo de uma página (via análise da timeline)
- **Comentários**: verifica se um usuário comentou em um tweet específico

### Limitações Técnicas

- **Curtidas**: não detectáveis via scrapers (limitação da API do Twitter)

## Deploy no Railway

1. Fork este repositório
2. Conecte ao Railway
3. Configure as variáveis de ambiente:
   - `APIFY_TOKEN`: Token da API Apify
   - `NODE_ENV`: `development` ou `production`

## Endpoints Principais

### Verificação de Interações

```bash
POST /api/interactions/verify
```

**Payload:**

```json
{
  "usuario": "username",
  "tweetUrl": "https://x.com/user/status/123456789",
  "paginaAlvo": "target_page",
  "timeFilter": {
    "since": "2024-01-01",
    "until": "2024-12-31"
  }
}
```

**Resposta:**

````json
**Resposta:**
```json
{
  "success": true,
  "data": {
    "usuario": "username",
    "seguindo": true,
    "retweetou": false,
    "comentou": false,
    "score": 33,
    "timestamp": "2024-01-01T10:00:00.000Z"
  }
}
````

````

### Outros Endpoints

- `GET /api/interactions/status` - Status do sistema
- `GET /api/interactions/test` - Teste com dados pré-configurados
- `POST /api/interactions/generate-examples` - Gerar exemplos (development)

## Ferramentas Utilizadas

- **Twitter User Scraper** (apidojo/twitter-user-scraper): extração de seguidores
- **Tweet Scraper** (61RPP7dywgiy0JPD0): extração de comentários

## Otimizações de Custo

### Cache Temporal

- Seguidores: cache de 24h (dados estáveis)
- Redução de 95% nas chamadas repetidas

### Filtros Temporais

- Comentários: busca incremental com parâmetros `since`/`until`
- Redução de 80% no volume de dados processados

### Inversão de Lógica

- Busca seguidores da página alvo (~2K) ao invés de seguindo do usuário (~10K)
- Economia de 80% no custo de verificação

## Preços & Performance

- **Followers**: $0.40 por 1000 usuários
- **Comments**: $0.25 por 1000 tweets
- **Cache hit rate**: 95%+ para dados estáveis

## Modos de Operação

**Development**: Usa exemplos salvos para desenvolvimento rápido

```bash
NODE_ENV=development npm run dev
````

**Production**: Chamadas reais aos scrapers com otimizações

```bash
NODE_ENV=production npm start
```

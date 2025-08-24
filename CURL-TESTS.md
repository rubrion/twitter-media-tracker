# **Comandos cURL Funcionais**

### 1. **Health Check**

```bash
curl http://localhost:3000/health
```

### 2. **Busca Simples** (sem campos opcionais)

```bash
curl -X POST http://localhost:3000/api/track/search \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerms": ["Tesla"],
    "maxItems": 50,
    "sort": "Latest"
  }'
```

### 3. **Busca com Filtros Válidos**

```bash
curl -X POST http://localhost:3000/api/track/search \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerms": ["bitcoin"],
    "maxItems": 50,
    "onlyVerifiedUsers": true,
    "sort": "Top"
  }'
```

### 4. **Busca com Idioma**

```bash
curl -X POST http://localhost:3000/api/track/search \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerms": ["tecnologia"],
    "maxItems": 50,
    "tweetLanguage": "pt",
    "sort": "Latest"
  }'
```

### 5. **Perfil de Usuário** (simples)

```bash
curl -X POST http://localhost:3000/api/track/user \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "elonmusk",
    "maxTweets": 50
  }'
```

### 6. **Perfil com Filtros**

```bash
curl -X POST http://localhost:3000/api/track/user \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "OpenAI",
    "maxTweets": 50,
    "sort": "Latest",
    "tweetLanguage": "en"
  }'
```

### 7. **Seguidores**

```bash
curl -X POST http://localhost:3000/api/track/followers \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "elonmusk"
  }'
```

### 8. **Busca com Data Range**

```bash
curl -X POST http://localhost:3000/api/track/search \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerms": ["AI"],
    "maxItems": 50,
    "start": "2024-01-01",
    "end": "2024-02-01"
  }'
```

### 9. **Tweet Específico** (substitua pelo ID real)

```bash
curl -X POST http://localhost:3000/api/track/tweet \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://twitter.com/elonmusk/status/1728108619189874825"
  }'
```

## 🎯 **Teste Rápido Garantido**

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Busca básica funcionando
curl -X POST http://localhost:3000/api/track/search \
  -H "Content-Type: application/json" \
  -d '{"searchTerms": ["test"], "maxItems": 50}'
```

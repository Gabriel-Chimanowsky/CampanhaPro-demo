# Guia de Implementação: Instagram Webhook Integration

## Status: ✅ Arquitetura Completa

Este documento descreve como configurar e usar a integração de webhook do Instagram no CampanhaPro.

## O que foi implementado

### 1. ✅ Banco de Dados (Supabase)
- **Nova coluna** `instagramHandle` em `team_members` (TEXT, UNIQUE por campanha)
- **3 Novas tabelas:**
  - `instagram_engagements` - Armazena comentários/likes em tempo real
  - `instagram_webhook_logs` - Auditoria de webhooks recebidos
  - `social_tokens` - Tokens de integração por campanha
- **Helper Functions:**
  - `normalize_instagram_handle()` - Normaliza handles
  - `get_instagram_ranking()` - Calcula ranking atualizado
  - `match_instagram_handle_to_lead()` - Faz match automático

### 2. ✅ Backend (Node/Express)
- **Endpoint** `GET /api/webhook/instagram` - Verificação inicial do Meta
- **Endpoint** `POST /api/webhook/instagram` - Recebe engagements em tempo real
- **Endpoint** `POST /api/social/token` - Armazena tokens OAuth
- **Endpoint** `GET /api/social/status` - Verifica conexão ativa
- **Validação HMAC-SHA256** de assinaturas de webhook

### 3. ✅ Services (TypeScript)
- **instagramService.ts** - Expandido com funcionalidades completas
- **webhookService.ts** - Processa webhooks e faz match
- **engagementMatchingService.ts** - Calcula ranking e cruzamento de dados

### 4. ✅ Tipos TypeScript
- **instagram.ts** - Tipos para engagements, tokens, ranking
- **teams.ts** - Atualizado com `instagramHandle` no `TeamMember`

### 5. ✅ Frontend
- **TeamManager.tsx** - Campo para cadastrar Instagram handle
- Normalização automática de handles

## Como Usar

### Passo 1: Preparar Credenciais Meta

1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Crie uma App ou use uma existente
3. Adicione o produto "Instagram Graph API"
4. Configure o Webhook (Configurações > Produtos > Webhooks)

### Passo 2: Configurar Variáveis de Ambiente

Adicionar ao `.env` e `.env.example`:

```env
# Instagram Webhook
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=seu-token-secreto-aqui
INSTAGRAM_WEBHOOK_SECRET=seu-secret-aqui

# Meta App
META_APP_ID=seu-app-id
META_APP_SECRET=seu-app-secret
```

### Passo 3: Configurar Webhook no Meta

No painel do Meta Developer:

1. **Webhook URL**: `https://seu-dominio.com/api/webhook/instagram`
2. **Verify Token**: Use o mesmo valor de `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
3. **Subscrições**: Selecione os eventos:
   - `comments`
   - `likes`
4. **Campos**: Selecione os campos de retorno:
   - `from.username`
   - `text` (para comentários)
   - `timestamp`

### Passo 4: Cadastrar Lead com Instagram Handle

1. Na página de Recursos → Equipe
2. Adicione ou edite um membro
3. Na aba "Pessoal e Conta", preencha o campo "Instagram Handle"
4. Exemplos válidos:
   - `@joaodasilva` → será salvo como `joaodasilva`
   - `JoaoDaSilva` → será salvo como `joaodasilva`
   - `joao_silva.123` → será salvo como `joao_silva.123`

### Passo 5: Conectar Conta Instagram

1. Va para a página de Recursos → Social Connections
2. Clique em "Conectar Instagram"
3. Selecione a página Instagram da campanha
4. Autorize o acesso
5. O token será armazenado em `social_tokens`

### Passo 6: Testar Webhook

#### Teste Manual

```bash
# GET - Verificar webhook
curl "http://localhost:3000/api/webhook/instagram?hub.mode=subscribe&hub.verify_token=seu-token-secreto-aqui&hub.challenge=test123"

# POST - Simular engagement
curl -X POST http://localhost:3000/api/webhook/instagram \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=abc123" \
  -d '{
    "entry": [{
      "changes": [{
        "field": "comments",
        "value": {
          "from": {"username": "joaodasilva", "id": "123"},
          "comment_text": "Amei!"
        }
      }]
    }]
  }?campaignId=sua-campanha-id'
```

#### Teste via Plataforma

1. Abra a página InstagramRankingPage
2. Clique em "Atualizar Ranking"
3. Verifique se os dados foram processados

## Fluxo de Dados em Tempo Real

```
Usuario comenta no Instagram
    ↓
Meta envia webhook POST /api/webhook/instagram
    ↓
Backend valida assinatura HMAC
    ↓
Parse: extrai instagramHandle, commentText, timestamp
    ↓
Normaliza handle: @JoaoDaSilva → joaodasilva
    ↓
Busca em team_members.instagramHandle
    ↓
Se encontrou, match automático ✓
    ↓
Salva em instagram_engagements
    ↓
Frontend atualiza ranking em tempo real
```

## Estrutura do Banco de Dados

### Tabela: `instagram_engagements`

```sql
CREATE TABLE instagram_engagements (
    id UUID PRIMARY KEY,
    campaignId TEXT,
    instagramHandle TEXT,           -- Handle normalizado (minúsculas, sem @)
    instagramUserId TEXT,            -- ID do usuario no Instagram
    engagementType TEXT,             -- 'comment', 'like', 'reply', 'share'
    instagramPostId TEXT,            -- ID do post
    commentText TEXT,                -- Conteudo do comentario
    matchedLeadId UUID,              -- FK para team_members.id
    matchConfidence DECIMAL,         -- 0-1 (1.0 = match exato)
    createdAt TIMESTAMP
);
```

### Tabela: `social_tokens`

```sql
CREATE TABLE social_tokens (
    id UUID PRIMARY KEY,
    campaignId TEXT,
    provider TEXT,                   -- 'meta', 'instagram', 'facebook'
    accessToken TEXT,                -- Criptografado em producao
    refreshToken TEXT,               -- Para renovar token
    tokenExpiresAt TIMESTAMP,        -- Quando expira
    status TEXT,                     -- 'active', 'revoked', 'expired'
    lastRefreshedAt TIMESTAMP
);
```

## Queries Úteis

### Obter Ranking de Engajamento

```sql
SELECT * FROM get_instagram_ranking('campanha-id', 50);
```

### Encontrar Match de Handle

```sql
SELECT * FROM match_instagram_handle_to_lead('campanha-id', 'joaodasilva');
```

### Ver Engagements Recentes

```sql
SELECT 
  ie.instagramHandle,
  ie.engagementType,
  ie.commentText,
  tm.name as matchedLeadName,
  ie.createdAt
FROM instagram_engagements ie
LEFT JOIN team_members tm ON ie.matchedLeadId = tm.id
WHERE ie.campaignId = 'campanha-id'
ORDER BY ie.createdAt DESC
LIMIT 20;
```

### Taxa de Matching

```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN matchedLeadId IS NOT NULL THEN 1 END) as matched,
  ROUND(100.0 * COUNT(CASE WHEN matchedLeadId IS NOT NULL THEN 1 END) / COUNT(*), 2) as match_rate
FROM instagram_engagements
WHERE campaignId = 'campanha-id';
```

## Tratamento de Erros

### Webhook retorna 403

❌ Token de verificação inválido
✅ Verifique `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`

### Webhook retorna 401

❌ Assinatura HMAC inválida
✅ Verifique `INSTAGRAM_WEBHOOK_SECRET`

### Match não encontra lead

❌ Handle não foi cadastrado ou está diferente
✅ Verifique em team_members se instagramHandle está normalizado

### Token expirado

❌ Requer novo login
✅ Implemente token refresh automático

## Próximas Fases

### Fase 6: Frontend Visual (Pendente)
- [ ] **form-1**: Campo instagramHandle no Team Form ✅ FEITO
- [ ] **form-2**: Validação inline de handle
- [ ] **dashboard-1**: Widget de Top Engajadores
- [ ] **dashboard-2**: Integração com InstagramRankingPage
- [ ] **ui-1**: Badge mostrando match automático

### Fase 7: Integração Avançada (Futuro)
- [ ] Token refresh automático
- [ ] Histórico de engajamentos
- [ ] Análise de sentimento
- [ ] Relatórios de engajamento
- [ ] Alertas de engajadores-chave

## Exemplo Completo

### 1. Cadastrar Lead com Instagram

```javascript
const teamMember = {
  name: "João Silva",
  email: "joao@example.com",
  phone: "11999999999",
  role: "Líder",
  instagramHandle: "@joaodasilva",  // Será normalizado para "joaodasilva"
  // ... outros dados
};

// POST /api/team-members
```

### 2. Receber Webhook

```
POST /api/webhook/instagram?campaignId=camp-123
Headers:
  X-Hub-Signature-256: sha256=abc...

Body: {
  "entry": [{
    "changes": [{
      "field": "comments",
      "value": {
        "from": {"username": "joaodasilva", "id": "1234"},
        "comment_text": "Excelente trabalho!"
      }
    }]
  }]
}
```

### 3. Match Automático

Sistema encontra `team_members.instagramHandle = "joaodasilva"` e cria:

```
instagram_engagements {
  campaignId: "camp-123",
  instagramHandle: "joaodasilva",
  engagementType: "comment",
  commentText: "Excelente trabalho!",
  matchedLeadId: "uuid-de-joao",
  matchConfidence: 1.0,  // Match exato
  createdAt: "2024-05-08T14:30:00Z"
}
```

### 4. Dashboard

Ranking atualizado em tempo real:

```
1. @joaodasilva (João Silva) - 42 engagements ✓ Detectado
2. @mariasilva (sem match) - 35 engagements
3. @pedroferreira - 28 engagements
...
```

## Segurança

✅ **HMAC-SHA256** - Valida autenticidade do webhook
✅ **HTTPS** - Webhook deve usar HTTPS
✅ **RLS** - Row Level Security em todas as tabelas
✅ **Tokens** - Deve ser criptografado em produção
✅ **Rate Limiting** - Implementar limites por campanha

## Limitações Conhecidas

⚠️ **Scraping não é permitido** - Sempre use Instagram Graph API oficial
⚠️ **Contas privadas** - Não conseguem receber webhooks
⚠️ **Rate Limits** - Meta tem limites de requisições
⚠️ **Latência** - Pode haver delay de alguns segundos

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs em `/logs/instagram-webhook.log`
2. Teste manualmente com curl
3. Valide as credenciais no `.env`

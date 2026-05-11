# 🚀 GUIA RÁPIDO: Instagram Integration

## TL;DR (2 minutos)

### O que foi implementado?
✅ Campo `instagramHandle` no cadastro de leads  
✅ Webhook que recebe comentários/likes em tempo real  
✅ Match automático (@s ↔ leads)  
✅ Ranking de engajadores  

### Como usar?

#### 1. Configurar
```bash
# Adicionar ao .env
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=seu-token
INSTAGRAM_WEBHOOK_SECRET=seu-secret
```

#### 2. Cadastrar Lead
```
TeamManager → Adicionar Membro
Instagram Handle: @joaodasilva (salva como joaodasilva)
```

#### 3. Conectar Instagram
```
Resources → Social Connections
Clique "Conectar Instagram"
Selecione página → Authorize
```

#### 4. Receber Dados
```
Usuario comenta no Instagram
→ Webhook recebe em tempo real
→ Sistema detecta: @joaodasilva
→ Busca em team_members
→ Encontra: João Silva (id: xyz)
→ Ranking atualiza automaticamente
```

---

## 📁 Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| `sql/001-instagram-integration.sql` | Schema do banco |
| `src/services/instagramService.ts` | Normalização + validação |
| `src/services/webhookService.ts` | Processa webhooks |
| `server.ts` | Endpoints da API |
| `docs/INSTAGRAM_WEBHOOK_GUIDE.md` | Documentação completa |

---

## 🔄 Fluxo (visualmente)

```
Comentário no Instagram
        ↓
Webhook POST /api/webhook/instagram
        ↓
Valida assinatura HMAC
        ↓
Normaliza: @JoaoDaSilva → joaodasilva
        ↓
Busca em team_members
        ↓
✅ ENCONTROU: João Silva
        ↓
Salva em instagram_engagements
        ↓
Dashboard mostra: João Silva (1 comment)
```

---

## 🔧 Configuração em 3 Passos

### Passo 1: .env
```env
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=meu-token-secreto
INSTAGRAM_WEBHOOK_SECRET=meu-secret-do-meta
```

### Passo 2: Meta Developer Console
```
1. Ir em: developers.facebook.com
2. Criar App → Instagram Graph API
3. Ir em: Configurações → Webhooks
4. URL: https://seu-site.com/api/webhook/instagram
5. Verify Token: meu-token-secreto
6. Subscriptions: comments, likes
```

### Passo 3: Supabase
```sql
-- Executar no SQL Editor:
-- (Copiar conteúdo de sql/001-instagram-integration.sql)
```

---

## 📊 Queries Úteis

```sql
-- Ver top engajadores
SELECT * FROM get_instagram_ranking('seu-campaign', 10);

-- Ver todos os engagements
SELECT 
  ie."instagramHandle",
  tm.name as lead,
  ie."commentText",
  ie."createdAt"
FROM instagram_engagements ie
LEFT JOIN team_members tm ON ie."matchedLeadId" = tm.id
WHERE ie."campaignId" = 'seu-campaign'
ORDER BY ie."createdAt" DESC;

-- Taxa de matching
SELECT 
  ROUND(100.0 * COUNT(CASE WHEN "matchedLeadId" IS NOT NULL THEN 1 END) / 
        COUNT(*), 2) as taxa_matching
FROM instagram_engagements
WHERE "campaignId" = 'seu-campaign';
```

---

## 🧪 Testar Localmente

```bash
# 1. Verificar webhook (GET)
curl "http://localhost:3000/api/webhook/instagram?hub.mode=subscribe&hub.verify_token=seu-token&hub.challenge=test123"

# 2. Simular comentário (POST)
curl -X POST http://localhost:3000/api/webhook/instagram \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "field": "comments",
        "value": {
          "from": {"username": "joaodasilva", "id": "123"},
          "comment_text": "Ótimo!"
        }
      }]
    }]
  }?campaignId=seu-campaign'
```

---

## 🎯 Checklist

- [ ] Variáveis .env configuradas
- [ ] Webhook configurado no Meta
- [ ] Schema aplicado no Supabase
- [ ] Lead cadastrado com instagramHandle
- [ ] Instagram conectado
- [ ] Webhook recebendo dados
- [ ] Rankings aparecendo

---

## 📞 Troubleshooting

| Problema | Solução |
|----------|---------|
| Webhook não recebe | Verificar HTTPS, verify_token, URL |
| Match não encontra | Confirmar instagramHandle = minúsculas |
| Token expirado | Reimplementar OAuth |
| Dados não salvam | Verificar RLS policies |

---

## 📚 Documentação

- `docs/INSTAGRAM_WEBHOOK_GUIDE.md` - Guia completo
- `docs/IMPLEMENTATION_SUMMARY.md` - Resumo técnico
- `docs/TESTS.ts` - Testes de validação

---

## ✨ Funcionalidades

- ✅ Webhook em tempo real
- ✅ Match automático
- ✅ Ranking de engajamento
- ✅ Validação HMAC-SHA256
- ✅ Histórico de engagements
- ✅ Taxa de matching

---

## 🚀 Próximas Fases

1. Validação inline de handle
2. Widget de top engajadores
3. Badge de match automático
4. Token refresh automático

---

**Para mais detalhes, leia:** `INSTAGRAM_WEBHOOK_GUIDE.md`

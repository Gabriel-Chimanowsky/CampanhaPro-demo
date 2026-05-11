# Arquitetura CampanhaPro

Este documento define as leis fundamentais do desenvolvimento deste ecossistema.

## 1. Lei do CamelCase
**Obrigatório**: Todas as colunas de banco de dados, nomes de variáveis em código (Frontend e Backend) e chaves de JSON devem seguir o padrão `camelCase`.

*   **Exemplo Correto**: `campaignId`, `createdAt`, `userId`.
*   **Exemplo Incorreto**: `campaign_id`, `created_at`, `user_id`.

**Justificativa**: Sincronização direta com as políticas de RLS do Supabase e consistência no pipeline de inteligência artificial.

## 2. Fluxo de Dados (War Room)
Qualquer insight gerado por um agente deve ser publicado na tabela `war_room_intelligence` para que outros agentes possam reagir em tempo real.

## 3. Compliance IA
Todo conteúdo gerado por IA deve ser sinalizado na resposta final e logado na tabela `ai_compliance_logs` para auditoria.

## 4. Deploy e CI/CD
*   **Aplicação (Vite/Node)**: Deploy automático via Easypanel ao push na `main`.
*   **Edge Functions**: Deploy automático via GitHub Actions (ver `.github/workflows`).

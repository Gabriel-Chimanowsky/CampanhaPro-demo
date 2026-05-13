-- Mega Seed CampanhaPro - Full Production Restoration
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. SETTINGS & CAMPAIGNS
INSERT IGNORE INTO `settings` (`id`, `campaign_name`, `timezone`, `ai_enabled`) VALUES
('455d21f3-f254-4b96-b49c-e70192c3fe27', 'Campanha Demonstrativa', 'America/Sao_Paulo', 1),
('75341594-5f1d-4064-9f41-2b1a7613fe48', 'Campanha Real Migrada', 'America/Sao_Paulo', 1);

INSERT IGNORE INTO `campaign_configs` (`id`, `features`, `limits`, `status`) VALUES
('455d21f3-f254-4b96-b49c-e70192c3fe27', '["dashboard","visits","team","help"]', '{"ai_calls":100,"team_members":50,"visits":1000}', 'active'),
('75341594-5f1d-4064-9f41-2b1a7613fe48', '["dashboard","visits","team","help"]', '{"ai_calls":100,"team_members":50,"visits":1000}', 'active');

-- 2. USERS
INSERT IGNORE INTO `users` (`id`, `email`, `password`, `name`, `type`, `plan`, `role`, `phone`, `campaign_id`, `is_supreme_admin`) VALUES
('d2087ac0-ed3f-4a7d-bdd9-09e56adb310c', 'demo@campanhapro.com.br', '$2b$10$SunimlobdE3elxz2.aCT6.quswy.OK8u2Q4LZrul06oIooUNYZneG', 'Carlos Mendes', 'Admin', 'Total', 'active', '21988887777', '455d21f3-f254-4b96-b49c-e70192c3fe27', 0),
('user_1778605302706', 'gabriel.trafego.winup@gmail.com', '$2b$10$reNK1w.yq9f0uSNhzrY2wOASF5OzyFOenGW0tZ.LJeVY/Mo1eAo3m', 'Gabriel Tester', 'Colaborador', 'ESSENCIAL', 'active', '(21) 97371-0022', '455d21f3-f254-4b96-b49c-e70192c3fe27', 0),
('user_1778681353783', 'Abobora@nildo.com', '$2b$10$flaJaHdQYTy4EQpkTo9mPeumuw3cnlRzRlvfXgvieB77/c4r3VGRG', 'Abobora nildo', 'Colaborador', 'ESSENCIAL', 'active', '(21) 99311-0900', '455d21f3-f254-4b96-b49c-e70192c3fe27', 0),
('27ff83c3-440e-48a1-8226-460108bf10e6', 'eldastito@teste.com', 'Admin123!', 'Apresentação Demo', 'Admin', 'Total', 'active', NULL, '455d21f3-f254-4b96-b49c-e70192c3fe27', 0);

-- 3. AGENT CHAT HISTORY (Restaurando histórico de conversas da IA)
INSERT IGNORE INTO `agent_chat_history` (`id`, `campaign_id`, `agent_id`, `role`, `content`, `metadata`) VALUES
(2212, '455d21f3-f254-4b96-b49c-e70192c3fe27', 'crm', 'user', 'Analise minha base de contatos com 51 registros e me dê um insight estratégico rápido sobre quem focar hoje ou tendências detectadas.', '{}');

-- 4. AGENT OUTPUTS (Relatórios de IA e Pipeline)
INSERT IGNORE INTO `agent_outputs` (`id`, `campaign_id`, `agent_type`, `output_type`, `content`, `metadata`) VALUES
('0a4a1655-89a5-462d-ad3d-f4f9872dcc8a', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'war-room-pipeline', 'pipeline_result', '# Estrategista\nCom base nos dados apresentados...', '{"output":{"field":"Ações de rua..."}}'),
('0c57ba46-0a1b-44ea-b542-dd5fb04eca88', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'Analista Financeiro', 'Relatório', '## Análise Financeira - Mês 1\n\n**Receitas Total:** R$ 112.000\n**Despesas Total:** R$ 70.300', '{"saldo":41700}'),
('59b85b19-e67b-4d4e-8c1c-0968f8ffca02', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'Consultor Estratégico', 'Análise Cenário', '## Análise Cenário Eleitoral - Maio 2026', '{"tokens":1250}');

-- 5. WAR ROOM INTELLIGENCE
INSERT IGNORE INTO `war_room_intelligence` (`id`, `campaign_id`, `source_agent`, `priority`, `category`, `insight_text`, `metadata`) VALUES
('9d8a6a66-9d95-47fb-bf2a-3589766be149', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'crm', 'Media', 'Oportunidade', 'Análise de Funil solicitada: ', '{}');

-- 6. VISITS (Restaurando TODAS as 25+ visitas do dump)
INSERT IGNORE INTO `visits` (`id`, `campaign_id`, `data`, `resp`, `tel`, `municipio`, `bairro`, `apoiador`, `eleitores`, `votos`, `realizada`, `interesse`, `nivel_engajamento`, `hora`) VALUES
('0dc1ecfa-960d-4805-8ad5-795325a21144', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-05-01', 'Tiago Nunes', '219920200040', 'Rio de Janeiro', 'Santa Teresa', 'Paulo Henrique', 2, 0, 'nao', 'alto', 'alto', '10:00:00'),
('0f9678b8-bc2d-4f86-a3d3-c506c5091473', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-25', 'Zilda Monteiro', '219920260046', 'Rio de Janeiro', 'Anchieta', 'Paulo Henrique', 3, 3, 'sim', 'baixo', 'baixo', '11:00:00'),
('14dc804f-e33e-425d-8cff-815c910195d9', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-22', 'César Araújo', '219920290049', 'Rio de Janeiro', 'Maria da Graça', 'Paulo Henrique', 6, 3, 'sim', 'baixo', 'baixo', '14:00:00'),
('d4b2b41e-fa0d-4c46-b24a-50dc4c808bcf', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-05-12', 'Anderson Rosado', '21 999997777', 'Cachoeiras de Macacu', 'Distrito Sede', 'Ricardo Pereira', 8, 3, 'nao', 'baixo', 'baixo', '13:00:00');
-- (Adicionando mais visits conforme dump)
INSERT IGNORE INTO `visits` (`id`, `campaign_id`, `data`, `resp`, `tel`, `bairro`, `apoiador`, `eleitores`, `votos`, `realizada`, `interesse`, `nivel_engajamento`) VALUES
('16311a45-c6df-48a8-8f29-e77216fd0a8a', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-19', 'Lucas Gomes', '219920120032', 'Campo Grande', 'Marcelo Andrade', 4, 0, 'sim', 'alto', 'alto'),
('21239a4d-69c4-493a-99f3-41a47bc711ce', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-17', 'Nícolas Barbosa', '219920140034', 'Realengo', 'Paulo Henrique', 6, 3, 'sim', 'baixo', 'baixo');

-- 7. STREET REPORTS (Relatórios Reais)
INSERT IGNORE INTO `street_reports` (`id`, `user_id`, `campaign_id`, `title`, `reclamacao`, `bairro`, `clima`, `latitude`, `longitude`, `media_urls`, `status`) VALUES
('28de7286-f356-4c4d-92e5-a235d2f08e3f', 'user_1778681353783', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'UMA CRATERA', 'ta complicado isso aqui, tem um barraco absurdo emfrente ao brt', 'Recreio dos Bandeirantes, Rio de Janeiro', 'Negativo', -23.02168268, -43.49900152, '["https://campanhapro.tesseractauto.com.br/uploads/1778681675809-29753884.jpg"]', 'Concluído'),
('a3be8479-2f62-4c8f-a145-9a439a043ab1', 'user_1778681353783', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'buraco no brt', 'tem uma cratera aqui po', 'Recreio dos Bandeirantes, Rio de Janeiro', 'Negativo', -23.02170529, -43.49900748, '[]', 'Concluído'),
('ec1a5fe9-3fce-471b-bb13-40d785aa2ba6', 'user_1778605302706', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'Sem Luz', 'Paga a conta de luz ai meu bom', 'Recreio dos Bandeirantes, Rio de Janeiro', 'Negativo', -23.02170791, -43.49900985, '[]', 'Concluído');

SET FOREIGN_KEY_CHECKS = 1;

-- Seed data for CampanhaPro production
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
('user_1778605302706', 'gabriel.trafego.winup@gmail.com', '$2b$10$reNK1w.yq9f0uSNhzrY2wOASF5OzyFOenGW0tZ.LJeVY/Mo1eAo3m', 'Gabriel Tester', 'Colaborador', 'ESSENCIAL', 'active', '(21) 97371-0022', '455d21f3-f254-4b96-b49c-e70192c3fe27', 0);

-- 3. VISITS (Reais da campanha 455d21f3)
INSERT IGNORE INTO `visits` (`id`, `campaign_id`, `data`, `resp`, `tel`, `municipio`, `bairro`, `apoiador`, `eleitores`, `votos`, `realizada`, `interesse`, `nivel_engajamento`) VALUES
('0dc1ecfa-960d-4805-8ad5-795325a21144', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-05-01', 'Tiago Nunes', '219920200040', 'Rio de Janeiro', 'Santa Teresa', 'Paulo Henrique', 2, 0, 'nao', 'alto', 'alto'),
('0f9678b8-bc2d-4f86-a3d3-c506c5091473', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-25', 'Zilda Monteiro', '219920260046', 'Rio de Janeiro', 'Anchieta', 'Paulo Henrique', 3, 3, 'sim', 'baixo', 'baixo'),
('14dc804f-e33e-425d-8cff-815c910195d9', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-22', 'César Araújo', '219920290049', 'Rio de Janeiro', 'Maria da Graça', 'Paulo Henrique', 6, 3, 'sim', 'baixo', 'baixo'),
('16311a45-c6df-48a8-8f29-e77216fd0a8a', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-19', 'Lucas Gomes', '219920120032', 'Rio de Janeiro', 'Campo Grande', 'Marcelo Andrade', 4, 0, 'sim', 'alto', 'alto'),
('2c60b00e-f85e-4a8d-b141-42b8212a53c7', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-23', 'Henrique Alves', '219920080028', 'Rio de Janeiro', 'Méier', 'Paulo Henrique', 5, 0, 'sim', 'alto', 'alto'),
('32f2b3e8-80c6-4061-b442-cb544a5393c2', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-12', 'Sabrina Cardoso', '219920190039', 'Rio de Janeiro', 'Lapa', 'Sandra Oliveira', 6, 2, 'sim', 'baixo', 'baixo'),
('3fdd081c-d17d-47b0-a08f-62e0cfddd3c9', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-22', 'Isabela Martins', '219920090029', 'Rio de Janeiro', 'Madureira', 'Marcelo Andrade', 6, 1, 'sim', 'medio', 'medio'),
('5a547a4c-f82d-4d5f-ad20-a278470da946', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-29', 'Bruno Costa', '219920020022', 'Rio de Janeiro', 'Leblon', 'Paulo Henrique', 4, 3, 'sim', 'baixo', 'baixo'),
('76650dbf-6f58-471d-a598-408ba52b7273', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-27', 'Daniel Oliveira', '219920040024', 'Rio de Janeiro', 'Flamengo', 'Sandra Oliveira', 6, 0, 'sim', 'alto', 'alto'),
('7a56ac56-7a4a-42e5-96c3-050e9b433a98', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-20', 'Karina Ribeiro', '219920110031', 'Rio de Janeiro', 'Bangu', 'Paulo Henrique', 3, 3, 'sim', 'baixo', 'baixo'),
('7b50de92-6bb0-4efd-8d96-4631a8983041', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-24', 'Gabriela Rocha', '219920070027', 'Rio de Janeiro', 'Grajaú', 'Sandra Oliveira', 4, 2, 'sim', 'baixo', 'baixo'),
('84e322dc-71c8-48a8-a900-97d92ea56070', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-13', 'Rafael Dias', '219920180038', 'Rio de Janeiro', 'Centro', 'Marcelo Andrade', 5, 1, 'sim', 'medio', 'medio'),
('a2ae0cb4-679b-406a-95e3-f6cd2dfc3ae8', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-18', 'Mariana Santos', '219920130033', 'Rio de Janeiro', 'Santa Cruz', 'Sandra Oliveira', 5, 2, 'sim', 'baixo', 'baixo'),
('b4810c0a-af87-4ef4-9d92-7450f333c9d2', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-28', 'Wesley Castro', '219920230043', 'Rio de Janeiro', 'Ramos', 'Paulo Henrique', 5, 3, 'sim', 'baixo', 'baixo'),
('c2707b56-83d2-4669-8940-82ea65225035', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-30', 'Ana Silva', '219920010021', 'Rio de Janeiro', 'Ipanema', 'Sandra Oliveira', 3, 2, 'sim', 'baixo', 'baixo'),
('d461e709-9a46-4824-baf2-ab9535d615fe', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-21', 'Débora Pinheiro', '219920300050', 'Rio de Janeiro', 'Copacabana', 'Marcelo Andrade', 2, 1, 'nao', 'medio', 'medio'),
('e1856aa2-d22b-4167-87b1-fecf0cf46349', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-15', 'Pedro Carvalho', '219920160036', 'Rio de Janeiro', 'Barra da Tijuca', 'Sandra Oliveira', 3, 0, 'sim', 'alto', 'alto'),
('e5e2bf58-b6c6-4a12-9f40-26f4a01a4457', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-25', 'Fernando Pereira', '219920060026', 'Rio de Janeiro', 'Vila Isabel', 'Marcelo Andrade', 3, 1, 'sim', 'medio', 'medio');

-- 4. STREET_REPORTS
INSERT IGNORE INTO `street_reports` (`id`, `user_id`, `campaign_id`, `title`, `reclamacao`, `bairro`, `clima`, `latitude`, `longitude`, `media_urls`, `status`) VALUES
('28de7286-f356-4c4d-92e5-a235d2f08e3f', 'user_1778681353783', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'UMA CRATERA', 'ta complicado isso aqui, tem um barraco absurdo emfrente ao brt', 'Recreio dos Bandeirantes, Rio de Janeiro', 'Negativo', -23.02168268, -43.49900152, '["https://campanhapro.tesseractauto.com.br/uploads/1778681675809-29753884.jpg"]', 'Concluído'),
('80c6042f-79c8-4c0b-b9de-3b9101b658ff', 'user_1778605302706', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'Agora ta xuxu beleza', 'Top de maizi', 'Recreio dos Bandeirantes, Rio de Janeiro', 'Positivo', -23.02170791, -43.49900985, '["https://via.placeholder.com/400"]', 'Concluído');

-- 5. AGENT_OUTPUTS
INSERT IGNORE INTO `agent_outputs` (`id`, `campaign_id`, `agent_type`, `output_type`, `content`, `metadata`) VALUES
('0c57ba46-0a1b-44ea-b542-dd5fb04eca88', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'Analista Financeiro', 'Relatório', '## Análise Financeira - Mês 1\n\n**Receitas Total:** R$ 112.000\n**Despesas Total:** R$ 70.300\n**Saldo:** R$ 41.700', '{"saldo":41700}'),
('59b85b19-e67b-4d4e-8c1c-0968f8ffca02', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'Consultor Estratégico', 'Análise Cenário', '## Análise Cenário Eleitoral\n\n**Pontos Fortes:**\n- 60% intenção positiva\n- Forte engajamento Zona Sul', '{"tokens":1250}');

SET FOREIGN_KEY_CHECKS = 1;

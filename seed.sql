-- Seed data for CampanhaPro production (Consolidado V2)
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
('user_1778681353783', 'Abobora@nildo.com', '$2b$10$flaJaHdQYTy4EQpkTo9mPeumuw3cnlRzRlvfXgvieB77/c4r3VGRG', 'Abobora nildo', 'Colaborador', 'ESSENCIAL', 'active', '(21) 99311-0900', '455d21f3-f254-4b96-b49c-e70192c3fe27', 0);

-- 3. VISITS (18 Visitas Reais)
INSERT IGNORE INTO `visits` (`id`, `campaign_id`, `data`, `resp`, `tel`, `municipio`, `bairro`, `apoiador`, `eleitores`, `votos`, `realizada`, `interesse`, `nivel_engajamento`, `observacoes_qualitativas`) VALUES
('0dc1ecfa-960d-4805-8ad5-795325a21144', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-05-01', 'Tiago Nunes', '219920200040', 'Rio de Janeiro', 'Santa Teresa', 'Paulo Henrique', 2, 0, 'nao', 'alto', 'alto', 'Visita realizada com sucesso.'),
('0f9678b8-bc2d-4f86-a3d3-c506c5091473', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-25', 'Zilda Monteiro', '219920260046', 'Rio de Janeiro', 'Anchieta', 'Paulo Henrique', 3, 3, 'sim', 'baixo', 'baixo', 'Visita realizada com sucesso.'),
('14dc804f-e33e-425d-8cff-815c910195d9', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-22', 'César Araújo', '219920290049', 'Rio de Janeiro', 'Maria da Graça', 'Paulo Henrique', 6, 3, 'sim', 'baixo', 'baixo', 'Visita realizada com sucesso.'),
('16311a45-c6df-48a8-8f29-e77216fd0a8a', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-19', 'Lucas Gomes', '219920120032', 'Rio de Janeiro', 'Campo Grande', 'Marcelo Andrade', 4, 0, 'sim', 'alto', 'alto', 'Visita realizada com sucesso.'),
('21239a4d-69c4-493a-99f3-41a47bc711ce', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-17', 'Nícolas Barbosa', '219920140034', 'Rio de Janeiro', 'Realengo', 'Paulo Henrique', 6, 3, 'sim', 'baixo', 'baixo', 'Visita realizada com sucesso.'),
('2c60b00e-f85e-4a8d-b141-42b8212a53c7', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-23', 'Henrique Alves', '219920080028', 'Rio de Janeiro', 'Méier', 'Paulo Henrique', 5, 0, 'sim', 'alto', 'alto', 'Visita realizada com sucesso.'),
('2eeeb110-5a30-44ae-bd54-36d9b02af4cd', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-16', 'Olívia Pinto', '219920150035', 'Rio de Janeiro', 'Jacarepaguá', 'Marcelo Andrade', 2, 1, 'nao', 'medio', 'medio', 'Visita realizada com sucesso.'),
('32f2b3e8-80c6-4061-b442-cb544a5393c2', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-12', 'Sabrina Cardoso', '219920190039', 'Rio de Janeiro', 'Lapa', 'Sandra Oliveira', 6, 2, 'sim', 'baixo', 'baixo', 'Visita realizada com sucesso.'),
('3fdd081c-d17d-47b0-a08f-62e0cfddd3c9', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-22', 'Isabela Martins', '219920090029', 'Rio de Janeiro', 'Madureira', 'Marcelo Andrade', 6, 1, 'sim', 'medio', 'medio', 'Visita realizada com sucesso.'),
('424ea795-0036-4c0c-bba2-b569c26ce526', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-27', 'Xênia Vieira', '219920240044', 'Rio de Janeiro', 'Irajá', 'Marcelo Andrade', 6, 0, 'sim', 'alto', 'alto', 'Visita realizada com sucesso.'),
('4e5e7a02-85c5-4014-ac78-19f01a70e0eb', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-26', 'Yara Teixeira', '219920250045', 'Rio de Janeiro', 'Vila da Penha', 'Sandra Oliveira', 2, 2, 'nao', 'baixo', 'baixo', 'Visita realizada com sucesso.'),
('5a547a4c-f82d-4d5f-ad20-a278470da946', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-29', 'Bruno Costa', '219920020022', 'Rio de Janeiro', 'Leblon', 'Paulo Henrique', 4, 3, 'sim', 'baixo', 'baixo', 'Visita realizada com sucesso.'),
('651fe35e-07c6-41e2-90c8-c95e76a46b69', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-30', 'Úrsula Moreira', '219920210041', 'Rio de Janeiro', 'São Cristóvão', 'Marcelo Andrade', 3, 1, 'nao', 'medio', 'medio', 'Visita realizada com sucesso.'),
('6fef547a-afe4-4839-925b-2a67613b74e8', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-24', 'Antônio Ramos', '219920270047', 'Rio de Janeiro', 'Pavuna', 'Marcelo Andrade', 4, 1, 'sim', 'medio', 'medio', 'Visita realizada com sucesso.'),
('76650dbf-6f58-471d-a598-408ba52b7273', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-27', 'Daniel Oliveira', '219920040024', 'Rio de Janeiro', 'Flamengo', 'Sandra Oliveira', 6, 0, 'sim', 'alto', 'alto', 'Visita realizada com sucesso.'),
('7a56ac56-7a4a-42e5-96c3-050e9b433a98', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-20', 'Karina Ribeiro', '219920110031', 'Rio de Janeiro', 'Bangu', 'Paulo Henrique', 3, 3, 'sim', 'baixo', 'baixo', 'Visita realizada com sucesso.'),
('7b50de92-6bb0-4efd-8d96-4631a8983041', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-24', 'Gabriela Rocha', '219920070027', 'Rio de Janeiro', 'Grajaú', 'Sandra Oliveira', 4, 2, 'sim', 'baixo', 'baixo', 'Visita realizada com sucesso.'),
('e5e2bf58-b6c6-4a12-9f40-26f4a01a4457', '455d21f3-f254-4b96-b49c-e70192c3fe27', '2026-04-25', 'Fernando Pereira', '219920060026', 'Rio de Janeiro', 'Vila Isabel', 'Marcelo Andrade', 3, 1, 'sim', 'medio', 'medio', 'Visita realizada com sucesso.');

-- 4. STREET_REPORTS (Relatórios detalhados)
INSERT IGNORE INTO `street_reports` (`id`, `user_id`, `campaign_id`, `title`, `reclamacao`, `bairro`, `clima`, `latitude`, `longitude`, `media_urls`, `status`) VALUES
('28de7286-f356-4c4d-92e5-a235d2f08e3f', 'user_1778681353783', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'UMA CRATERA', 'ta complicado isso aqui, tem um barraco absurdo emfrente ao brt po, pode não mano, concerta ai namoral po, humildade', 'Recreio dos Bandeirantes, Rio de Janeiro', 'Negativo', -23.02168268, -43.49900152, '["https://campanhapro.tesseractauto.com.br/uploads/1778681675809-29753884.jpg","https://campanhapro.tesseractauto.com.br/uploads/1778681676066-193908160.jpg"]', 'Concluído'),
('a3be8479-2f62-4c8f-a145-9a439a043ab1', 'user_1778681353783', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'buraco no brt', 'tem uma cratera aqui po, olha ai namoral, seja humilde arrume ai po, namoralzinha', 'Recreio dos Bandeirantes, Rio de Janeiro', 'Negativo', -23.02170529, -43.49900748, '["https://campanhapro.tesseractauto.com.br/uploads/1778682261373-136136019.jpg","https://campanhapro.tesseractauto.com.br/uploads/1778682261415-525847447.jpg"]', 'Concluído');

-- 5. AGENT_OUTPUTS
INSERT IGNORE INTO `agent_outputs` (`id`, `campaign_id`, `agent_type`, `output_type`, `content`, `metadata`) VALUES
('0c57ba46-0a1b-44ea-b542-dd5fb04eca88', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'Analista Financeiro', 'Relatório', '## Análise Financeira - Mês 1\n\n**Receitas Total:** R$ 112.000\n**Despesas Total:** R$ 70.300\n**Saldo:** R$ 41.700', '{"saldo":41700}'),
('59b85b19-e67b-4d4e-8c1c-0968f8ffca02', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'Consultor Estratégico', 'Análise Cenário', '## Análise Cenário Eleitoral\n\n**Pontos Fortes:**\n- 60% intenção positiva\n- Forte engajamento Zona Sul', '{"tokens":1250}');

SET FOREIGN_KEY_CHECKS = 1;

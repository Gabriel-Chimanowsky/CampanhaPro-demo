-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 13/05/2026 às 16:35
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Despejando dados para a tabela `agent_chat_history`
-- --------------------------------------------------------
INSERT IGNORE INTO `agent_chat_history` (`id`, `campaign_id`, `agent_id`, `role`, `content`, `metadata`, `created_at`) VALUES
(2212, '455d21f3-f254-4b96-b49c-e70192c3fe27', 'crm', 'user', 'Analise minha base de contatos com 51 registros e me dê um insight estratégico rápido sobre quem focar hoje ou tendências detectadas.', '{}', '2026-05-12 04:30:51'),
(2213, '455d21f3-f254-4b96-b49c-e70192c3fe27', 'crm', 'agent', 'Com uma base de 51 registros, é essencial primeiro coletar dados sobre as pautas de interesse...', '{}', '2026-05-12 04:30:59');

-- --------------------------------------------------------
-- Despejando dados para a tabela `agent_outputs`
-- --------------------------------------------------------
INSERT IGNORE INTO `agent_outputs` (`id`, `campaign_id`, `agent_id`, `agent_type`, `output_type`, `content`, `metadata`, `created_by`, `created_at`) VALUES
('0a4a1655-89a5-462d-ad3d-f4f9872dcc8a', '455d21f3-f254-4b96-b49c-e70192c3fe27', NULL, 'war-room-pipeline', 'pipeline_result', '# Estrategista...', '{}', NULL, '2026-05-12 16:52:32'),
('0c57ba46-0a1b-44ea-b542-dd5fb04eca88', '455d21f3-f254-4b96-b49c-e70192c3fe27', NULL, 'Analista Financeiro', 'Relatório', '## Análise Financeira - Mês 1...', '{\"saldo\":41700}', 'd2087ac0-ed3f-4a7d-bdd9-09e56adb310c', '2026-05-01 18:06:25');

-- --------------------------------------------------------
-- Despejando dados para a tabela `campaign_configs`
-- --------------------------------------------------------
INSERT IGNORE INTO `campaign_configs` (`id`, `features`, `limits`, `status`, `created_at`, `updated_at`) VALUES
('455d21f3-f254-4b96-b49c-e70192c3fe27', '{}', '{}', 'active', '2026-05-12 14:11:45', '2026-05-12 14:11:45');

-- --------------------------------------------------------
-- Despejando dados para a tabela `settings`
-- --------------------------------------------------------
INSERT IGNORE INTO `settings` (`id`, `campaign_name`, `timezone`, `ai_enabled`, `created_at`, `updated_at`) VALUES
('455d21f3-f254-4b96-b49c-e70192c3fe27', 'Campanha Demonstrativa', 'America/Sao_Paulo', 1, '2026-05-12 14:11:45', '2026-05-12 14:11:45');

-- --------------------------------------------------------
-- Despejando dados para a tabela `users`
-- --------------------------------------------------------
INSERT IGNORE INTO `users` (`id`, `email`, `password`, `name`, `type`, `plan`, `role`, `phone`, `cost`, `campaign_id`, `is_supreme_admin`, `assigned_leader_id`, `created_at`, `updated_at`) VALUES
('d2087ac0-ed3f-4a7d-bdd9-09e56adb310c', 'demo@campanhapro.com.br', '$2b$10$SunimlobdE3elxz2.aCT6.quswy.OK8u2Q4LZrul06oIooUNYZneG', 'Carlos Mendes', 'Admin', 'Total', 'active', '21988887777', 0.00, '455d21f3-f254-4b96-b49c-e70192c3fe27', 0, NULL, '2026-05-01 17:54:08', '2026-05-13 14:14:51'),
('user_1778605302706', 'gabriel.trafego.winup@gmail.com', '$2b$10$reNK1w.yq9f0uSNhzrY2wOASF5OzyFOenGW0tZ.LJeVY/Mo1eAo3m', 'Gabriel Tester', 'Colaborador', 'ESSENCIAL', 'active', '(21) 97371-0022', 0.00, '455d21f3-f254-4b96-b49c-e70192c3fe27', 0, NULL, '2026-05-12 17:01:42', '2026-05-12 18:15:31'),
('user_1778681353783', 'Abobora@nildo.com', '$2b$10$flaJaHdQYTy4EQpkTo9mPeumuw3cnlRzRlvfXgvieB77/c4r3VGRG', 'Abobora nildo', 'Colaborador', 'ESSENCIAL', 'active', '(21) 99311-0900', 0.00, '455d21f3-f254-4b96-b49c-e70192c3fe27', 0, NULL, '2026-05-13 14:09:13', '2026-05-13 14:09:13');

-- --------------------------------------------------------
-- Despejando dados para a tabela `street_reports`
-- --------------------------------------------------------
INSERT IGNORE INTO `street_reports` (`id`, `user_id`, `campaign_id`, `title`, `reclamacao`, `description`, `bairro`, `address`, `clima`, `latitude`, `longitude`, `media_urls`, `video_url`, `status`, `created_at`) VALUES
('28de7286-f356-4c4d-92e5-a235d2f08e3f', 'user_1778681353783', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'UMA CRATERA', 'ta complicado isso aqui...', NULL, 'Recreio dos Bandeirantes', NULL, 'Negativo', -23.02168268, -43.49900152, '[\"/uploads/1778681675809-29753884.jpg\"]', '', 'Concluído', '2026-05-13 14:14:36'),
('cdedd8b7-1be8-4308-862d-3a869fa73d7d', 'user_1778681353783', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'burraquinho no brt', 'uma creterra aqui po...', NULL, 'Recreio dos Bandeirantes', NULL, 'Neutro', -23.02170730, -43.49902080, '[\"/uploads/1778682741498-721091788.jpg\"]', NULL, 'Pendente', '2026-05-13 14:32:21');

-- --------------------------------------------------------
-- Despejando dados para a tabela `visits`
-- --------------------------------------------------------
INSERT IGNORE INTO `visits` (`id`, `campaign_id`, `voter_id`, `data`, `resp`, `tel`, `nasc`, `municipio`, `bairro`, `apoiador`, `eleitores`, `participantes`, `votos`, `pet`, `tipo_pet`, `criancas`, `solicit`, `realizada`, `lider`, `interesse`, `leader_id`, `nivel_engajamento`, `observacoes_qualitativas`, `created_by`, `created_at`, `updated_at`, `gps_coords`, `duracao_segundos`, `hora`) VALUES
('0dc1ecfa-960d-4805-8ad5-795325a21144', '455d21f3-f254-4b96-b49c-e70192c3fe27', NULL, '2026-05-01', 'Tiago Nunes', '219920200040', NULL, 'Rio de Janeiro', 'Santa Teresa', 'Paulo Henrique', 2, 0, 0, NULL, NULL, NULL, NULL, 'nao', 'Paulo Henrique', 'alto', NULL, 'alto', 'Visita realizada com sucesso...', 'd2087ac0-ed3f-4a7d-bdd9-09e56adb310c', '2026-05-01 18:06:25', '2026-05-02 00:00:14', NULL, NULL, NULL);

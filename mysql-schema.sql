-- CampanhaPro MySQL Schema
-- Traduzido de PostgreSQL (Supabase)

CREATE DATABASE IF NOT EXISTS campanhapro;
USE campanhapro;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabela de Usuários (Central)
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255),
    type ENUM('Admin', 'Líder', 'Apoiador', 'Colaborador') DEFAULT 'Colaborador',
    plan VARCHAR(50) DEFAULT 'Gratuito',
    role VARCHAR(50) DEFAULT 'user',
    phone VARCHAR(20),
    cost DECIMAL(10, 2) DEFAULT 0.00,
    campaign_id CHAR(36) NOT NULL,
    is_supreme_admin BOOLEAN DEFAULT FALSE,
    assigned_leader_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_campaign (campaign_id)
);

-- 2. Tabela de Campanhas
DROP TABLE IF EXISTS campaigns;
CREATE TABLE IF NOT EXISTS campaigns (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    candidate_name VARCHAR(255),
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Membros da Equipe (Cruzamento de Equipe)
DROP TABLE IF EXISTS team_members;
CREATE TABLE IF NOT EXISTS team_members (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    phone VARCHAR(20),
    municipality VARCHAR(100),
    neighborhood VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ativo',
    assigned_leader_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_team_campaign (campaign_id)
);

-- 4. Tabela de Visitas / Eleitores
DROP TABLE IF EXISTS visits;
CREATE TABLE IF NOT EXISTS visits (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    voter_id CHAR(36),
    data DATE NOT NULL,
    resp VARCHAR(255),
    tel VARCHAR(20),
    nasc DATE,
    municipio VARCHAR(100),
    bairro VARCHAR(100),
    apoiador VARCHAR(255),
    eleitores INT DEFAULT 0,
    participantes INT DEFAULT 0,
    votos INT DEFAULT 0,
    pet VARCHAR(10),
    tipo_pet VARCHAR(50),
    criancas INT DEFAULT 0,
    solicit TEXT,
    realizada VARCHAR(10) DEFAULT 'nao',
    lider VARCHAR(255),
    interesse VARCHAR(100),
    leader_id CHAR(36),
    nivel_engajamento VARCHAR(50),
    observacoes_qualitativas TEXT,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    gps_coords VARCHAR(100),
    duracao_segundos INT,
    hora TIME,
    INDEX idx_visits_campaign (campaign_id)
);

-- 5. Tabela de Relatos de Rua
DROP TABLE IF EXISTS street_reports;
CREATE TABLE IF NOT EXISTS street_reports (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    bairro VARCHAR(100),
    clima VARCHAR(50),
    reclamacao TEXT,
    observacoes TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendente',
    photo_url TEXT,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reports_campaign (campaign_id)
);

-- 6. Inteligência da Sala de Guerra (War Room)
DROP TABLE IF EXISTS war_room_intelligence;
CREATE TABLE IF NOT EXISTS war_room_intelligence (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    source_agent VARCHAR(100),
    target_agent VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'Media',
    category VARCHAR(100),
    insight_text TEXT NOT NULL,
    metadata JSON,
    action_taken BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_war_campaign (campaign_id)
);

-- 7. Tokens de Mídia Social
DROP TABLE IF EXISTS social_tokens;
CREATE TABLE IF NOT EXISTS social_tokens (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, provider)
);

-- 8. Configurações de Campanha
DROP TABLE IF EXISTS campaign_configs;
CREATE TABLE IF NOT EXISTS campaign_configs (
    id CHAR(36) PRIMARY KEY,
    features JSON,
    limits JSON,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 9. Configurações Gerais
DROP TABLE IF EXISTS settings;
CREATE TABLE IF NOT EXISTS settings (
    id CHAR(36) PRIMARY KEY,
    campaign_name VARCHAR(255),
    timezone VARCHAR(100) DEFAULT 'America/Sao_Paulo',
    ai_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 10. Financeiro: Receitas
DROP TABLE IF EXISTS incomes;
CREATE TABLE IF NOT EXISTS incomes (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    data DATE,
    valor DECIMAL(15,2),
    descricao TEXT,
    categoria VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 11. Ações de Engajamento
DROP TABLE IF EXISTS engagement_actions;
CREATE TABLE IF NOT EXISTS engagement_actions (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    data DATE,
    tipo VARCHAR(100),
    detalhes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 12. Cenários Eleitorais
DROP TABLE IF EXISTS scenarios;
CREATE TABLE IF NOT EXISTS scenarios (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    nome VARCHAR(255),
    dados JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 13. Configurações da Calculadora
DROP TABLE IF EXISTS calculator_settings;
CREATE TABLE IF NOT EXISTS calculator_settings (
    id CHAR(36) PRIMARY KEY,
    meta_votos INT DEFAULT 0,
    quorum INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Locais de Votação
DROP TABLE IF EXISTS locations;
CREATE TABLE IF NOT EXISTS locations (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    name VARCHAR(255),
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 15. Auditoria de Fraude
DROP TABLE IF EXISTS fraud_audit_logs;
CREATE TABLE IF NOT EXISTS fraud_audit_logs (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 16. Jornada do Eleitor
DROP TABLE IF EXISTS voter_journey;
CREATE TABLE IF NOT EXISTS voter_journey (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    voter_id CHAR(36),
    contact_id CHAR(36),
    step VARCHAR(100),
    current_stage VARCHAR(100),
    previous_stage VARCHAR(100),
    next_best_action TEXT,
    next_action_reason TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 17. Pesquisas
DROP TABLE IF EXISTS pesquisas;
CREATE TABLE IF NOT EXISTS pesquisas (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    title VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 18. Financeiro: Despesas
DROP TABLE IF EXISTS expenses;
CREATE TABLE IF NOT EXISTS expenses (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    data DATE,
    valor DECIMAL(15,2),
    descricao TEXT,
    categoria VARCHAR(100),
    fornecedor VARCHAR(255),
    documento_fornecedor VARCHAR(50),
    nota_fiscal_url TEXT,
    status_documento VARCHAR(50),
    tipo_documento VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 19. Contatos / Eleitores
DROP TABLE IF EXISTS contacts;
CREATE TABLE IF NOT EXISTS contacts (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    voter_journey VARCHAR(100),
    municipio VARCHAR(100),
    bairro VARCHAR(100),
    observacoes TEXT,
    nascimento DATE,
    birth_date DATE,
    data_nascimento DATE,
    interesse VARCHAR(100),
    classification VARCHAR(100),
    neighborhood VARCHAR(100),
    electoral_zone VARCHAR(50),
    electoral_section VARCHAR(50),
    criancas INT DEFAULT 0,
    tem_pet BOOLEAN DEFAULT FALSE,
    last_interaction_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 20. Saídas dos Agentes de IA
DROP TABLE IF EXISTS agent_outputs;
CREATE TABLE IF NOT EXISTS agent_outputs (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    agent_id VARCHAR(100),
    agent_type VARCHAR(100),
    output_type VARCHAR(100),
    content LONGTEXT,
    metadata JSON,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 21. Histórico de Chat com Agentes
DROP TABLE IF EXISTS agent_chat_history;
CREATE TABLE IF NOT EXISTS agent_chat_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    campaign_id CHAR(36),
    agent_id VARCHAR(100),
    role ENUM('user', 'assistant', 'system', 'agent'),
    content LONGTEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 22. Ordens de Produção
DROP TABLE IF EXISTS production_orders;
CREATE TABLE IF NOT EXISTS production_orders (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    origin_agent VARCHAR(100),
    target_agent VARCHAR(100),
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 23. Boletins de Urna (Dia D)
DROP TABLE IF EXISTS boletins_urna;
CREATE TABLE IF NOT EXISTS boletins_urna (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    zona VARCHAR(50),
    secao VARCHAR(50),
    local_votacao VARCHAR(255),
    votos_candidato INT DEFAULT 0,
    votos_totais INT DEFAULT 0,
    foto_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 24. Incidentes Eleitorais (Dia D)
DROP TABLE IF EXISTS election_incidents;
CREATE TABLE IF NOT EXISTS election_incidents (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    tipo VARCHAR(100),
    descricao TEXT,
    localizacao VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (campaign_id)
);

-- 25. Backups da Campanha
DROP TABLE IF EXISTS backups;
CREATE TABLE IF NOT EXISTS backups (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36),
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    size_kb INT DEFAULT 0,
    data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_backups_campaign (campaign_id)
);

-- DADOS INICIAIS (SEED)
INSERT IGNORE INTO campaign_configs (id, status, features, limits) 
VALUES ('455d21f3-f254-4b96-b49c-e70192c3fe27', 'active', '{}', '{}');

INSERT IGNORE INTO settings (id, campaign_name) 
VALUES ('455d21f3-f254-4b96-b49c-e70192c3fe27', 'Campanha Demonstrativa');

INSERT IGNORE INTO users (id, email, name, type, campaign_id, role) 
VALUES ('75341594-5f1d-4064-9f41-2b1a7613fe48', 'eldastito@teste.com', 'Admin Local', 'Admin', '455d21f3-f254-4b96-b49c-e70192c3fe27', 'user');

SET FOREIGN_KEY_CHECKS = 1;

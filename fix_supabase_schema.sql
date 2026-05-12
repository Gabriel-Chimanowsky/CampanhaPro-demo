-- SQL para corrigir o esquema do Supabase para o CampanhaPro
-- Execute este comando no SQL Editor do seu Dashboard do Supabase.

-- 1. Adicionar colunas faltantes na tabela street_reports
ALTER TABLE street_reports 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Garantir que as políticas de RLS permitam inserção na tabela de dados
-- (Caso não tenha sido configurado via dashboard)
-- ALTER TABLE street_reports ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir inserção para todos" ON street_reports FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Permitir leitura para todos" ON street_reports FOR SELECT USING (true);

-- 3. Configurar Políticas de Storage para o bucket 'street-reports'
-- Estas políticas são essenciais para evitar o erro "new row violates row-level security policy" no upload.

-- Liberar leitura pública para os arquivos
CREATE POLICY "Leitura Pública de Street Reports" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'street-reports');

-- Permitir que usuários autenticados façam upload
CREATE POLICY "Upload Autenticado de Street Reports" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'street-reports');

-- Opcional: Permitir que o dono delete seu arquivo (ou todos deletarem se for teste)
CREATE POLICY "Deleção de Street Reports" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'street-reports');

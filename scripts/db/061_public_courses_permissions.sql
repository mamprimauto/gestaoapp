-- ============================================
-- ATUALIZAR PERMISSÕES PARA CRIAÇÃO PÚBLICA
-- Permite que qualquer pessoa adicione cursos e aulas
-- Apenas admins podem deletar
-- ============================================

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "courses_insert_admin" ON courses;
DROP POLICY IF EXISTS "courses_update_admin" ON courses;
DROP POLICY IF EXISTS "courses_delete_admin" ON courses;

DROP POLICY IF EXISTS "lessons_insert_admin" ON lessons;
DROP POLICY IF EXISTS "lessons_update_admin" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_admin" ON lessons;

-- 2. Criar novas políticas para COURSES

-- Qualquer pessoa pode inserir cursos (público)
CREATE POLICY "courses_insert_public" ON courses
  FOR INSERT WITH CHECK (true);

-- Qualquer pessoa pode atualizar cursos (público)
CREATE POLICY "courses_update_public" ON courses
  FOR UPDATE USING (true);

-- Apenas admins podem deletar cursos
CREATE POLICY "courses_delete_admin_only" ON courses
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin' AND approved = true
    )
  );

-- 3. Criar novas políticas para LESSONS

-- Qualquer pessoa pode inserir aulas (público)
CREATE POLICY "lessons_insert_public" ON lessons
  FOR INSERT WITH CHECK (true);

-- Qualquer pessoa pode atualizar aulas (público)
CREATE POLICY "lessons_update_public" ON lessons
  FOR UPDATE USING (true);

-- Apenas admins podem deletar aulas
CREATE POLICY "lessons_delete_admin_only" ON lessons
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin' AND approved = true
    )
  );

-- 4. Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE '✅ Permissões atualizadas com sucesso!';
  RAISE NOTICE '📝 Qualquer pessoa pode criar e editar cursos/aulas';
  RAISE NOTICE '🔒 Apenas admins podem excluir';
  RAISE NOTICE '🚀 Sistema pronto para uso público!';
END $$;
-- ============================================
-- PERMITIR EXCLUSÃO PÚBLICA DE CURSOS E AULAS
-- ATENÇÃO: Isso permite que QUALQUER pessoa delete cursos e aulas
-- Use com cuidado em produção!
-- ============================================

-- 1. Remover políticas antigas de DELETE
DROP POLICY IF EXISTS "admin_delete_courses" ON courses;
DROP POLICY IF EXISTS "admin_delete_lessons" ON lessons;

-- 2. Criar novas políticas permitindo DELETE público

-- Permitir que qualquer pessoa delete cursos
CREATE POLICY "allow_public_delete_courses" ON courses
  FOR DELETE USING (true);

-- Permitir que qualquer pessoa delete aulas  
CREATE POLICY "allow_public_delete_lessons" ON lessons
  FOR DELETE USING (true);

-- 3. Verificação
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE '⚠️  AVISO: EXCLUSÃO PÚBLICA ATIVADA!';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Permissões atuais:';
  RAISE NOTICE '   - QUALQUER pessoa pode EXCLUIR cursos';
  RAISE NOTICE '   - QUALQUER pessoa pode EXCLUIR aulas';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  CUIDADO: Isso é perigoso em produção!';
  RAISE NOTICE '   Considere restringir novamente no futuro.';
  RAISE NOTICE '====================================';
END $$;
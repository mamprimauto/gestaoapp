-- ============================================
-- CORREÇÃO COMPLETA DE POLÍTICAS RLS
-- Este script corrige TODAS as políticas para permitir uso público
-- ============================================

-- 1. Desabilitar RLS temporariamente para limpar
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "courses_select_all" ON courses;
DROP POLICY IF EXISTS "courses_insert_admin" ON courses;
DROP POLICY IF EXISTS "courses_update_admin" ON courses;
DROP POLICY IF EXISTS "courses_delete_admin" ON courses;
DROP POLICY IF EXISTS "courses_insert_public" ON courses;
DROP POLICY IF EXISTS "courses_update_public" ON courses;
DROP POLICY IF EXISTS "courses_delete_admin_only" ON courses;

DROP POLICY IF EXISTS "lessons_select_all" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_admin" ON lessons;
DROP POLICY IF EXISTS "lessons_update_admin" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_admin" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_public" ON lessons;
DROP POLICY IF EXISTS "lessons_update_public" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_admin_only" ON lessons;

DROP POLICY IF EXISTS "progress_select_own" ON lesson_progress;
DROP POLICY IF EXISTS "progress_insert_own" ON lesson_progress;
DROP POLICY IF EXISTS "progress_update_own" ON lesson_progress;

-- 3. Reabilitar RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas SIMPLES e PERMISSIVAS para COURSES

-- Todos podem ver cursos
CREATE POLICY "allow_view_courses" ON courses
  FOR SELECT USING (true);

-- Todos podem criar cursos
CREATE POLICY "allow_create_courses" ON courses
  FOR INSERT WITH CHECK (true);

-- Todos podem editar cursos
CREATE POLICY "allow_update_courses" ON courses
  FOR UPDATE USING (true) WITH CHECK (true);

-- Apenas admins podem deletar
CREATE POLICY "admin_delete_courses" ON courses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. Criar políticas SIMPLES e PERMISSIVAS para LESSONS

-- Todos podem ver aulas
CREATE POLICY "allow_view_lessons" ON lessons
  FOR SELECT USING (true);

-- Todos podem criar aulas
CREATE POLICY "allow_create_lessons" ON lessons
  FOR INSERT WITH CHECK (true);

-- Todos podem editar aulas
CREATE POLICY "allow_update_lessons" ON lessons
  FOR UPDATE USING (true) WITH CHECK (true);

-- Apenas admins podem deletar
CREATE POLICY "admin_delete_lessons" ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 6. Políticas para LESSON_PROGRESS (mantém privado por usuário)

-- Usuários veem apenas seu próprio progresso
CREATE POLICY "users_view_own_progress" ON lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem criar seu próprio progresso
CREATE POLICY "users_create_own_progress" ON lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seu próprio progresso
CREATE POLICY "users_update_own_progress" ON lesson_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Garantir que a coluna created_by possa ser NULL
ALTER TABLE courses ALTER COLUMN created_by DROP NOT NULL;

-- 8. Adicionar curso de teste
INSERT INTO courses (
  title,
  description,
  thumbnail_url,
  instructor,
  category,
  duration_minutes,
  is_published,
  order_index
) VALUES (
  'Curso de Teste - Criação Pública',
  'Este curso foi criado para testar o sistema público',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
  'Sistema',
  'Marketing Digital',
  30,
  true,
  999
) ON CONFLICT DO NOTHING;

-- 9. Verificação final
DO $$
DECLARE
  course_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO course_count FROM courses;
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename IN ('courses', 'lessons', 'lesson_progress');
  
  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ POLÍTICAS CORRIGIDAS COM SUCESSO!';
  RAISE NOTICE '======================================';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   - Total de cursos: %', course_count;
  RAISE NOTICE '   - Total de políticas: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Permissões:';
  RAISE NOTICE '   - Qualquer pessoa pode VER cursos e aulas';
  RAISE NOTICE '   - Qualquer pessoa pode CRIAR cursos e aulas';
  RAISE NOTICE '   - Qualquer pessoa pode EDITAR cursos e aulas';
  RAISE NOTICE '   - Apenas ADMINS podem EXCLUIR';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Sistema pronto para uso público!';
  RAISE NOTICE '======================================';
END $$;
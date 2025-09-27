-- ============================================
-- SCRIPT DE CORREÇÃO - Sistema de Cursos
-- Remove políticas e tabelas existentes e recria tudo
-- ============================================

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS "courses_select_all" ON courses;
DROP POLICY IF EXISTS "courses_insert_admin" ON courses;
DROP POLICY IF EXISTS "courses_update_admin" ON courses;
DROP POLICY IF EXISTS "courses_delete_admin" ON courses;

DROP POLICY IF EXISTS "lessons_select_all" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_admin" ON lessons;
DROP POLICY IF EXISTS "lessons_update_admin" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_admin" ON lessons;

DROP POLICY IF EXISTS "progress_select_own" ON lesson_progress;
DROP POLICY IF EXISTS "progress_insert_own" ON lesson_progress;
DROP POLICY IF EXISTS "progress_update_own" ON lesson_progress;

-- 2. Remover tabelas existentes (na ordem correta por causa das foreign keys)
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- 3. Criar tabela de cursos
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  instructor TEXT,
  category TEXT,
  duration_minutes INTEGER,
  vimeo_folder_id TEXT,
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Criar tabela de aulas/lições
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  vimeo_id TEXT NOT NULL,
  duration_seconds INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Criar tabela de progresso das aulas
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed BOOLEAN DEFAULT false,
  last_position_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- 6. Habilitar RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- 7. Políticas para courses
CREATE POLICY "courses_select_all" ON courses
  FOR SELECT USING (
    is_published = true OR 
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "courses_insert_admin" ON courses
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "courses_update_admin" ON courses
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "courses_delete_admin" ON courses
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- 8. Políticas para lessons
CREATE POLICY "lessons_select_all" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lessons.course_id 
      AND (courses.is_published = true OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
      ))
    )
  );

CREATE POLICY "lessons_insert_admin" ON lessons
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "lessons_update_admin" ON lessons
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "lessons_delete_admin" ON lessons
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- 9. Políticas para lesson_progress
CREATE POLICY "progress_select_own" ON lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "progress_insert_own" ON lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress_update_own" ON lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- 10. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(order_index);
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_course ON lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);

-- 11. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 12. Função para calcular progresso do curso
CREATE OR REPLACE FUNCTION get_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_lessons
  FROM lessons
  WHERE course_id = p_course_id;
  
  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress
  WHERE user_id = p_user_id 
    AND course_id = p_course_id 
    AND completed = true;
  
  IF total_lessons = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((completed_lessons::NUMERIC / total_lessons) * 100);
END;
$$ LANGUAGE plpgsql;

-- 13. Adicionar um curso de exemplo (opcional)
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
  'Curso de Introdução ao Marketing Digital',
  'Aprenda os fundamentos do marketing digital e como aplicá-los no seu negócio',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  'Equipe Gestão App',
  'Marketing Digital',
  120,
  true,
  1
) ON CONFLICT DO NOTHING;

-- Adicionar aulas de exemplo ao curso (se foi criado)
DO $$
DECLARE
  course_uuid UUID;
BEGIN
  SELECT id INTO course_uuid FROM courses WHERE title = 'Curso de Introdução ao Marketing Digital' LIMIT 1;
  
  IF course_uuid IS NOT NULL THEN
    INSERT INTO lessons (course_id, title, description, vimeo_id, duration_seconds, order_index) VALUES
    (course_uuid, 'Aula 1: Introdução', 'Conceitos básicos de marketing digital', '123456789', 600, 1),
    (course_uuid, 'Aula 2: Estratégias', 'Principais estratégias de marketing', '123456790', 900, 2),
    (course_uuid, 'Aula 3: Ferramentas', 'Ferramentas essenciais', '123456791', 750, 3)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 14. Confirmação
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de cursos configurado com sucesso!';
  RAISE NOTICE '📚 Tabelas criadas: courses, lessons, lesson_progress';
  RAISE NOTICE '🔒 Políticas RLS configuradas';
  RAISE NOTICE '⚡ Índices e triggers criados';
  RAISE NOTICE '🎯 Curso de exemplo adicionado (se não existia)';
END $$;
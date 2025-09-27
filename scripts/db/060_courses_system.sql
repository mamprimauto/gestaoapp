-- Sistema de Cursos com Vimeo e Tracking de Progresso

-- Tabela de cursos
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

-- Tabela de aulas/lições
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  vimeo_id TEXT NOT NULL, -- ID do vídeo no Vimeo
  duration_seconds INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de progresso das aulas
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_position_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- RLS (Row Level Security) - Sistema interno, políticas permissivas
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- Políticas para courses (todos podem ver, admins podem editar)
CREATE POLICY "courses_select_all" ON courses
  FOR SELECT USING (true);

CREATE POLICY "courses_insert_admin" ON courses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "courses_update_admin" ON courses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "courses_delete_admin" ON courses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas para lessons (todos podem ver, admins podem editar)
CREATE POLICY "lessons_select_all" ON lessons
  FOR SELECT USING (true);

CREATE POLICY "lessons_insert_admin" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "lessons_update_admin" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "lessons_delete_admin" ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas para lesson_progress (usuários podem ver e atualizar seu próprio progresso)
CREATE POLICY "lesson_progress_select_own" ON lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lesson_progress_insert_own" ON lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lesson_progress_update_own" ON lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "lesson_progress_delete_own" ON lesson_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Função para calcular progresso total do curso
CREATE OR REPLACE FUNCTION calculate_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  progress_percentage INTEGER;
BEGIN
  -- Total de aulas no curso
  SELECT COUNT(*) INTO total_lessons
  FROM lessons
  WHERE course_id = p_course_id;
  
  IF total_lessons = 0 THEN
    RETURN 0;
  END IF;
  
  -- Aulas completadas pelo usuário
  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress
  WHERE user_id = p_user_id 
    AND course_id = p_course_id 
    AND completed = true;
  
  -- Calcular percentual
  progress_percentage := (completed_lessons * 100) / total_lessons;
  
  RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para marcar como completo quando progresso >= 90%
CREATE OR REPLACE FUNCTION check_lesson_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.progress_percentage >= 90 AND NEW.completed = false THEN
    NEW.completed = true;
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_complete_lesson
  BEFORE INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION check_lesson_completion();
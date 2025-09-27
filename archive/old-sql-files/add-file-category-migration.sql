-- Adiciona campo file_category se não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_files' 
    AND column_name = 'file_category'
  ) THEN
    ALTER TABLE public.task_files ADD COLUMN file_category text DEFAULT 'general';
    CREATE INDEX IF NOT EXISTS task_files_category_idx ON public.task_files(task_id, file_category);
    RAISE NOTICE 'file_category column added to task_files table';
  ELSE
    RAISE NOTICE 'file_category column already exists';
  END IF;
END $$;
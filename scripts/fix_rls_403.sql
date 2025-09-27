-- Script para corrigir erros 403 após consolidação de organizações
-- Os erros acontecem porque as políticas RLS das tabelas relacionadas 
-- ainda referenciam organizações antigas

-- 1. Primeiro, vamos verificar quais task_time_sessions e task_comments 
-- estão gerando os erros 403

-- Verificar se task_time_sessions têm tasks com organization_id correto
SELECT 
  'task_time_sessions órfãs' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN t.organization_id IS NULL THEN 1 END) as tasks_sem_org
FROM public.task_time_sessions tts
LEFT JOIN public.tasks t ON tts.task_id = t.id;

-- Verificar se task_comments têm tasks com organization_id correto  
SELECT 
  'task_comments órfãs' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN t.organization_id IS NULL THEN 1 END) as tasks_sem_org
FROM public.task_comments tc
LEFT JOIN public.tasks t ON tc.task_id = t.id;

-- 2. Verificar políticas RLS atuais das tabelas problemáticas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('task_time_sessions', 'task_comments', 'task_files')
ORDER BY tablename, policyname;

-- 3. Se houver dados órfãos, vamos removê-los ou corrigi-los
-- (Execute apenas se necessário)

-- Remover sessões de tempo de tasks que não existem mais
DELETE FROM public.task_time_sessions 
WHERE task_id NOT IN (SELECT id FROM public.tasks);

-- Remover comentários de tasks que não existem mais
DELETE FROM public.task_comments 
WHERE task_id NOT IN (SELECT id FROM public.tasks);

-- Remover arquivos de tasks que não existem mais  
DELETE FROM public.task_files 
WHERE task_id NOT IN (SELECT id FROM public.tasks);

-- 4. Verificação final - deve mostrar 0 órfãos
SELECT 
  'Verificação Final' as status,
  (SELECT COUNT(*) FROM public.task_time_sessions tts 
   LEFT JOIN public.tasks t ON tts.task_id = t.id 
   WHERE t.id IS NULL) as time_sessions_orfas,
  (SELECT COUNT(*) FROM public.task_comments tc 
   LEFT JOIN public.tasks t ON tc.task_id = t.id 
   WHERE t.id IS NULL) as comments_orfaos,
  (SELECT COUNT(*) FROM public.task_files tf 
   LEFT JOIN public.tasks t ON tf.task_id = t.id 
   WHERE t.id IS NULL) as files_orfaos;
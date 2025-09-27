-- Corrigir políticas RLS para uploads de arquivos de comentários
-- Problema: "new row violates row-level security policy" em uploads

-- Remover todas as políticas existentes do bucket task-files
drop policy if exists "task_files_all_authenticated" on storage.objects;
drop policy if exists "task_files_public_read" on storage.objects;
drop policy if exists "Users can upload task files" on storage.objects;
drop policy if exists "Anyone can view task files" on storage.objects;
drop policy if exists "Users can update own task files" on storage.objects;
drop policy if exists "Users can delete own task files" on storage.objects;

-- Garantir que o bucket existe e é público
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', true)
on conflict (id) do update set public = true;

-- Política ampla para uploads: usuários autenticados podem fazer tudo
create policy "task_files_authenticated_all"
on storage.objects for all 
to authenticated
using (bucket_id = 'task-files')
with check (bucket_id = 'task-files');

-- Política para leitura pública
create policy "task_files_public_select"
on storage.objects for select
to public
using (bucket_id = 'task-files');

-- Verificar se RLS está habilitado
select 
  schemaname, 
  tablename, 
  rowsecurity 
from pg_tables 
where schemaname = 'storage' and tablename = 'objects';

-- Habilitar RLS se não estiver
alter table storage.objects enable row level security;
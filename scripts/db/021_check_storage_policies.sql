-- Verificar e corrigir políticas do bucket task-files
-- Primeiro, vamos garantir que o bucket existe
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', true)
on conflict (id) do update set public = true;

-- Remover políticas existentes que podem estar causando conflito
drop policy if exists "Users can upload task files" on storage.objects;
drop policy if exists "Anyone can view task files" on storage.objects;
drop policy if exists "Users can update own task files" on storage.objects;
drop policy if exists "Users can delete own task files" on storage.objects;

-- Política simples: usuários autenticados podem fazer qualquer operação nos arquivos
create policy "task_files_all_authenticated"
on storage.objects for all 
to authenticated
using (bucket_id = 'task-files')
with check (bucket_id = 'task-files' and auth.uid() is not null);

-- Política para visualização pública (se necessário)
create policy "task_files_public_read"
on storage.objects for select
to public
using (bucket_id = 'task-files');
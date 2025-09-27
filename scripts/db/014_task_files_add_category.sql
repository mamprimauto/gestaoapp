-- Adiciona campo file_category para categorizar arquivos de criativos
alter table public.task_files 
add column if not exists file_category text default 'general';

-- Cria índice para otimizar queries por categoria
create index if not exists task_files_category_idx on public.task_files(task_id, file_category);

-- Comentário para documentar o uso
comment on column public.task_files.file_category is 'Categoria do arquivo: general (padrão), avatar (imagens de perfil/avatar), inspiration (imagens de inspiração), entregavel (arquivos finais prontos para entrega)';
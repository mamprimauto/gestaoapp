-- Adicionar suporte a imagens nos comentários
alter table public.task_comments 
add column if not exists image_url text;

-- Comentário na coluna para documentação
comment on column public.task_comments.image_url is 'URL da imagem anexada ao comentário (opcional)';

-- Índice para performance em consultas com imagens
create index if not exists task_comments_image_url_idx on public.task_comments(image_url) 
where image_url is not null;
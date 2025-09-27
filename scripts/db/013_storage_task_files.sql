-- Cria bucket privado 'task-files' para anexos de tarefas
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'task-files') then
    insert into storage.buckets (id, name, public) values ('task-files', 'task-files', false);
  end if;
end $$;

-- Não criamos policies abertas: o acesso será via URLs assinadas emitidas pelo backend.
-- (Service Role ignora policies de storage)

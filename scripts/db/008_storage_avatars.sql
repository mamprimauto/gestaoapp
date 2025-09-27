-- Cria bucket 'avatars' e políticas de Storage sem usar storage.create_bucket()

-- 1) Cria bucket se não existir
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'avatars') then
    insert into storage.buckets (id, name, public)
    values ('avatars', 'avatars', true);
  end if;
end $$;

-- 2) Políticas no storage.objects para o bucket 'avatars'

-- Leitura pública (qualquer um pode ler)
drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
on storage.objects for select
using (bucket_id = 'avatars');

-- Upload: somente usuários autenticados podem inserir no bucket
drop policy if exists "avatars_insert_authenticated" on storage.objects;
create policy "avatars_insert_authenticated"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Atualização: apenas o dono do objeto pode atualizar
drop policy if exists "avatars_update_owner" on storage.objects;
create policy "avatars_update_owner"
on storage.objects for update
using (bucket_id = 'avatars' and owner = auth.uid());

-- Exclusão: apenas o dono do objeto pode deletar
drop policy if exists "avatars_delete_owner" on storage.objects;
create policy "avatars_delete_owner"
on storage.objects for delete
using (bucket_id = 'avatars' and owner = auth.uid());

-- Corrigir política RLS de profiles para garantir acesso a usuários autenticados
-- Problema: profiles_select_same_org impede acesso quando organizações não estão configuradas

-- Remover política problemática
drop policy if exists "profiles_select_same_org" on public.profiles;

-- Recriar política que funciona em todos os cenários
-- Prioridade: same org > authenticated fallback
create policy "profiles_select_all_authenticated"
on public.profiles for select
using (
  -- Sempre permitir ver próprio profile
  auth.uid() = id
  or
  -- Se usuário tem organização, ver apenas membros da mesma organização
  (
    exists (
      select 1 from public.organization_members om_self
      where om_self.user_id = auth.uid()
    )
    and exists (
      select 1 from public.organization_members om1
      inner join public.organization_members om2 on om1.organization_id = om2.organization_id
      where om1.user_id = auth.uid() 
      and om2.user_id = profiles.id
    )
  )
  or
  -- FALLBACK: Se usuário não tem organização, ver todos os profiles autenticados
  (
    not exists (
      select 1 from public.organization_members om_self
      where om_self.user_id = auth.uid()
    )
    and auth.role() = 'authenticated'
  )
);

-- Comentário explicativo
comment on policy "profiles_select_all_authenticated" on public.profiles is 
'Permite ver profiles com prioridade organizacional mas fallback para todos os autenticados se não há organização';
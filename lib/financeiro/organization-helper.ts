import type { SupabaseClient } from "@supabase/supabase-js"

interface OrganizationResult {
  organizationId: string | null
  error?: string
}

export async function ensureUserHasOrganization(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string
): Promise<OrganizationResult> {
  try {
    // Primeiro, verifica se o usuário já tem uma organização
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single()

    if (orgMember) {
      return { organizationId: orgMember.organization_id }
    }

    // Se não tem organização, cria uma automaticamente

    // Gera slug único baseado no ID do usuário ou email
    const baseSlug = userEmail 
      ? userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      : 'user'
    const uniqueSlug = `${baseSlug}-${userId.slice(0, 8)}`

    // Cria a organização
    const { data: newOrg, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: "Minha Organização",
        slug: uniqueSlug,
        created_by: userId,
        description: "Organização criada automaticamente"
      })
      .select()
      .single()

    if (orgError) {

      // Se o erro é por slug duplicado, isso significa que a organização já existe
      // mas o usuário não está como membro (situação estranha, mas vamos corrigir)
      if (orgError.code === '23505' && orgError.message.includes('slug')) {

        // Buscar a organização existente pelo slug
        const { data: existingOrg, error: findError } = await supabase
          .from("organizations")
          .select("id, created_by")
          .eq("slug", uniqueSlug)
          .single()
        
        if (findError || !existingOrg) {
          return { organizationId: null, error: "Failed to find existing organization" }
        }
        
        // Adicionar o usuário como membro da organização existente
        // (se for o mesmo usuário que criou, como admin, senão como member)
        const role = existingOrg.created_by === userId ? 'admin' : 'member'
        
        const { error: memberError } = await supabase
          .from("organization_members")
          .upsert({
            organization_id: existingOrg.id,
            user_id: userId,
            role: role
          }, {
            onConflict: 'organization_id,user_id',
            ignoreDuplicates: false
          })
        
        if (memberError) {

          return { organizationId: null, error: "Failed to join existing organization" }
        }

        return { organizationId: existingOrg.id }
      }
      
      return { organizationId: null, error: "Failed to create organization" }
    }

    // Adiciona o usuário como admin da organização
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: newOrg.id,
        user_id: userId,
        role: "admin"
      })

    if (memberError) {

      // Tenta remover a organização criada se falhar ao adicionar o usuário
      await supabase
        .from("organizations")
        .delete()
        .eq("id", newOrg.id)
      
      return { organizationId: null, error: "Failed to add user to organization" }
    }

    return { organizationId: newOrg.id }

  } catch (error) {

    return { organizationId: null, error: "Unexpected error occurred" }
  }
}

export async function getUserOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single()

  return orgMember?.organization_id || null
}